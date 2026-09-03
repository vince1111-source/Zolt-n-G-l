-- CÉGEM.AI — a `konyvelo` érték felvétele a `felhasznalo_szerep` enumba.
--
-- Önálló migrációban, mert egy újonnan felvett enum-értéket ugyanabban a
-- tranzakcióban, amiben létrejött, biztonságosan nem lehet felhasználni —
-- ez a következő migrációban (0011) történik.

alter type felhasznalo_szerep add value 'konyvelo';
