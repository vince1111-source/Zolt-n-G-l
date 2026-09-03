-- CÉGEM.AI — Számla-lánc előkészítése: két új enum-érték.
--
-- Ez a migráció SZÁNDÉKOSAN csak enum-bővítés, semmi mást nem csinál —
-- a Postgres nem engedi egy `alter type ... add value` által felvett
-- értéket UGYANABBAN a tranzakcióban felhasználni (pl. egy insertben),
-- amiben létrejött. A 0007-es migráció (`arfrissites` érték) ugyanezért
-- volt önálló, más lépés nélküli fájl.
--
-- `szamla_kiallitas` — az elfogadott ajánlatból induló, jóváhagyási
-- kapun átmenő számla-lánc művelet-típusa (lásd 0018).
-- `szimulalt` — az 5. sarkalatos szabály ("látszódjon a forrás") szerint:
-- amíg nincs választott számlázó szolgáltató (Számlázz.hu vagy Billingo)
-- és valós API-kulcs, a kiállított "számla" szimulált — ezt az adatforrás
-- mezőn keresztül a felület is ki tudja mondani, nem csak elhallgatja.

alter type muvelet_tipus add value 'szamla_kiallitas';
alter type adat_forras add value 'szimulalt';
