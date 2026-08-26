# CÉGEM.AI — projektutasítások Claude Code-nak

Ez a fájl minden munkamenet elején betöltődik. A teljes háttér a `HANDOVER.md`-ben van — **olvasd el, mielőtt bármit építesz.**

## Mi ez

Magyar nyelvű AI vállalkozói asszisztens kisvállalkozásoknak. Elv: *„Mondd el, mit intézzek el helyettem.”* Első célcsoport: térkövező / kivitelező kisvállalkozás.

## Nyelv

- **A felhasználóval és minden felületi szövegben magyarul.** Vince magyar anyanyelvű.
- Kód, változónevek, commit üzenetek: magyar ékezet nélkül vagy angolul — de **következetesen**. A jelenlegi prototípus magyar, ékezet nélküli azonosítókat használ (`partnerek`, `arlista`, `ajanlat_tetelek`).
- Adatbázis-mezőnevek: magyar, ékezet nélkül (`adoszam`, `hatarido`, `netto`).

## Sarkalatos szabályok — ezektől ne térj el kérdés nélkül

1. **Jóváhagyási kapu az adatmodellben, nem a felületen.** Minden külső hatású művelet (e-mail, ajánlatkiküldés, felszólítás, utalási javaslat) állapotgépen megy át: `javasolt → jóváhagyott → végrehajtott` (mellékág: `kihagyott`, `elvetett`). Ez az első migrációba kerül.
2. **Minden AI-művelet naplózva.** Mit látott a modell, mit javasolt, mit hagyott jóvá a felhasználó, mikor. Ez nem opcionális: felelősségi és AI Act-követelmény.
3. **Multi-tenant izoláció adatbázis-szinten** (PostgreSQL RLS), nem alkalmazáslogikában.
4. **Számlázást nem építünk**, integrálunk (Számlázz.hu Számla Agent vagy Billingo).
5. **Minden AI által kiolvasott adat mellett látszódjon a forrás**, és legyen egy kattintással javítható. Bizonytalanság esetén az AI kérdezzen, ne találgasson.
6. **AI Act 50. cikk**: a felületen egyértelműen jelezni kell, hogy AI-val beszél a felhasználó.
7. **Jogi tartalomnál** (15. modul) a szóhasználat „kivonat és figyelemfelhívás”, soha nem „elemzés” vagy „vélemény”; a felelősségkorlátozás magán a funkción jelenjen meg.

## Hol tartunk

**0. fázis — Spike.** A prototípus kész (`prototype/CEGEM-AI-prototipus.html`). A következő három kérdés eldöntése kód előtt:

1. Működik-e a NAV `queryInvoiceDigest` INBOUND lekérdezés saját technikai felhasználóval?
2. Mennyire pontos a magyar számlaolvasás 50–100 valódi számlán?
3. Használható-e a magyar hangfelismerés valós zajban?

Ne kezdj MVP-fejlesztésbe, amíg ezek nyitottak — a válaszuk megváltoztatja a scope-ot.

## Tervezett stack

Next.js / TypeScript · Supabase (PostgreSQL + RLS, EU-s régió) · Claude eszközhívással · HTML→PDF a dokumentumokhoz · Számlázz.hu vagy Billingo API.

## MVP scope

Modulok: **1, 2, 3, 6, 11, 12, 13, 14.** A mag a 13+14 (ajánlatkészítés + árlista). A 10. (e-mail) és 16. (ügynök) modul V2 — ne kezdd el korábban.

## Mappaszerkezet

```
HANDOVER.md                       teljes projektátadás — olvasd el elsőként
CLAUDE.md                         ez a fájl
docs/megvalosithatosagi-terv.html megnyitható felmérés (nap- és költségbecslések)
docs/screenshots/                 a prototípus képernyőképei
prototype/CEGEM-AI-prototipus.html  önálló HTML, nincs build
prototype/artifact-body.html      ugyanaz Artifact-publikáláshoz (burok nélkül)
```

## A prototípus módosítása

Egyetlen fájl, nincs build. A szándékfelismerő a `handle(text, fromVoice)` függvény: új parancshoz tegyél egy `if(/minta/.test(t)){ ... }` ágat a fallback elé, és vedd fel a `CHIPS` tömbbe.

Az „AI” benne **determinisztikus regex-alapú szándékfelismerő, nem LLM** — demóra jó, termékbe nem.

Módosítás után futtasd le a füstpróbát (Playwright, `npm i playwright`): mind a 9 példaparancs, a jóváhagyási folyamat, világos + sötét téma, 390 px mobil, vízszintes túlcsordulás.

## Amit ne csinálj

- Ne javasold mind a 16 modul egyszerre való megépítését — 350–500 fejlesztői nap.
- Ne kezdj Gmail-integrációba: a CASA átvizsgálás hónapokat vesz igénybe, ez V2.
- Ne írj saját számlázómotort.
- Ne pozicionáld CRM-ként vagy számlázóként — a megkülönböztetés kizárólag az AI-réteg.
- Ne használj `localStorage`-ot a beszélgetésbe küldött HTML-fájlokban.
