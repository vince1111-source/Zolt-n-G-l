-- CÉGEM.AI — munkacsomag-tételek: a területtel VAGY a kerülettel arányos
-- mennyiség.
--
-- A 0019-es csomag minden tételt a terület (pl. m²) egyenes arányában
-- számolt. A szegély viszont a kerülettel arányos, ami NEM egyenes arány a
-- területtel: 50 m²-hez ~30 fm, 800 m²-hez ~115 fm tartozik. Enélkül a
-- hangos ajánlat ("50 m²-re") vagy kihagyta a szegélyt, vagy rossz
-- mennyiséget adott volna — egy térkövező ezt első ránézésre észreveszi.
--
-- A kerület becslése ugyanaz a determinisztikus függvény, amit a prototípus
-- és a mag is használ (`mag/arkalkulacio.mjs` keruletBecsles: négyzet alakú
-- területet feltételez, 5 fm-re kerekít), és az ajánlaton feltételezésként
-- megjelenik, hogy a vállalkozó a piszkozatban módosíthassa.
--
-- Bővítő módosítás: az alapérték 'terulet', így a régi kód és a meglévő
-- csomagok változatlanul működnek.

alter table munkacsomag_tetelek
  add column alap text not null default 'terulet'
  constraint munkacsomag_tetel_alap check (alap in ('terulet', 'kerulet'));
