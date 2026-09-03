-- CÉGEM.AI — Naptár (egyszerű hét-nézet).
--
-- docs/termekvizio-2026-08-31.md 19-21. szakasza szerint elfogadott
-- ajánlat/munka után a rendszer javasol egy naptári időpontot, és van egy
-- egyszerű nap/hét nézet a munkákra.
--
-- EZ A MIGRÁCIÓ CSAK AZ ALAPOT ADJA: egy esemény-tábla, amit egy egyszerű,
-- lista-szerű hét-nézet olvas ki. A 20-21. szakasz "intelligens naptár-
-- optimalizálás"-a (utazási idő figyelembevétele, szabad időablak-keresés)
-- valós geokódolás/útvonaltervezés API-t igényelne, amihez ma nincs adatunk —
-- ez KÜLÖN, KÉSŐBBI szelet.
--
-- Szándékosan NEM megy a `javasolt_muveletek` kapun: egy naptári bejegyzés
-- létrehozása/törlése belső nyilvántartás, nem külső hatású (e-mail, számla,
-- utalás jellegű) művelet — ugyanaz az indoklás, mint a `munkak.allapot`-nál
-- (lásd 0004_munkak.sql).
--
-- `veg` szándékosan NULLABLE, és semmi nem tölti ki automatikusan: nincs
-- valós munkaidő-norma adat minden tételnél (lásd 0005_munkaido.sql — ott is
-- opcionális), ezért a rendszer NEM találhat ki egy záró időpontot a
-- kezdetből — csak akkor kerül be, ha a felhasználó ténylegesen megadja.
--
-- `munka_id` opcionális FK a `munkak` táblára — `on delete set null`, mert
-- egy naptári esemény (pl. egy felmérés időpontja) túlélheti a hozzá tartozó
-- munka törlését.

create table naptar_esemenyek (
  id          uuid primary key default gen_random_uuid(),
  ceg_id      uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  munka_id    uuid references munkak(id) on delete set null,
  -- Az esemény címe/címkéje (pl. "Felmérés — Kovács Kft."), NEM helyszín —
  -- a helyszín adott esetben a kapcsolt munka `cim` mezőjében van.
  cim         text not null,
  kezdet      timestamptz not null,
  veg         timestamptz,
  letrehozva  timestamptz not null default now(),
  constraint naptar_esemeny_sorrend check (veg is null or veg > kezdet)
);

alter table naptar_esemenyek enable row level security;
alter table naptar_esemenyek force row level security;
create policy naptar_esemenyek_tenant on naptar_esemenyek
  using (ceg_id = aktualis_ceg())
  with check (ceg_id = aktualis_ceg());

grant select, insert, update, delete on naptar_esemenyek to cegem_app;
grant select, insert, update, delete on naptar_esemenyek to authenticated;

create index on naptar_esemenyek (ceg_id, kezdet);
create index on naptar_esemenyek (munka_id) where munka_id is not null;
