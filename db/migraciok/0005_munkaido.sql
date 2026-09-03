-- CÉGEM.AI — Munkaidő-kalkuláció.
--
-- docs/termekvizio-2026-08-31.md 17-18. szakasz: a vállalkozó opcionálisan
-- megadhat egy normaidőt egy árlistatételhez ("10 m² festés = 30 perc/réteg"
-- → 3 perc / m² / menet), és az ajánlat tétel mennyiségéből a rendszer
-- (nem a modell) kiszámolja a becsült munkaidőt.
--
-- Szándékosan NINCS alapértelmezett normaidő egyetlen tételen sem, és
-- semmilyen szakmai norma nincs beégetve ide: egy kitalált érték rosszabb,
-- mint egy látható hiányzó mező (ugyanaz az elv, mint a munkak.cim/hatarido
-- NULL-jánál, lásd 0004_munkak.sql és HANDOVER.md 2.2).

-- A normaidő az árlista tulajdonsága: 1 mértékegységnyi munka becsült
-- ideje percben, EGY menetben/rétegben. Nullable — sok tételnél (pl. tiszta
-- anyagtétel) soha nem lesz kitöltve, és ez helyes, nem hiányos állapot.
alter table termekek
  add column normaido_perc_egyseg numeric(10,2)
    constraint termekek_normaido_pozitiv
      check (normaido_perc_egyseg is null or normaido_perc_egyseg > 0);

comment on column termekek.normaido_perc_egyseg is
  'Becsült munkaidő percben, 1 mértékegységnyi munkához, egy menetben/rétegben (pl. 1 m² festéshez). NULL = nincs megadva.';

-- Az ajánlat tétel szintjén két új, egymástól független mező:
--   - munkaido_szorzo: KIZÁRÓLAG a munkaidőt szorozza (pl. hány menetben/
--     rétegben kell elvégezni) — az anyagmennyiséget és az árat nem érinti.
--   - munkaido_perc: a kiadáskori becsült munkaidő, MÁSOLATKÉNT eltárolva —
--     ugyanaz az elv, mint az `egysegar`-nál: az árlista normaidőjének
--     későbbi módosítása nem írhatja át egy már kiadott ajánlat idejét.
alter table ajanlat_tetelek
  add column munkaido_szorzo numeric(6,2) not null default 1
    constraint ajanlat_tetelek_munkaido_szorzo_pozitiv check (munkaido_szorzo > 0),
  add column munkaido_perc integer
    constraint ajanlat_tetelek_munkaido_perc_nemnegativ
      check (munkaido_perc is null or munkaido_perc >= 0);

comment on column ajanlat_tetelek.munkaido_szorzo is
  'Munkaidő-only szorzó (pl. rétegek/menetek száma). Nem szorozza az anyagmennyiséget vagy a nettó árat.';
comment on column ajanlat_tetelek.munkaido_perc is
  'A kiadáskori becsült munkaidő percben — másolat, mint az egysegar. NULL, ha a tételhez választott terméknél nem volt megadva normaidő.';
