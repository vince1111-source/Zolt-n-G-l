-- ============================================================================
-- CÉGEM.AI — 0002 Supabase Auth kötés
--
-- Az 0001 séma az `aktualis_ceg()` függvényt a JWT `ceg_id` claim-jére építi.
-- Ilyen egyéni claim-et Supabase Auth alapból nem állít be — ahhoz egy
-- Custom Access Token Hook kellene, amit a projekt irányítópultján kell
-- bekapcsolni, nem SQL-lel.
--
-- Ehelyett a szokásos, hook nélküli Supabase-mintát választjuk:
--   - a `felhasznalok` tábla egy `auth_user_id` oszloppal a bejelentkezett
--     felhasználóhoz (auth.uid()) kötődik,
--   - az `aktualis_ceg()` ebből olvassa ki a cég azonosítóját,
--   - regisztrációkor egy SECURITY DEFINER függvény hozza létre a céget és
--     az első felhasználót egy tranzakcióban — ez az egyetlen hely, ahol a
--     jóváhagyási kapu és a többi szabály előtt, elsőként keletkezik sor.
--
-- Ami NEM változik: a jóváhagyási kapu, az AI napló és a sorszintű
-- izoláció szabályai — ez a migráció csak az „aktuális cég" forrását cseréli.
--
-- Futtatás:  psql -f db/migraciok/0002_auth_kotes.sql   (0001 után)
-- ============================================================================

alter table felhasznalok
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

create index if not exists felhasznalok_auth_user_id_idx on felhasznalok (auth_user_id);

-- `aktualis_ceg()` — most már elsősorban a bejelentkezett Supabase-felhasználó
-- saját cégét adja vissza. A korábbi két forrás (JWT `ceg_id` claim,
-- `app.ceg_id` munkamenet-változó) megmarad tartalékként a helyi
-- fejlesztéshez és a háttérfolyamatokhoz, amik nem valódi felhasználói
-- munkamenetben futnak.
--
-- SECURITY DEFINER, mert a `felhasznalok` tábla saját maga is a sorszintű
-- izoláció alá esik (`ceg_id = aktualis_ceg()`) — enélkül a belső lekérdezés
-- önmagát hívná végtelenül. A definer (a migrációt futtató szerep) Supabase-en
-- megkerüli az RLS-t, ahogy az 0001 megjegyzése is jelzi; ez az egyetlen ok,
-- amiért ez a függvény nem a hívó jogán fut.
create or replace function aktualis_ceg() returns uuid
language plpgsql stable security definer set search_path = public
as $$
declare
  sajat_ceg uuid;
  ertek text;
begin
  begin
    select f.ceg_id into sajat_ceg
    from felhasznalok f
    where f.auth_user_id = auth.uid();
  exception when others then
    sajat_ceg := null;
  end;

  if sajat_ceg is not null then
    return sajat_ceg;
  end if;

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

-- ======================================================================
-- REGISZTRÁCIÓ — cég és első felhasználó létrehozása egy lépésben
-- ======================================================================
--
-- A tyúk-tojás probléma: a sorszintű izoláció miatt egy még cég nélküli
-- felhasználó nem szúrhatna be sem `cegek`, sem `felhasznalok` sorba
-- (az `aktualis_ceg()` NULL-t adna). Ezért ez a függvény SECURITY DEFINER:
-- a saját jogán, a szabályokat megkerülve hozza létre az ELSŐ két sort —
-- utána minden a szokásos RLS-en megy.
--
-- Csak bejelentkezett (authenticated) felhasználó hívhatja, és csak akkor
-- csinál bármit, ha az illetőnek MÉG NINCS cége — így nem lehet vele
-- második céget aggatni egy meglévő fiókra.
create or replace function sajat_ceg_letrehozasa(p_ceg_nev text, p_felhasznalo_nev text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uj_ceg_id uuid;
  sajat_email text;
begin
  if auth.uid() is null then
    raise exception 'Bejelentkezés szükséges.' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from felhasznalok where auth_user_id = auth.uid()) then
    raise exception 'Ehhez a fiókhoz már tartozik cég.' using errcode = 'unique_violation';
  end if;

  if coalesce(trim(p_ceg_nev), '') = '' then
    raise exception 'A cégnév kötelező.' using errcode = 'check_violation';
  end if;

  select email into sajat_email from auth.users where id = auth.uid();

  insert into cegek (nev) values (trim(p_ceg_nev)) returning id into uj_ceg_id;

  insert into felhasznalok (ceg_id, nev, email, szerep, auth_user_id)
  values (uj_ceg_id, coalesce(nullif(trim(p_felhasznalo_nev), ''), sajat_email), sajat_email,
          'tulajdonos', auth.uid());

  return uj_ceg_id;
end $$;

-- Csak bejelentkezett felhasználó hívhatja — anonim nem.
revoke all on function sajat_ceg_letrehozasa(text, text) from public;
grant execute on function sajat_ceg_letrehozasa(text, text) to authenticated;

-- ======================================================================
-- JOGOSULTSÁGOK A VALÓDI SUPABASE-SZEREPNEK
-- ======================================================================
--
-- Az 0001 migráció a `cegem_app` szerepnek adott jogot — ez a helyi
-- (nem Supabase) futtatáshoz készült szimulált szerep. Supabase-en az
-- alkalmazás ténylegesen az `authenticated` beépített szerep alatt fut
-- (a PostgREST minden bejelentkezett kérést erre vált) — enélkül a jogok
-- nélkül az RLS szabályok helyesek lennének, de a lekérdezés már a tábla-
-- szintű jogosultságon elakadna.
grant usage on schema public to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'partnerek', 'termekek', 'ajanlatok', 'ajanlat_tetelek', 'szamlak',
    'dokumentumok', 'kiolvasott_mezok', 'feladatok', 'javasolt_muveletek',
    'ai_naplo', 'felhasznalok'
  ]
  loop
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- A cégek tábla a saját sorára csak olvasható és szerkeszthető — új céget
-- kizárólag a `sajat_ceg_letrehozasa` függvényen keresztül lehet létrehozni.
grant select, update on cegek to authenticated;
grant select on termek_arres to authenticated;
