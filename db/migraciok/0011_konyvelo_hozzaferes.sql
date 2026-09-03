-- CÉGEM.AI — Könyvelői szerepkör.
--
-- docs/termekvizio-2026-08-31.md 27-34. szakasza. A könyvelő NEM "egy cég
-- munkatársa" — több cég adatait éri el, meghatározott listán, saját
-- fiókkal. Ez más modell, mint az `aktualis_ceg()`-re épülő
-- egy-cég-egy-felhasználó minta:
--
--   1. `felhasznalok.ceg_id` NULLABLE lesz, de KIZÁRÓLAG `szerep='konyvelo'`
--      esetén lehet NULL (CHECK-kel kikényszerítve).
--   2. Új `konyvelo_hozzaferes` kapcsolótábla mondja meg, MELYIK könyvelő
--      MELYIK cég adatait érheti el.
--   3. Két adat-táblán (`cegek`, `dokumentumok`) új, kiegészítő RLS policy
--      engedi a könyvelőnek a rá bízott cégek olvasását, csak SELECT-re.
--
-- ⚠ EZ A MIGRÁCIÓ EGY ELLENSÉGES BIZTONSÁGI FELÜLVIZSGÁLAT UTÁN KÉSZÜLT
-- (lásd HANDOVER.md), ami két VALÓS, megerősített rést talált az eredeti
-- tervezetben:
--
--   A) `felhasznalok.szerep`-et semmi nem védte oszlop-szinten — ezt a
--      0009_felhasznalo_update_szigoritas.sql már lezárta (teljes UPDATE
--      megvonás a `felhasznalok` táblán `authenticated`/`cegem_app`-tól),
--      FÜGGETLENÜL ettől a szelettől — ez a javítás már élesben van.
--
--   B) A `konyvelo_meghivas_veglegesitese` sosem ellenőrizte, hogy a
--      paraméterként kapott `p_auth_user_id` valóban a `p_email`-hez
--      tartozik-e — egy tulajdonos ezzel tetszőleges MÁSIK saját Auth-
--      fiókját állíthatta volna be egy célzott, valódi könyvelő e-mail-
--      címével, majd ha az áldozat cég tulajdonosa ugyanazt az e-mailt
--      hívta meg, a nem egyedi `email` oszlop miatt a támadó hamis sorát
--      találhatta meg — idegen cégre szerezve hozzáférést. Ez a migráció
--      ezt A HELYES, `sajat_ceg_letrehozasa`-ban már bevált mintával
--      javítja (`select email from auth.users where id = ...`), plusz egy
--      parciális egyedi indexszel a `felhasznalok.email`-re könyvelőknél.
--
-- Emellett defense-in-depth: a `konyvelo_hozzaferes_ceg_admin` policy is
-- ellenőrzi, hogy a `konyvelo_felhasznalo_id` valóban `szerep='konyvelo'`
-- felhasználóra mutat — ne csak az RPC üzleti logikája őrizze ezt.

-- ---------------------------------------------------------- felhasznalok

alter table felhasznalok alter column ceg_id drop not null;

alter table felhasznalok
  add constraint felhasznalok_konyvelo_ceg_nelkul check (
    (szerep = 'konyvelo' and ceg_id is null)
    or (szerep <> 'konyvelo' and ceg_id is not null)
  );

-- Egy adott e-mail-hez legfeljebb egy KÖNYVELŐ-sor tartozhat — ez zárja le
-- a fent (B) leírt kétértelműséget a `konyvelo_hozzaferes_igenylese`
-- e-mail-alapú keresésénél.
create unique index felhasznalok_konyvelo_email_egyedi
  on felhasznalok (lower(email))
  where szerep = 'konyvelo';

-- Saját sor olvasása mindenkinek — tulajdonosnál/munkatársnál ez eddig is
-- következett a `felhasznalok_tenant` szabályból, de a könyvelőnél
-- `aktualis_ceg()` NULL, ezért az a szabály rá nem vonatkozik. Enélkül a
-- könyvelő a saját `felhasznalok` sorát sem látná bejelentkezés után.
create policy felhasznalok_sajat_sor on felhasznalok
  for select
  using (auth_user_id = auth.uid());

-- ------------------------------------------------------ konyvelo_hozzaferes

create table konyvelo_hozzaferes (
  id                       uuid primary key default gen_random_uuid(),
  konyvelo_felhasznalo_id  uuid not null references felhasznalok(id) on delete cascade,
  ceg_id                   uuid not null references cegek(id) on delete cascade,
  meghivta_id              uuid references felhasznalok(id),
  meghivva                 timestamptz not null default now(),
  -- Lágy visszavonás — a sor megmarad: ez maga az audit-nyom arról, hogy
  -- ki mikor kapott és mikor vesztett hozzáférést.
  visszavonva              timestamptz,
  unique (konyvelo_felhasznalo_id, ceg_id)
);

alter table konyvelo_hozzaferes enable row level security;
alter table konyvelo_hozzaferes force row level security;

-- A cég TULAJDONOSA kezelheti a saját cégéhez tartozó hozzáféréseket, ÉS
-- (defense-in-depth, a felülvizsgálat javaslata) a célzott felhasználó
-- valóban `konyvelo` szerepű kell legyen — ne csak az RPC ellenőrizze ezt.
create policy konyvelo_hozzaferes_ceg_admin on konyvelo_hozzaferes
  using (
    ceg_id = aktualis_ceg()
    and exists (
      select 1 from felhasznalok f
      where f.auth_user_id = auth.uid() and f.szerep = 'tulajdonos'
    )
  )
  with check (
    ceg_id = aktualis_ceg()
    and exists (
      select 1 from felhasznalok f
      where f.auth_user_id = auth.uid() and f.szerep = 'tulajdonos'
    )
    and exists (
      select 1 from felhasznalok kf
      where kf.id = konyvelo_felhasznalo_id and kf.szerep = 'konyvelo'
    )
  );

-- A könyvelő látja, mely cégekhez van (volt) hozzáférése.
create policy konyvelo_hozzaferes_sajat on konyvelo_hozzaferes
  for select
  using (
    konyvelo_felhasznalo_id = (
      select id from felhasznalok where auth_user_id = auth.uid()
    )
  );

grant select, insert, update, delete on konyvelo_hozzaferes to cegem_app;
grant select, insert, update, delete on konyvelo_hozzaferes to authenticated;

create index on konyvelo_hozzaferes (ceg_id) where visszavonva is null;
create index on konyvelo_hozzaferes (konyvelo_felhasznalo_id) where visszavonva is null;

-- --------------------------------------------------- kiegészítő olvasási jog

-- A cégnév a könyvelői dashboardhoz kell (melyik ügyfél az melyik sor).
create policy cegek_konyvelo on cegek
  for select
  using (
    exists (
      select 1 from konyvelo_hozzaferes kh
      where kh.ceg_id = cegek.id
        and kh.visszavonva is null
        and kh.konyvelo_felhasznalo_id = (
          select id from felhasznalok where auth_user_id = auth.uid()
        )
    )
  );

-- A dokumentumtár — ez az EGYETLEN adattábla, amit a könyvelő ebben a
-- körben elér, és csak OLVASÁSRA: nem tölthet fel, nem törölhet a
-- vállalkozó nevében.
create policy dokumentumok_konyvelo on dokumentumok
  for select
  using (
    exists (
      select 1 from konyvelo_hozzaferes kh
      where kh.ceg_id = dokumentumok.ceg_id
        and kh.visszavonva is null
        and kh.konyvelo_felhasznalo_id = (
          select id from felhasznalok where auth_user_id = auth.uid()
        )
    )
  );

create index on dokumentumok (ceg_id, feltoltve desc);

-- ======================================================================
-- MEGHÍVÁSI FOLYAMAT — két RPC, a service-role Admin API híváson kívül
-- ======================================================================

create or replace function konyvelo_hozzaferes_igenylese(p_email text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  sajat_ceg uuid;
  hivo_szerep felhasznalo_szerep;
  hivo_id uuid;
  celzott_id uuid;
  celzott_szerep felhasznalo_szerep;
begin
  if auth.uid() is null then
    raise exception 'Bejelentkezés szükséges.' using errcode = 'insufficient_privilege';
  end if;

  select id, ceg_id, szerep into hivo_id, sajat_ceg, hivo_szerep
  from felhasznalok where auth_user_id = auth.uid();

  if sajat_ceg is null or hivo_szerep <> 'tulajdonos' then
    raise exception 'Csak a cég tulajdonosa hívhat meg könyvelőt.'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_email), '') = '' then
    raise exception 'Az e-mail cím kötelező.' using errcode = 'check_violation';
  end if;

  -- Normalizált (kis/nagybetűtől független) keresés — a
  -- `felhasznalok_konyvelo_email_egyedi` parciális index ugyanígy
  -- normalizál, tehát legfeljebb egy könyvelő-sor egyezhet.
  select id, szerep into celzott_id, celzott_szerep
  from felhasznalok where lower(email) = lower(trim(p_email));

  if celzott_id is null then
    return null; -- a hívó oldal admin-meghívót küld, majd a veglegesitese-t hívja
  end if;

  if celzott_szerep <> 'konyvelo' then
    raise exception 'Ez az e-mail cím már más szerepkörhöz tartozik ebben a rendszerben.'
      using errcode = 'unique_violation';
  end if;

  insert into konyvelo_hozzaferes (konyvelo_felhasznalo_id, ceg_id, meghivta_id)
  values (celzott_id, sajat_ceg, hivo_id)
  on conflict (konyvelo_felhasznalo_id, ceg_id)
  do update set visszavonva = null, meghivva = now();

  return celzott_id;
end $$;

create or replace function konyvelo_meghivas_veglegesitese(p_auth_user_id uuid, p_email text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  sajat_ceg uuid;
  hivo_szerep felhasznalo_szerep;
  hivo_id uuid;
  konyvelo_id uuid;
  valodi_email text;
begin
  if auth.uid() is null then
    raise exception 'Bejelentkezés szükséges.' using errcode = 'insufficient_privilege';
  end if;

  select id, ceg_id, szerep into hivo_id, sajat_ceg, hivo_szerep
  from felhasznalok where auth_user_id = auth.uid();

  if sajat_ceg is null or hivo_szerep <> 'tulajdonos' then
    raise exception 'Csak a cég tulajdonosa hívhat meg könyvelőt.'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from felhasznalok where auth_user_id = p_auth_user_id) then
    raise exception 'Ehhez az Auth-fiókhoz már tartozik felhasználói sor.'
      using errcode = 'unique_violation';
  end if;

  -- BIZTONSÁGI JAVÍTÁS (ellenséges felülvizsgálat, lásd HANDOVER.md):
  -- a `p_auth_user_id`-t MINDIG az `auth.users`-ben ténylegesen hozzá
  -- tartozó e-mail-lel vetjük össze — a hívó (tulajdonos) nem adhat meg
  -- tetszőleges saját Auth-fiókot egy IDEGEN e-mail-cím mögé bújtatva.
  -- Ugyanaz a minta, mint `sajat_ceg_letrehozasa`-ban.
  select email into valodi_email from auth.users where id = p_auth_user_id;
  if valodi_email is null or lower(valodi_email) <> lower(trim(p_email)) then
    raise exception 'A megadott e-mail cím nem egyezik a meghívott fiók e-mail címével.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into felhasznalok (ceg_id, nev, email, szerep, auth_user_id)
  values (null, trim(p_email), trim(p_email), 'konyvelo', p_auth_user_id)
  returning id into konyvelo_id;

  insert into konyvelo_hozzaferes (konyvelo_felhasznalo_id, ceg_id, meghivta_id)
  values (konyvelo_id, sajat_ceg, hivo_id);

  return konyvelo_id;
end $$;

revoke all on function konyvelo_hozzaferes_igenylese(text) from public, anon;
grant execute on function konyvelo_hozzaferes_igenylese(text) to authenticated;

revoke all on function konyvelo_meghivas_veglegesitese(uuid, text) from public, anon;
grant execute on function konyvelo_meghivas_veglegesitese(uuid, text) to authenticated;

-- Saját név utólagos beállítása (pl. a könyvelő első bejelentkezéskor,
-- amikor a `nev` még a placeholder e-mail-cím) — külön, szűkre szabott
-- RPC, hogy senki ne módosíthassa a saját `szerep`-ét vagy `ceg_id`-ját
-- egy általános UPDATE-en keresztül (amit a 0009-es migráció amúgy is
-- teljesen megvont).
create or replace function sajat_nev_frissitese(p_nev text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Bejelentkezés szükséges.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_nev), '') = '' then
    raise exception 'A név nem lehet üres.' using errcode = 'check_violation';
  end if;
  update felhasznalok set nev = trim(p_nev) where auth_user_id = auth.uid();
end $$;

revoke all on function sajat_nev_frissitese(text) from public, anon;
grant execute on function sajat_nev_frissitese(text) to authenticated;
