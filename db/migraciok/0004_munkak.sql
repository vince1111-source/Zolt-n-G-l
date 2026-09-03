-- CÉGEM.AI — Munkák (jobs).
--
-- Egy elfogadott ajánlat itt válik "munkává" (lásd docs/termekvizio-
-- 2026-08-31.md "Wow #7": elfogadott ajánlat → munka automatikusan).
-- Kézzel is felvehető, ajánlat nélkül.
--
-- Szándékosan NEM megy a `javasolt_muveletek` kapun: a `allapot` egy
-- belső, szabadon oda-vissza váltható nyilvántartás, nem külső hatású
-- művelet (nincs is hozzá `muvelet_tipus` érték).
--
-- `cim` és `hatarido` szándékosan NULLABLE, és auto-létrehozáskor üresen
-- maradnak: a munka helyszíne gyakran más, mint a partner számlázási
-- címe, a határidőre pedig nincs valós adat a rendszernek — egy hamisan
-- kitöltöttnek tűnő mező rosszabb, mint egy látható üres mező.

create type munka_allapot as enum ('elokeszites', 'folyamatban', 'befejezve');

create table munkak (
  id          uuid primary key default gen_random_uuid(),
  ceg_id      uuid not null references cegek(id) on delete cascade default aktualis_ceg(),
  ajanlat_id  uuid references ajanlatok(id),
  partner_id  uuid references partnerek(id),
  cim         text,
  leiras      text,
  hatarido    date,
  allapot     munka_allapot not null default 'elokeszites',
  letrehozva  timestamptz not null default now(),
  -- Idempotencia: egy ajánlatból legfeljebb egy munka jön létre
  -- automatikusan, akkor is, ha az elfogadás valamiért kétszer fut le.
  -- A NULL-ok (kézzel felvett munkák) nem ütköznek egymással.
  unique (ajanlat_id)
);

alter table munkak enable row level security;
alter table munkak force row level security;
create policy munkak_tenant on munkak
  using (ceg_id = aktualis_ceg())
  with check (ceg_id = aktualis_ceg());

grant select, insert, update, delete on munkak to cegem_app;
grant select, insert, update, delete on munkak to authenticated;

create index on munkak (ceg_id, allapot, hatarido);
