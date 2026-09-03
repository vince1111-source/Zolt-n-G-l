-- CÉGEM.AI — a `felhasznalok.szerep` és `ceg_id` oszlopok védelme.
--
-- Ellenséges biztonsági felülvizsgálat (a könyvelői szerepkör tervezésekor,
-- lásd HANDOVER.md) egy VALÓS, már ma is fennálló jogosultság-eszkalációs
-- rést talált: a `felhasznalok` táblán a meglévő tenant-policy
-- (`using (ceg_id = aktualis_ceg())`) csak a SORT (melyik cég) védi, az
-- OSZLOPOT nem — egy bejelentkezett `munkatars` egyetlen sima PostgREST
-- hívással
--
--   PATCH /felhasznalok?id=eq.<sajat_id>   { "szerep": "tulajdonos" }
--
-- saját magát tulajdonossá tudná léptetni, mert a `ceg_id` nem változik
-- (a USING/WITH CHECK mindkét oldalon átmegy), és semmi más nem tiltja a
-- `szerep` mező önálló módosítását.
--
-- A javítás: a `szerep` és `ceg_id` oszlopok UPDATE-joga megvonva az
-- `authenticated` szereptől — ezen oszlopok módosítása mostantól KIZÁRÓLAG
-- SECURITY DEFINER RPC-n keresztül lehetséges (pl. a jövőbeli könyvelő-
-- meghívás vagy egy leendő "szerepkör-váltás" funkció), ami a hívó jogát a
-- saját, ellenőrzött oldalán vizsgálja, nem a kliens állítja be szabadon.
--
-- Ellenőrizve: a webapp jelenleg sehol nem ír UPDATE-tel a `felhasznalok`
-- táblára (`grep -rn '"felhasznalok"' webapp/src` nem talált insert/update
-- hívást) — ez a szigorítás semmit nem tör el.

revoke update (szerep, ceg_id) on felhasznalok from authenticated;
revoke update (szerep, ceg_id) on felhasznalok from cegem_app;
