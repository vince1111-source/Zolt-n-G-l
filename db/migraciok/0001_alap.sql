-- ============================================================================
-- CÉGEM.AI — 0001 alap séma
--
-- Ez az ELSŐ migráció, és szándékosan tartalmazza a két sarkalatos szabályt,
-- mert utólag betolni azt jelenti, hogy addig minden kód megkerüli őket:
--
--   1. A jóváhagyási kapu az adatmodell része (javasolt_muveletek + trigger).
--      Nincs olyan út, amin külső hatású művelet jóváhagyás nélkül
--      végrehajtottá válhat.
--   2. Minden AI-művelet naplózott, és a napló nem írható át (ai_naplo).
--
--   3. Multi-tenant izoláció sorszintű biztonsággal, nem alkalmazáslogikában.
--
-- Futtatás:  psql -f db/migraciok/0001_alap.sql
-- Ellenőrzés: db/tesztek/ — lásd db/README.md
-- ============================================================================

-- ---------------------------------------------------------------- szerepkör
-- Supabase-en ez az `authenticated` szerep. Helyi futtatáshoz saját szerep kell,
-- mert a szuperfelhasználó megkerüli a sorszintű biztonságot.
do $$
begin
  if not exists (select from pg_roles where rolname = 'cegem_app') then
    create role cegem_app nologin;
  end if;
end $$;

-- ------------------------------------------------------------------ típusok

create type ajanlat_allapot as enum
  ('piszkozat', 'kikuldve', 'elfogadva', 'elutasitva', 'lejart');

create type szamla_irany as enum ('kimeno', 'bejovo');
create type szamla_allapot as enum ('nyitott', 'fizetve', 'sztornozott');
create type adat_forras as enum ('nav', 'foto', 'kezi', 'szamlazo_api');
create type feladat_allapot as enum ('nyitott', 'kesz', 'torolve');
create type termek_kategoria as enum ('munkadij', 'anyag', 'szolgaltatas');
create type felhasznalo_szerep as enum ('tulajdonos', 'munkatars');

-- A jóváhagyási kapu állapotgépe. Az átmeneteket trigger őrzi, lásd lentebb.
create type muvelet_allapot as enum
  ('javasolt', 'jovahagyott', 'vegrehajtott', 'kihagyott', 'elvetett');

create type muvelet_tipus as enum
  ('ajanlat_kikuldes', 'emlekezteto', 'email', 'utalasi_javaslat');

-- -------------------------------------------------------- aktuális cég (RLS)
--
-- Supabase-en a PostgREST beállítja a `request.jwt.claims` munkamenet-változót.
-- Helyi futtatásnál és háttérfolyamatnál az `app.ceg_id` beállítás használható.
-- Ha egyik sincs, a függvény NULL-t ad — és akkor a szabályok semmit nem
-- engednek látni. Ez a helyes alapértelmezés: inkább semmit, mint mindent.

create or replace function aktualis_ceg() returns uuid
language plpgsql stable
as $$
declare
  ertek text;
begin
  begin
    ertek := current_setting('request.jwt.claims', true)::json ->> 'ceg_id';
  exception when others then
    ertek := null;
  end;

  if ertek is null or ertek = '' then
    ertek := current_setting('app.ceg_id', true);
  end if;

  if ertek is null or ertek = '' then
    return null;
  end if;

  return ertek::uuid;
end $$;

-- ------------------------------------------------------------------ táblák

create table cegek (
  id            uuid primary key default gen_random_uuid(),
  nev           text not null,
  adoszam       text,
  cim           text,
  bankszamla    text,
  logo_url      text,
  email         text,
  telefon       text,
  letrehozva    timestamptz not null default now()
);

create table felhasznalok (
  id            uuid primary key default gen_random_uuid(),
  ceg_id        uuid not null references cegek(id) on delete cascade,
  nev           text not null,
  email         text not null,
  szerep        felhasznalo_szerep not null default 'munkatars',
  letrehozva    timestamptz not null default now(),
  unique (ceg_id, email)
);

create table partnerek (
  id                     uuid primary key default gen_random_uuid(),
  ceg_id                 uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  nev                    text not null,
  adoszam                text,
  cim                    text,
  kapcsolattarto         text,
  email                  text,
  telefon                text,
  fizetesi_hatarido_nap  int not null default 15,
  kedvezmeny_szazalek    numeric(5,2) not null default 0,
  szallito               boolean not null default false,
  megjegyzes             text,
  archivalt              boolean not null default false,
  letrehozva             timestamptz not null default now()
);

create table termekek (
  id             uuid primary key default gen_random_uuid(),
  ceg_id         uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  nev            text not null,
  cikkszam       text,
  mertekegyseg   text not null,
  beszerzesi_ar  numeric(14,2) not null default 0,
  eladasi_ar     numeric(14,2) not null,
  afa_kulcs      numeric(5,2) not null default 27,
  kategoria      termek_kategoria not null default 'anyag',
  aktiv          boolean not null default true,
  letrehozva     timestamptz not null default now()
);

-- Az árrés származtatott, nem tárolt: így nem tud elavulni.
create view termek_arres as
  select id, ceg_id, nev, eladasi_ar - beszerzesi_ar as arres,
         case when eladasi_ar > 0
              then round(100 * (eladasi_ar - beszerzesi_ar) / eladasi_ar, 1)
              else null end as arres_szazalek
  from termekek;

create table ajanlatok (
  id                   uuid primary key default gen_random_uuid(),
  ceg_id               uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  partner_id           uuid not null references partnerek(id),
  sorszam              text not null,
  kelt                 date not null default current_date,
  ervenyes_ig          date,
  netto                numeric(14,2) not null default 0,
  afa                  numeric(14,2) not null default 0,
  brutto               numeric(14,2) not null default 0,
  kedvezmeny_szazalek  numeric(5,2) not null default 0,
  allapot              ajanlat_allapot not null default 'piszkozat',
  -- Az „Amit feltételeztem" sáv tartalma. Ez az ajánlat része, nem megjelenítés:
  -- ha vita van, ez mondja meg, mit ígértünk és mit nem.
  feltetelezesek       jsonb not null default '[]'::jsonb,
  letrehozva           timestamptz not null default now(),
  unique (ceg_id, sorszam)
);

create table ajanlat_tetelek (
  id            uuid primary key default gen_random_uuid(),
  ajanlat_id    uuid not null references ajanlatok(id) on delete cascade,
  termek_id     uuid references termekek(id),
  megnevezes    text not null,
  mennyiseg     numeric(14,3) not null,
  mertekegyseg  text not null,
  -- A kiadáskori ár. Szándékosan másolat: az árlista változása nem írhatja át
  -- egy már kiadott ajánlat összegét.
  egysegar      numeric(14,2) not null,
  netto         numeric(14,2) not null,
  sorrend       int not null default 0
);

create table dokumentumok (
  id             uuid primary key default gen_random_uuid(),
  ceg_id         uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  tipus          text not null,
  fajl_url       text not null,
  eredeti_nev    text,
  feltoltotte_id uuid references felhasznalok(id),
  feltoltve      timestamptz not null default now()
);

create table szamlak (
  id                 uuid primary key default gen_random_uuid(),
  ceg_id             uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  partner_id         uuid references partnerek(id),
  irany              szamla_irany not null,
  sorszam            text not null,
  kelt               date,
  teljesites         date,
  fizetesi_hatarido  date,
  netto              numeric(14,2),
  afa                numeric(14,2),
  brutto             numeric(14,2) not null,
  penznem            text not null default 'HUF',
  allapot            szamla_allapot not null default 'nyitott',
  -- Honnan tudjuk a számlát. A felületen látszania kell (5. sarkalatos szabály).
  forras             adat_forras not null,
  kulso_azonosito    text,
  dokumentum_id      uuid references dokumentumok(id),
  letrehozva         timestamptz not null default now(),
  unique (ceg_id, irany, sorszam)
);

-- A megerősítő folyamat alapja: mezőnként tároljuk, honnan jött az adat,
-- biztos volt-e benne a modell, és javította-e a felhasználó.
create table kiolvasott_mezok (
  id              uuid primary key default gen_random_uuid(),
  ceg_id          uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  dokumentum_id   uuid not null references dokumentumok(id) on delete cascade,
  mezo_nev        text not null,
  ertek           text,
  forras_leiras   text not null,
  biztos          boolean not null,
  javitva         boolean not null default false,
  javitott_ertek  text,
  javitotta_id    uuid references felhasznalok(id),
  javitva_ekkor   timestamptz
);

create table feladatok (
  id          uuid primary key default gen_random_uuid(),
  ceg_id      uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  partner_id  uuid references partnerek(id),
  cim         text not null,
  leiras      text,
  hatarido    date,
  surgos      boolean not null default false,
  allapot     feladat_allapot not null default 'nyitott',
  forras      text not null default 'kezi',
  letrehozva  timestamptz not null default now()
);

-- ======================================================================
-- A JÓVÁHAGYÁSI KAPU
-- ======================================================================

create table javasolt_muveletek (
  id                uuid primary key default gen_random_uuid(),
  ceg_id            uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  tipus             muvelet_tipus not null,
  hivatkozott_tabla text not null,
  hivatkozott_id    uuid,
  javaslat          jsonb not null,
  allapot           muvelet_allapot not null default 'javasolt',
  javasolva         timestamptz not null default now(),
  jovahagyta_id     uuid references felhasznalok(id),
  jovahagyva        timestamptz,
  vegrehajtva       timestamptz,
  hiba_uzenet       text,

  -- A jóváhagyáshoz mindig tartozik ember és időpont.
  constraint jovahagyas_teljes check (
    (allapot in ('jovahagyott', 'vegrehajtott'))
      = (jovahagyta_id is not null and jovahagyva is not null)
  ),
  -- Végrehajtott művelethez időpont is kell.
  constraint vegrehajtas_ideje check (
    (allapot = 'vegrehajtott') = (vegrehajtva is not null)
  )
);

-- Az állapotgép. Ez a szabály maga, nem a felület jó szándéka:
--
--   javasolt ──► jovahagyott ──► vegrehajtott
--       │              │
--       ├──► kihagyott └──► elvetett
--       └──► elvetett
--
-- Ami itt hiányzik, az a lényeg: NINCS javasolt ──► vegrehajtott él.

create or replace function javasolt_muvelet_atmenet() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.allapot <> 'javasolt' then
      raise exception
        'Külső hatású művelet csak javasolt állapotban jöhet létre (kapott: %). '
        'A jóváhagyási kapu nem kerülhető meg.', new.allapot
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if old.allapot = new.allapot then
    return new;
  end if;

  if not (
       (old.allapot = 'javasolt'    and new.allapot in ('jovahagyott', 'kihagyott', 'elvetett'))
    or (old.allapot = 'jovahagyott' and new.allapot in ('vegrehajtott', 'elvetett'))
  ) then
    raise exception
      'Tiltott állapotátmenet: % → %. Végrehajtott állapotba csak jóváhagyott '
      'műveletből lehet eljutni.', old.allapot, new.allapot
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger javasolt_muveletek_atmenet
  before insert or update on javasolt_muveletek
  for each row execute function javasolt_muvelet_atmenet();

-- ======================================================================
-- AZ AI NAPLÓ
-- ======================================================================

create table ai_naplo (
  id                   uuid primary key default gen_random_uuid(),
  ceg_id               uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  felhasznalo_id       uuid references felhasznalok(id),
  muvelet              text not null,
  -- Melyik réteg felelt: 0 determinisztikus, 1 olcsó modell, 2 erős modell.
  reteg                smallint not null check (reteg between 0 and 2),
  modell               text,
  -- Mit LÁTOTT és mit JAVASOLT a modell. Enélkül a napló nem visszajátszható.
  bemenet              jsonb,
  kimenet              jsonb,
  token_be             int,
  token_ki             int,
  koltseg_ft           numeric(12,4),
  javasolt_muvelet_id  uuid references javasolt_muveletek(id),
  ido                  timestamptz not null default now()
);

-- A napló csak bővíthető. Ha átírható lenne, nem bizonyítana semmit.
create or replace function ai_naplo_valtozatlan() returns trigger
language plpgsql
as $$
begin
  raise exception 'Az AI napló nem módosítható és nem törölhető (kísérlet: %).', tg_op
    using errcode = 'insufficient_privilege';
end $$;

create trigger ai_naplo_csak_bovitheto
  before update or delete on ai_naplo
  for each row execute function ai_naplo_valtozatlan();

-- ======================================================================
-- SORSZINTŰ BIZTONSÁG
-- ======================================================================
--
-- Minden cég-hez tartozó táblán. A `force` azért kell, hogy a tábla
-- tulajdonosára is vonatkozzon — enélkül a migrációt futtató szerep
-- mindent látna.

do $$
declare
  t text;
begin
  foreach t in array array[
    'partnerek', 'termekek', 'ajanlatok', 'szamlak', 'dokumentumok',
    'kiolvasott_mezok', 'feladatok', 'javasolt_muveletek', 'ai_naplo',
    'felhasznalok'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($p$
      create policy %I_tenant on %I
        using (ceg_id = aktualis_ceg())
        with check (ceg_id = aktualis_ceg())
    $p$, t, t);
    execute format('grant select, insert, update, delete on %I to cegem_app', t);
  end loop;
end $$;

-- Az ajánlat tételei a fejen keresztül öröklik az izolációt.
alter table ajanlat_tetelek enable row level security;
alter table ajanlat_tetelek force row level security;
create policy ajanlat_tetelek_tenant on ajanlat_tetelek
  using (exists (select 1 from ajanlatok a
                 where a.id = ajanlat_tetelek.ajanlat_id and a.ceg_id = aktualis_ceg()))
  with check (exists (select 1 from ajanlatok a
                      where a.id = ajanlat_tetelek.ajanlat_id and a.ceg_id = aktualis_ceg()));
grant select, insert, update, delete on ajanlat_tetelek to cegem_app;

-- A cégek táblát csak a saját sorára látja a szerep.
alter table cegek enable row level security;
alter table cegek force row level security;
create policy cegek_tenant on cegek
  using (id = aktualis_ceg())
  with check (id = aktualis_ceg());
grant select, update on cegek to cegem_app;

grant usage on schema public to cegem_app;
grant select on termek_arres to cegem_app;

-- ------------------------------------------------------------------ indexek

create index on partnerek (ceg_id, nev);
create index on termekek (ceg_id) where aktiv;
create index on ajanlatok (ceg_id, allapot);
create index on szamlak (ceg_id, irany, allapot, fizetesi_hatarido);
create index on feladatok (ceg_id, allapot, hatarido);
create index on javasolt_muveletek (ceg_id, allapot, javasolva);
create index on ai_naplo (ceg_id, ido desc);
create index on kiolvasott_mezok (dokumentum_id);
