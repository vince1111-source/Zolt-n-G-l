# CÉGEM.AI — projektutasítások Claude Code-nak

Ez a fájl minden munkamenet elején betöltődik. A teljes háttér a `HANDOVER.md`-ben van — **olvasd el, mielőtt bármit építesz.**

## Mi ez

Magyar nyelvű AI vállalkozói asszisztens kisvállalkozásoknak. Elv: *„Mondd el, mit intézzek el helyettem.”* Első célcsoport: térkövező / kivitelező kisvállalkozás.

## Nyelv

- **A felhasználóval és minden felületi szövegben magyarul.** Vince magyar anyanyelvű.
- Kód, változónevek, commit üzenetek: magyar ékezet nélkül vagy angolul — de **következetesen**. A jelenlegi prototípus magyar, ékezet nélküli azonosítókat használ (`partnerek`, `arlista`, `ajanlat_tetelek`).
- Adatbázis-mezőnevek: magyar, ékezet nélkül (`adoszam`, `hatarido`, `netto`).

## Sarkalatos szabályok — ezektől ne térj el kérdés nélkül

1. **Jóváhagyási kapu az adatmodellben, nem a felületen.** Minden külső hatású művelet (e-mail, ajánlatkiküldés, felszólítás, utalási javaslat) állapotgépen megy át: `javasolt → jóváhagyott → végrehajtott` (mellékág: `kihagyott`, `elvetett`). **Ez már benne van az első migrációban** (`db/migraciok/0001_alap.sql`), triggerrel őrizve — ha hozzányúlsz, a `db/futtat.sh` tesztjeinek utána is zöldnek kell lenniük.
2. **Minden AI-művelet naplózva.** Mit látott a modell, mit javasolt, mit hagyott jóvá a felhasználó, mikor. Ez nem opcionális: felelősségi és AI Act-követelmény.
3. **Multi-tenant izoláció adatbázis-szinten** (PostgreSQL RLS), nem alkalmazáslogikában.
4. **Számlázást nem építünk**, integrálunk (Számlázz.hu Számla Agent vagy Billingo).
5. **Minden AI által kiolvasott adat mellett látszódjon a forrás**, és legyen egy kattintással javítható. Bizonytalanság esetén az AI kérdezzen, ne találgasson.
6. **AI Act 50. cikk**: a felületen egyértelműen jelezni kell, hogy AI-val beszél a felhasználó.
7. **Jogi tartalomnál** (15. modul) a szóhasználat „kivonat és figyelemfelhívás”, soha nem „elemzés” vagy „vélemény”; a felelősségkorlátozás magán a funkción jelenjen meg.

## Hol tartunk

**0. fázis — a mérések nyitottak, de a mag már épül.**

Kész és **bizonyítottan működik** (mindegyik futtatható, lásd a HANDOVER 0. fejezetét):

| Mi | Hol | Ellenőrzés |
|---|---|---|
| Adatbázis-séma RLS-sel és a jóváhagyási kapuval | `db/` | `./db/futtat.sh` → 22 állítás |
| Determinisztikus árkalkuláció | `mag/` | `node --test mag/*.teszt.mjs` → 12 teszt |
| Telefon-első prototípus | `prototype/CEGEM-AI-telefon.html` | `node prototype/fustproba.mjs` → 77 ellenőrzés |
| Fejlesztői specifikáció | `docs/fejlesztoi-specifikacio.md` | Word és PDF a `docs/kiadas/` mappában |

**Az eredeti „semmit ne építs a mérések előtt" szabály árnyalódott:** a mag séma és
az árkalkuláció minden spike-kimenetel mellett ugyanaz, ezért elkészültek. Ami a
mérésektől függ, az a 6. modul mérete és a hang szerepe — **azokba ne kezdj bele**,
amíg nincs eredmény.

A mérőeszközök készen állnak; ami hiányzik, az adat és hozzáférés — ezt Vince tudja
megadni, nem az AI:

| # | Kérdés | Eszköz | Mire vár |
|---|---|---|---|
| 1 | Működik-e a NAV `queryInvoiceDigest` INBOUND lekérdezés? | `spike/nav/` | NAV technikai felhasználó regisztrációjára |
| 2 | Mennyire pontos a magyar számlaolvasás? | `spike/szamlaolvasas/` | 50–100 valódi számlára + API kulcsra |
| 3 | Használható-e a magyar hangfelismerés valós zajban? | `spike/hang/` | 20 perc mérésre Chrome-ban |
| 4 | Mennyibe kerül havonta a parancsfelismerés? | `spike/parancs/` | a 0. réteg mérve, az 1. réteghez API kulcs kell |

A 2. spike fő mérőszáma nem a nyers pontosság, hanem a **csendes hiba**: rossz érték,
amit a modell nem jelölt be. A 3. spike fő mérőszáma nem a WER, hanem a
**szándékpontosság** — hogy a helyes művelet indul-e el.

Az eredményeket a `spike/eredmenyek/EREDMENY-SABLON.md` másolatába kell írni.

**A hangot a tulajdonos egyelőre félretette** („lehet plugin, majd kitaláljuk") —
ne ez legyen a következő fejlesztési irány, de a mérőeszköz készen áll.

A következő fejlesztői lépések sorrendje a HANDOVER 8. fejezetében van.

## Tervezett stack

Next.js / TypeScript **telepíthető PWA-ként** (webapp, nem natív alkalmazás) ·
Supabase (PostgreSQL + RLS, EU-s régió) · **lépcsős AI-réteg** · HTML→PDF a
dokumentumokhoz · Számlázz.hu vagy Billingo API · beszédfelismerés bekötve
(böngésző + felhőszolgáltató tartalék).

## Célfelhasználó: helyszínen dolgozó, nem irodában

Telefon, egy kéz, napfény, por, kesztyű, gyenge térerő, zaj. Ebből:
**telefon-első felület**, min. 56 px célfelületek, erős kontraszt, nyomva-tartós
mikrofon (nem folyamatos figyelés), offline váz. Az asztali nézet a származtatott.

## Költségszabály — a lépcsős AI

A felhasználónkénti AI-költséget nem a modellválasztás dönti el, hanem a hívások
száma. Három réteg, ebben a sorrendben:

```
0. réteg  determinisztikus mintaillesztés   0 Ft, azonnali, offline is
1. réteg  olcsó modell, zárt sémával        csak amit a 0. nem kezelt
2. réteg  erős modell                       csak nyílt feladatra
```

- Új parancsot **először a 0. rétegbe** vegyél fel (`spike/parancs/reteg0.mjs`),
  és csak akkor hagyd modellre, ha a megfogalmazás tényleg változatos.
- Bizonytalanság esetén a 0. réteg **továbbad**, nem találgat.
- **A modell megért, nem számol.** Az árkalkuláció determinisztikus kód:
  `mag/arkalkulacio.mjs`, tesztekkel. Ha hozzányúlsz, `node --test mag/*.teszt.mjs`.
- A napi összefoglaló naponta egyszer generálódik és tárolódik.
- A beszélgetéshossznak legyen kontextus-plafonja.

## Amit bekötünk, nem megírunk

Számlázás, beszédfelismerés, belépés/tárolás (Supabase), naptár (V1), bank (V2).
**Saját marad:** az AI-réteg, a jóváhagyási kapu és az AI napló, az árréses
árlista, és a helyszíni felület. A részletes indoklás: `docs/iranyvaltas.md`.

## MVP scope

Modulok: **1, 2, 3, 11, 12, 13, 14** — és **6 feltételesen** (csak ha az 1. spike
zöld; különben V1). A mag a 13+14 (ajánlatkészítés + árlista). A 10. (e-mail) és
16. (ügynök) modul V2 — ne kezdd el korábban.

## Mappaszerkezet

```
HANDOVER.md                       teljes projektátadás — olvasd el elsőként
CLAUDE.md                         ez a fájl
docs/megvalosithatosagi-terv.html megnyitható felmérés (nap- és költségbecslések)
docs/screenshots/                 a prototípus képernyőképei
docs/parancsok.md                 a prototípus felismert parancsai
docs/iranyvaltas.md               a 2026-08-26-i irányváltás és indoklása
docs/fejlesztoi-specifikacio.md   fejlesztői specifikáció (a forrás)
docs/kiadas/                      abból generált Word és PDF + a generátorok
prototype/CEGEM-AI-prototipus.html  asztali prototípus — önálló HTML, nincs build
prototype/artifact-body.html      ugyanaz Artifact-publikáláshoz (burok nélkül)
prototype/CEGEM-AI-telefon.html   telefon-első prototípus (az irányváltás után ez a fő irány)
prototype/telefon-artifact-body.html  ugyanaz Artifact-publikáláshoz
mag/                              a termék magja: determinisztikus árkalkuláció + tesztek
db/                               adatbázis: séma, RLS, állapotgép + bizonyító tesztek
  migraciok/0001_alap.sql         az első migráció — a sarkalatos szabályokkal
  tesztek/                        22 állítás, ami bizonyítja is őket
  futtat.sh                       egy parancs: séma + tesztek
spike/                            0. fázis mérőeszközei — lásd spike/README.md
  nav/                            NAV bejövő számla lekérdezés (1. kérdés)
  szamlaolvasas/                  kiolvasási pontosság mérése (2. kérdés)
  hang/                           magyar hangfelismerés mérése (3. kérdés)
  parancs/                        lépcsős parancsfelismerés költsége (4. kérdés)
  eredmenyek/                     ide kerülnek a riportok és a döntési lap
```

A `spike/` nem termékkód, és nem is válik azzá: egyszeri méréshez készült.
Valódi ügyféladat (számla, NAV-válasz, hangfelvétel, `.env`) nem kerülhet a repóba —
a `spike/.gitignore` ezt kizárja.

## A két prototípus

- **`prototype/CEGEM-AI-telefon.html`** — a **fő irány** az irányváltás óta.
  Telefon-első: nyomva tartós mikrofon, 56 px célfelületek, napfény üzemmód,
  teljes képernyős jóváhagyó lapok (egy képernyő = egy döntés). A 0. réteg
  felismerője beépítve, és a válasz alatt látszik, melyik réteg felelt.
  Tartalmazza a számla fotózását megerősítő folyamattal (minden kiolvasott
  adat mellett ott van, honnan jött, a bizonytalanok megjelölve), az offline
  sort, és a partnerlistát.
- **`prototype/CEGEM-AI-prototipus.html`** — az asztali változat. Mind a 16
  modult mutatja, ezért bemutatóra továbbra is hasznos; a fejlesztés iránya
  viszont már nem ez.

Mindkettő ugyanazt az árlistát és ugyanazt a végösszeget adja ugyanarra a
parancsra (800 m² Kovács Építő Kft. → 12 485 922 Ft bruttó) — ha az egyiket
módosítod, a másikat is igazítsd, különben a demó két különböző számot mond.

## A prototípus módosítása

Egyetlen fájl, nincs build. A szándékfelismerő a `handle(text, fromVoice)` függvény: új parancshoz tegyél egy `if(/minta/.test(t)){ ... }` ágat a fallback elé, és vedd fel a `CHIPS` tömbbe.

Az „AI” benne **determinisztikus regex-alapú szándékfelismerő, nem LLM** — demóra jó, termékbe nem.

Módosítás után futtasd le a füstpróbát:

```bash
npm i playwright && npx playwright install chromium
node prototype/fustproba.mjs
```

Ez a telefonos prototípust járja végig: ajánlat jóváhagyással, számlarögzítés
megerősítő folyamattal, végigvezetés, offline sor, világos/sötét/napfény
megjelenés, 390 px szélesség, vízszintes túlcsordulás és 44 px alatti
célfelületek. Az asztali prototípushoz nincs külön szkript — ott a 9
példaparancsot és a jóváhagyási folyamatot kézzel nézd át.

## Amit ne csinálj

- Ne javasold mind a 16 modul egyszerre való megépítését — 350–500 fejlesztői nap.
- Ne kezdj Gmail-integrációba: a CASA átvizsgálás hónapokat vesz igénybe, ez V2.
- Ne írj saját számlázómotort.
- Ne pozicionáld CRM-ként vagy számlázóként — a megkülönböztetés kizárólag az AI-réteg.
- Ne használj `localStorage`-ot a beszélgetésbe küldött HTML-fájlokban.
