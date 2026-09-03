-- CÉGEM.AI — Számla-lánc: kapcsolat az ajánlathoz.
--
-- Elfogadott ajánlat → "Számla kiállítása" gomb → a jóváhagyási kapun át
-- (`javasolt_muveletek`, tipus='szamla_kiallitas', 0017) → valódi `szamlak`
-- sor. A `forras='szimulalt'` (szintén 0017) jelzi a felületen és az
-- adatban is, hogy amíg nincs választott számlázó szolgáltató (Számlázz.hu
-- vagy Billingo) és API-kulcs, ez nem valódi számla — ugyanaz az 5.
-- sarkalatos szabály, ami a telefonos prototípus Billingo-szimulációját is
-- vezette.
--
-- Az `unique` index (részleges, csak nem-null-ra) adja az idempotenciát:
-- egy ajánlatból legfeljebb egy számla jön létre automatikusan, akkor is,
-- ha a "Számla kiállítása" gomb kattintása valamiért kétszer futna le —
-- ugyanaz a minta, mint a `munkak.ajanlat_id` egyedi megkötése (0004).

alter table szamlak add column ajanlat_id uuid references ajanlatok(id);

create unique index szamlak_ajanlat_id_idx on szamlak (ajanlat_id) where ajanlat_id is not null;
