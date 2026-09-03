-- CÉGEM.AI — a 0008-as javítás korrekciója.
--
-- A 0008_felhasznalo_szerep_vedelem.sql column-level REVOKE-ot próbált
-- (`revoke update (szerep, ceg_id) on felhasznalok from authenticated`),
-- de ez Postgres-ben NEM érvényesül, ha már létezik egy szélesebb,
-- TÁBLA-szintű UPDATE grant (a 0002_auth_kotes.sql-ből, `grant select,
-- insert, update, delete on felhasznalok to authenticated`) — a
-- tábla-szintű jog minden oszlopra kiterjed, és egy oszlop-szintű REVOKE
-- ezt nem szűkíti. Ellenőrizve: `information_schema.column_privileges`
-- a 0008 után is UPDATE-et mutatott `szerep`/`ceg_id`-re.
--
-- A helyes minta: a tábla-szintű UPDATE-et teljesen megvonjuk, majd
-- (ha valaha szükség lesz rá) oszlop-szintű UPDATE grant-tal nyitjuk meg
-- kifejezetten azokat az oszlopokat, amiket egy kliens-oldali hívásnak
-- valóban módosítania kell. Ma egyetlen webapp-kód sem ír UPDATE-tel a
-- `felhasznalok` táblára (ellenőrizve), ezért a teljes megvonás semmit
-- nem tör el — minden jövőbeli szerepkör-/cégváltás SECURITY DEFINER
-- RPC-n megy majd, ami a saját, ellenőrzött oldaláról ír, nem a kliens
-- közvetlen UPDATE-jével.

revoke update on felhasznalok from authenticated;
revoke update on felhasznalok from cegem_app;
