-- CÉGEM.AI — Partner weboldal/katalógus linkje.
--
-- Vince kérése: a nagykereskedőknél legyen elérhető a saját weboldaluk/
-- online katalógusuk linkje. TUDATOSAN NEM böngészés/keresés a mi
-- felületünkön belül — a docs/termekvizio-2026-08-31.md 16. szakasza és a
-- nagyker-modul saját tervezési döntése is kizárja az automatikus webes
-- árkaparást/idegen oldal beágyazását (jogi/ToS-kockázat, és az oldaluk
-- bármikor változhat alattunk) — ez csak egy kényelmi kilépő link.

alter table partnerek add column weboldal text;

comment on column partnerek.weboldal is
  'Kényelmi link a partner (pl. nagykereskedő) saját weboldalára/online katalógusára — nem beágyazott böngészés, csak egy kattintható URL.';
