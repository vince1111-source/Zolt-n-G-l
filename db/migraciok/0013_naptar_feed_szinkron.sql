-- CÉGEM.AI — Naptár .ics szinkron (egyirányú, feliratkozásos feed).
--
-- Vince kérése: legalább napi szinkron a saját (telefonos) naptárral.
-- A választott megoldás egy szabványos iCalendar (.ics) feed URL
-- cégenként, amit a felhasználó egyszer feliratkoztat a saját Google/
-- Apple/Outlook naptárába — ezek az appok a feliratkozott naptárakat
-- alapból kb. naponta frissítik, ami pontosan ezt a "napi szinkront"
-- adja, egy teljes Google Calendar API OAuth-integráció (jóváhagyási
-- folyamat, tokentárolás) nélkül. Ez EGYIRÁNYÚ (a mi naptárunkból
-- kifelé) — pont úgy, ahogy Google Calendar saját "titkos iCal cím"
-- funkciója is működik.
--
-- Az azonosító NEM a cég `id`-je (az számos más helyen szerepel, pl.
-- ajánlat-dokumentum URL-ekben), hanem egy önálló, csak erre a célra
-- szolgáló, bármikor újragenerálható (=visszavonható) titok.
--
-- ⚠ Ez az ELSŐ hely a projektben, ahol egy SECURITY DEFINER függvényt
-- az `anon` (be nem jelentkezett) szerepnek is futtatnia kell tudnia —
-- a naptáralkalmazás, ami a feed URL-t lekéri, nyilvánvalóan nem hordoz
-- Supabase-munkamenetet. A biztonság kizárólag a token
-- kitalálhatatlanságán múlik (UUID v4, ~122 bit véletlen), ugyanúgy,
-- mint egy jelszó-visszaállító linknél — ezért a függvények KIZÁRÓLAG a
-- kapott tokenre szűrnek, semmi mást nem fogadnak el bemenetként, és
-- egyik sem ír semmit.

alter table cegek add column naptar_feed_token uuid not null default gen_random_uuid();

create unique index cegek_naptar_feed_token_idx on cegek (naptar_feed_token);

comment on column cegek.naptar_feed_token is
  'Titkos, kitalálhatatlan azonosító a cég .ics naptár-feedjéhez. Elkülönül a cég id-jétől, hogy szivárgás esetén önállóan, a cég többi adatának érintése nélkül újragenerálható legyen.';

-- A cég nevét a feed fejlécében (X-WR-CALNAME) használjuk, és arra is,
-- hogy érvénytelen/visszavont tokennél tiszta 404-et tudjunk adni ahelyett,
-- hogy csendben egy üres naptárat szolgálnánk ki (ami token-visszavonás
-- után összetéveszthető lenne azzal, hogy "nincs esemény").
create or replace function naptar_feed_ceg_neve(p_token uuid)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  eredmeny text;
begin
  select nev into eredmeny from cegek where naptar_feed_token = p_token;
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
    from naptar_esemenyek e
    join cegek c on c.id = e.ceg_id
    left join munkak m on m.id = e.munka_id
    left join partnerek p on p.id = m.partner_id
    where c.naptar_feed_token = p_token
    order by e.kezdet;
end $$;

revoke all on function naptar_feed_ceg_neve(uuid) from public, anon;
revoke all on function naptar_feed_esemenyei(uuid) from public, anon;
grant execute on function naptar_feed_ceg_neve(uuid) to anon, authenticated;
grant execute on function naptar_feed_esemenyei(uuid) to anon, authenticated;
