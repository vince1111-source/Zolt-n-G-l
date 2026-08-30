-- ============================================================================
-- CÉGEM.AI — a sarkalatos szabályok bizonyítása
--
-- Nem az a kérdés, hogy a felület betartja-e a szabályokat, hanem hogy az
-- adatbázis kikényszeríti-e őket. Ez a fájl ezt méri, közvetlen SQL-lel,
-- megkerülve minden alkalmazáslogikát.
--
-- Futtatás:  db/futtat.sh   (vagy psql -v ON_ERROR_STOP=1 -f ezt a fájlt)
-- ============================================================================

\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ------------------------------------------------------------- segédfüggvény

create or replace function teszt_hibat_var(parancs text, leiras text) returns void
language plpgsql as $$
begin
  begin
    execute parancs;
  exception when others then
    raise notice '  ok    % — elutasítva: %', leiras, left(sqlerrm, 90);
    return;
  end;
  raise exception 'BUKOTT: % — a parancs lefutott, pedig hibát vártunk', leiras;
end $$;

create or replace function teszt_sikert_var(parancs text, leiras text) returns void
language plpgsql as $$
begin
  execute parancs;
  raise notice '  ok    %', leiras;
exception when others then
  raise exception 'BUKOTT: % — hibára futott: %', leiras, sqlerrm;
end $$;

create or replace function teszt_egyenlo(kapott anyelement, vart anyelement, leiras text) returns void
language plpgsql as $$
begin
  if kapott is not distinct from vart then
    raise notice '  ok    % (%)', leiras, kapott;
  else
    raise exception 'BUKOTT: % — várt: %, kapott: %', leiras, vart, kapott;
  end if;
end $$;

-- ------------------------------------------------------------ minta két cég
--
-- A teszt tranzakcióban fut és a végén visszagörget, így nem hagy nyomot,
-- és a mintaadat mellett is futtatható.

begin;

insert into cegek (id, nev) values
  ('f0000000-0000-0000-0000-0000000000a1', 'Kőháló Kft.'),
  ('f0000000-0000-0000-0000-0000000000b2', 'Rivális Kft.');

insert into felhasznalok (id, ceg_id, nev, email) values
  ('f1000000-0000-0000-0000-0000000000a1', 'f0000000-0000-0000-0000-0000000000a1', 'Vince', 'vince@kohalo.hu'),
  ('f1000000-0000-0000-0000-0000000000b2', 'f0000000-0000-0000-0000-0000000000b2', 'Rivális Ügyintéző', 'admin@rivalis.hu');

insert into partnerek (id, ceg_id, nev) values
  ('f2000000-0000-0000-0000-0000000000a1', 'f0000000-0000-0000-0000-0000000000a1', 'Kovács Építő Kft.'),
  ('f2000000-0000-0000-0000-0000000000b2', 'f0000000-0000-0000-0000-0000000000b2', 'Rivális partnere');

-- A tesztek az alkalmazás szerepével futnak, nem szuperfelhasználóval —
-- különben a sorszintű biztonság meg sem szólalna.
grant cegem_app to current_user;

\echo ''
\echo '=== 1. Multi-tenant izoláció (3.3 szabály) ==='

set role cegem_app;
set app.ceg_id = 'f0000000-0000-0000-0000-0000000000a1';

do $$
declare db int;
begin
  select count(*) into db from partnerek;
  perform teszt_egyenlo(db, 1, 'a saját cég egy partnerét látja');

  select count(*) into db from partnerek where nev = 'Rivális partnere';
  perform teszt_egyenlo(db, 0, 'a másik cég partnerét NEM látja');

  select count(*) into db from felhasznalok;
  perform teszt_egyenlo(db, 1, 'csak a saját felhasználóit látja');

  -- Közvetlen SQL-lel, azonosító szerint sem érhető el.
  select count(*) into db from partnerek
    where id = 'f2000000-0000-0000-0000-0000000000b2';
  perform teszt_egyenlo(db, 0, 'azonosító szerinti közvetlen lekérdezés sem hozza vissza');
end $$;

do $$
begin
  -- Idegen cég nevében beszúrni sem lehet.
  perform teszt_hibat_var(
    $q$insert into partnerek (ceg_id, nev)
       values ('f0000000-0000-0000-0000-0000000000b2', 'Becsempészett')$q$,
    'idegen cég nevében nem lehet beszúrni');

end $$;

do $$
declare erintett int;
begin
  -- Ami nem látszik, azt törölni sem lehet: a DELETE nulla sort érint.
  delete from partnerek where id = 'f2000000-0000-0000-0000-0000000000b2';
  get diagnostics erintett = row_count;
  perform teszt_egyenlo(erintett, 0, 'a másik cég sorát törölni sem tudja');
end $$;

-- Cégazonosító nélkül semmi nem látszik: az alapértelmezés a semmi, nem a minden.
reset role;
set role cegem_app;
set app.ceg_id = '';
do $$
declare db int;
begin
  select count(*) into db from partnerek;
  perform teszt_egyenlo(db, 0, 'cégazonosító nélkül semmi nem látszik');
end $$;

\echo ''
\echo '=== 2. A jóváhagyási kapu (3.1 szabály) ==='

set app.ceg_id = 'f0000000-0000-0000-0000-0000000000a1';

do $$
declare uj uuid;
begin
  -- a) Nem lehet eleve végrehajtottként létrehozni.
  perform teszt_hibat_var(
    $q$insert into javasolt_muveletek
         (tipus, hivatkozott_tabla, javaslat, allapot, jovahagyta_id, jovahagyva, vegrehajtva)
       values ('email', 'ajanlatok', '{}'::jsonb, 'vegrehajtott',
               'f1000000-0000-0000-0000-0000000000a1', now(), now())$q$,
    'végrehajtott állapotban nem hozható létre');

  -- b) Rendes létrehozás: javasolt.
  insert into javasolt_muveletek (id, tipus, hivatkozott_tabla, javaslat)
    values (gen_random_uuid(), 'ajanlat_kikuldes', 'ajanlatok',
            '{"partner":"Kovács Építő Kft.","brutto":12485922}'::jsonb)
    returning id into uj;
  raise notice '  ok    javasolt állapotban létrejön';

  -- c) A jóváhagyás átugrása tilos: javasolt → végrehajtott.
  perform teszt_hibat_var(
    format($q$update javasolt_muveletek
              set allapot = 'vegrehajtott', vegrehajtva = now(),
                  jovahagyta_id = 'f1000000-0000-0000-0000-0000000000a1', jovahagyva = now()
              where id = %L$q$, uj),
    'javasolt → végrehajtott átugrás TILOS');

  -- d) Jóváhagyás ember és időpont nélkül nem érvényes.
  perform teszt_hibat_var(
    format($q$update javasolt_muveletek set allapot = 'jovahagyott' where id = %L$q$, uj),
    'jóváhagyás nem lehet ember és időpont nélkül');

  -- e) A szabályos út végigmegy.
  perform teszt_sikert_var(
    format($q$update javasolt_muveletek
              set allapot = 'jovahagyott',
                  jovahagyta_id = 'f1000000-0000-0000-0000-0000000000a1',
                  jovahagyva = now()
              where id = %L$q$, uj),
    'javasolt → jóváhagyott, emberrel és időponttal');

  perform teszt_sikert_var(
    format($q$update javasolt_muveletek
              set allapot = 'vegrehajtott', vegrehajtva = now() where id = %L$q$, uj),
    'jóváhagyott → végrehajtott');

  -- f) A végrehajtott állapot végleges.
  perform teszt_hibat_var(
    format($q$update javasolt_muveletek set allapot = 'javasolt' where id = %L$q$, uj),
    'végrehajtottból nincs visszaút');
end $$;

do $$
declare uj uuid;
begin
  -- g) A kihagyás is szabályos ág — a felhasználó nemet mondhat.
  insert into javasolt_muveletek (id, tipus, hivatkozott_tabla, javaslat)
    values (gen_random_uuid(), 'emlekezteto', 'szamlak', '{}'::jsonb)
    returning id into uj;
  perform teszt_sikert_var(
    format($q$update javasolt_muveletek set allapot = 'kihagyott' where id = %L$q$, uj),
    'javasolt → kihagyott (a felhasználó most nem kéri)');
  perform teszt_hibat_var(
    format($q$update javasolt_muveletek
              set allapot = 'vegrehajtott', vegrehajtva = now(),
                  jovahagyta_id = 'f1000000-0000-0000-0000-0000000000a1', jovahagyva = now()
              where id = %L$q$, uj),
    'kihagyottból nem lehet végrehajtott');
end $$;

\echo ''
\echo '=== 3. Az AI napló változatlansága (3.2 szabály) ==='

do $$
declare uj uuid;
begin
  insert into ai_naplo (id, muvelet, reteg, modell, bemenet, kimenet, token_be, token_ki)
    values (gen_random_uuid(), 'Ajánlat készítése', 1, 'claude-haiku-4-5',
            '{"parancs":"készíts ajánlatot a Kovács Kft-nek 800 négyzetméterre"}'::jsonb,
            '{"partner":"kovacs","mennyiseg":800}'::jsonb, 712, 96)
    returning id into uj;
  raise notice '  ok    a napló bővíthető';

  perform teszt_hibat_var(
    format($q$update ai_naplo set kimenet = '{"hamis":true}'::jsonb where id = %L$q$, uj),
    'a napló bejegyzése NEM írható át');

  perform teszt_hibat_var(
    format($q$delete from ai_naplo where id = %L$q$, uj),
    'a napló bejegyzése NEM törölhető');
end $$;

\echo ''
\echo '=== 4. Forrásjelölés és árrés (5. szabály, 14. modul) ==='

do $$
declare ar numeric;
begin
  -- A számla forrása kötelező: mindig tudni kell, honnan van az adat.
  perform teszt_hibat_var(
    $q$insert into szamlak (irany, sorszam, brutto) values ('bejovo', 'X-1', 100)$q$,
    'számla nem rögzíthető forrásjelölés nélkül');

  perform teszt_sikert_var(
    $q$insert into szamlak (irany, sorszam, brutto, forras)
       values ('bejovo', 'BM-2026/0294', 486200, 'foto')$q$,
    'forrásjelöléssel rögzíthető');

  insert into termekek (nev, mertekegyseg, beszerzesi_ar, eladasi_ar, kategoria)
    values ('Térkő anyag, szürke 6 cm', 'm²', 2980, 3950, 'anyag');
  select arres_szazalek into ar from termek_arres where nev like 'Térkő anyag%';
  perform teszt_egyenlo(ar, 24.6::numeric, 'az árrés százaléka származtatott, nem tárolt');
end $$;

reset role;
rollback;

\echo ''
\echo '=== MINDEN SARKALATOS SZABÁLY BIZONYÍTVA ==='
\echo ''
