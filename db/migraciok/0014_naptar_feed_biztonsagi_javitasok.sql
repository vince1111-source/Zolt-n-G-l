-- CÉGEM.AI — Naptár-feed biztonsági javítások.
--
-- A 0013-as migráció (naptár .ics szinkron) élesítése előtt egy ellenséges
-- (5 szempontú) biztonsági felülvizsgálatot futtattam rá, ugyanúgy, ahogy a
-- könyvelői szerepkörnél (lásd HANDOVER 2.4). Két komoly (magas/közepes)
-- és több kisebb rést talált — ez a migráció ezeket javítja, MIELŐTT a
-- funkciót Vince ténylegesen használatba veszi.
--
-- 1. MAGAS: a `cegek` tábla `authenticated`-nek adott, oszlopmegkötés
--    nélküli SELECT joga + a könyvelői sor-szintű policy (`cegek_konyvelo`,
--    0011) együtt azt jelentette, hogy egy könyvelő közvetlen PostgREST-
--    hívással kiolvashatta egy ügyfélcég `naptar_feed_token`-jét is —
--    annak ellenére, hogy a felület sosem kér ilyen oszlopot (RLS sor-
--    szintű, nem oszlop-szintű, és a felületi "sosem kérdezi le" nem
--    adatbázis-szintű garancia). A token emellett a könyvelői hozzáférés
--    visszavonása UTÁN is örökre érvényes maradt volna, mert a feed-
--    függvények sosem néztek a `konyvelo_hozzaferes` táblába.
--    JAVÍTÁS: a token egy ÖNÁLLÓ táblába (`naptar_feed`) kerül, saját,
--    szigorú tenant-RLS-szel (`ceg_id = aktualis_ceg()`) — ez a policy
--    NEM tartalmaz könyvelői kivételt, tehát egy könyvelő (akinek
--    `aktualis_ceg()`-je mindig NULL) soha nem fér hozzá, sem a régi
--    oszlophoz (törölve), sem az újhoz.
--
-- 2. KÖZEPES: a `naptar_feed_esemenyei` a `munkak`/`partnerek` táblákkal
--    a `munka_id`/`partner_id` mentén JOIN-olt anélkül, hogy visszaellenőrizte
--    volna: azok TÉNYLEG ugyanahhoz a céghez tartoznak-e. Mivel a függvény
--    SECURITY DEFINER (RLS-t megkerüli), és egy idegen kulcs önmagában nem
--    cég-specifikus, egy idegen cégre mutató `munka_id` beszivárogtathatta
--    volna egy másik cég munkacímét/ügyfélnevét a feedbe.
--    JAVÍTÁS: a join-ba visszakerül a cég-egyezés (`m.ceg_id = nf.ceg_id`),
--    ÉS egy új trigger már ÍRÁSKOR megakadályozza, hogy `naptar_esemenyek.
--    munka_id` idegen céghez tartozó munkára mutasson — ugyanaz a minta,
--    mint a 0007-es migráció `nagyker_tetel_szallito_ellenoriz` triggere.
--
-- 3. KÖZEPES: a feed korlátlan méretű volt (a cég teljes, valaha rögzített
--    eseménytörténete egyetlen kérésre, minden alkalommal újraszámolva).
--    JAVÍTÁS: időablak (elmúlt 90 nap – jövő 365 nap) és egy kemény felső
--    korlát (500 sor) — bőven elég egy telefonos naptárba szinkronizált
--    munkanaptárhoz, de korlátot szab a lekérdezés/válasz méretének.
--
-- 4. ALACSONY: bárki (nem csak a tulajdonos) újragenerálhatta a MEGOSZTOTT
--    tokent, ezzel az egész csapat feliratkozását megszakítva. JAVÍTÁS: a
--    token mostantól csak egy SECURITY DEFINER RPC-n keresztül cserélhető,
--    ami a hívó szerepét ellenőrzi — ugyanaz a minta, mint a 0011-es
--    migráció könyvelő-meghívási RPC-i.
--
-- 5. ALACSONY: a SECURITY DEFINER függvények nem sématagolt (unqualified)
--    táblahivatkozásokat használtak — a `search_path = public` önmagában
--    nem zárja ki, hogy a hívó `pg_temp`-je előbb kerüljön elő. Ma ez nem
--    kihasználható (nincs olyan út, ahol `anon`/`authenticated` tetszőleges
--    SQL-t futtathatna), de a Postgres saját ajánlása szerint ingyenes,
--    érdemes megtenni. JAVÍTÁS: minden hivatkozás `public.`-cal minősítve.
--
-- A kisebb, .ics-formátumú találatokat (asztrális karakterek tördelése,
-- irányjelző Unicode-karakterek szűretlensége) a webapp/src/lib/ics.ts
-- külön, ehhez a migrációhoz nem kötődő módosítása javítja.
--
-- Tudatosan NEM javított, elfogadott kockázatként dokumentált pontok
-- (lásd HANDOVER 2.6): nincs sebességkorlátozás ezen a végponton (a
-- Supabase PostgREST réteg közvetlenül is elérhető, egy jövőbeli, csak a
-- Next.js route-ra épített korlátozás ezt nem fedné le — ez külön
-- infrastruktúra-döntés); a token nem jár le, és nyers formában
-- szerepel az URL-ben (naplókba, böngészőelőzményekbe kerülhet) — ez
-- tudatos tervezési döntés, ugyanaz a modell, mint Google Calendar saját
-- "titkos iCal cím" funkciójáé.

-- ============================================================ 1. lépés
-- A token átköltöztetése önálló táblába, könyvelői kivétel nélküli RLS-sel.

create table naptar_feed (
  ceg_id      uuid primary key references cegek(id) on delete cascade,
  token       uuid not null unique default gen_random_uuid(),
  frissitve   timestamptz not null default now()
);

insert into naptar_feed (ceg_id, token) select id, naptar_feed_token from cegek;

alter table naptar_feed enable row level security;
alter table naptar_feed force row level security;

-- Szándékosan CSAK a sima tenant-policy — nincs könyvelői kivétel, mint a
-- `cegek_konyvelo`-nál. Egy könyvelő `aktualis_ceg()`-je mindig NULL
-- (lásd `felhasznalok_konyvelo_ceg_nelkul`, 0010), tehát ez a policy rá
-- sosem teljesül — a könyvelő szerkezetileg, nem csak jóhiszeműen, nem
-- fér hozzá.
create policy naptar_feed_tenant on naptar_feed
  using (ceg_id = aktualis_ceg())
  with check (ceg_id = aktualis_ceg());

grant select on naptar_feed to authenticated, cegem_app;

alter table cegek drop column naptar_feed_token;

-- ============================================================ 2. lépés
-- Token-csere csak SECURITY DEFINER RPC-n, csak a tulajdonosnak.

create or replace function naptar_feed_token_ujrageneralasa()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  hivo_ceg_id uuid;
  hivo_szerep felhasznalo_szerep;
begin
  select ceg_id, szerep into hivo_ceg_id, hivo_szerep
  from public.felhasznalok
  where auth_user_id = auth.uid();

  if hivo_ceg_id is null or hivo_szerep <> 'tulajdonos' then
    raise exception 'Csak a cég tulajdonosa generálhat új naptár-feed linket.';
  end if;

  update public.naptar_feed
  set token = gen_random_uuid(), frissitve = now()
  where ceg_id = hivo_ceg_id;
end $$;

revoke all on function naptar_feed_token_ujrageneralasa() from public, anon;
grant execute on function naptar_feed_token_ujrageneralasa() to authenticated;

-- ============================================================ 3. lépés
-- A feed-lekérdező függvények: sématagolás, cég-egyezés a munkak/partnerek
-- join-ban, időablak + felső korlát.

create or replace function naptar_feed_ceg_neve(p_token uuid)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  eredmeny text;
begin
  select c.nev into eredmeny
  from public.cegek c
  join public.naptar_feed nf on nf.ceg_id = c.id
  where nf.token = p_token;
  return eredmeny;
end $$;

create or replace function naptar_feed_esemenyei(p_token uuid)
returns table (
  id uuid,
  cim text,
  kezdet timestamptz,
  veg timestamptz,
  munka_cim text,
  partner_nev text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  return query
    select e.id, e.cim, e.kezdet, e.veg, m.cim as munka_cim, p.nev as partner_nev
    from public.naptar_feed nf
    join public.naptar_esemenyek e on e.ceg_id = nf.ceg_id
    left join public.munkak m on m.id = e.munka_id and m.ceg_id = nf.ceg_id
    left join public.partnerek p on p.id = m.partner_id and p.ceg_id = nf.ceg_id
    where nf.token = p_token
      and e.kezdet > now() - interval '90 days'
      and e.kezdet < now() + interval '365 days'
    order by e.kezdet
    limit 500;
end $$;

revoke all on function naptar_feed_ceg_neve(uuid) from public, anon;
revoke all on function naptar_feed_esemenyei(uuid) from public, anon;
grant execute on function naptar_feed_ceg_neve(uuid) to anon, authenticated;
grant execute on function naptar_feed_esemenyei(uuid) to anon, authenticated;

-- ============================================================ 4. lépés
-- Írás-időben megakadályozni, hogy egy esemény idegen cég munkájára
-- mutasson (defense-in-depth a 3. lépés join-os ellenőrzése mellett —
-- ugyanaz a minta, mint a 0007-es nagyker_tetel_szallito_ellenoriz).

create or replace function naptar_esemeny_munka_ceg_ellenoriz() returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.munka_id is not null then
    if not exists (
      select 1 from munkak m where m.id = new.munka_id and m.ceg_id = new.ceg_id
    ) then
      raise exception
        'A kapcsolt munka (%) nem ehhez a céghez tartozik.', new.munka_id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create trigger naptar_esemenyek_munka_ellenorzese
  before insert or update of munka_id, ceg_id on naptar_esemenyek
  for each row execute function naptar_esemeny_munka_ceg_ellenoriz();
