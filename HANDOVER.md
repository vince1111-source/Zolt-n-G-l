# CÉGEM.AI — projektátadás

**Frissítve:** 2026. augusztus 31. · **Tulajdonos:** Vince
**Ág:** `claude/projekt-folytatasa-p0titv` · **Repó:** `vince1111-source/Zolt-n-G-l`

> Ez a dokumentum önmagában elegendő ahhoz, hogy a projektet egy friss Claude Code
> munkamenet folytatni tudja. Nem feltételez semmit korábbi beszélgetésből.

---

## 0. Gyorsindítás

```bash
# 1. Nézd meg, mi van kész, és hogy tényleg működik-e
node --test mag/*.teszt.mjs        # 43 teszt — árkalkuláció, fizetési határidő, kintlévőség, AI-eszközök
./db/futtat.sh                     # 22 állítás — a sarkalatos szabályok (PostgreSQL kell)
cd spike && node parancs/merd.mjs  # a lépcsős parancsfelismerés mérése

# 2. Nézd meg a terméket (telefonon a legjobb, Chrome-ban)
xdg-open prototype/CEGEM-AI-telefon.html

# 3. Olvasd el, ebben a sorrendben
#    CLAUDE.md                     — a szabályok, minden munkamenet elején betöltődik
#    docs/iranyvaltas.md           — a legfrissebb irány és indoklása
#    docs/fejlesztoi-specifikacio.md — a részletes követelmények
```

**A `db/futtat.sh`-hoz fut PostgreSQL kell.** Ha nincs, a séma és a tesztek
akkor is olvashatók; a bizonyításhoz viszont el kell indítani egyet
(`initdb` + `pg_ctl`, lásd `db/README.md`).

### Az első mondat, amivel a munkamenetet érdemes indítani

> Olvasd el a HANDOVER.md-t és a CLAUDE.md-t, majd futtasd le a három
> ellenőrzést a 0. fejezetből. Utána [ide jön a feladat].

---

## 1. Mi ez a projekt

Magyar nyelvű AI vállalkozói asszisztens kisvállalkozásoknak. Központi elv:

> **„Mondd el, mit intézzek el helyettem."**

A vállalkozó ne menüt tanuljon, hanem természetes magyar nyelven mondja meg, mit
szeretne. A rendszer ismeri a cég adatait, partnereit, árait, számláit és
határidőit, és a napi adminisztrációt előkészíti vagy jóváhagyás után elvégzi.

**A kritikus alapelv, ami az egész architektúrát meghatározza:** pénzügyi,
kommunikációs vagy más külső hatású műveletet az AI **soha nem hajt végre
automatikusan**. Megmutatja, mit készül tenni, és egyértelmű jóváhagyást kér.

### A célfelhasználó

**Építőiparban dolgozó ember, nem irodai ügyintéző.** Első célcsoport: térkövező
/ kivitelező kisvállalkozás.

| Körülmény | Következmény a termékre |
|---|---|
| Telefon, egy kéz | Egykezes elérés, a fő művelet hüvelykujjal elérhető |
| Kesztyű | Minimum **56 px** célfelület |
| Tűző nap | Erős kontraszt + külön napfény üzemmód |
| Építkezési zaj | Nyomva tartós mikrofon, nem folyamatos figyelés |
| Gyenge térerő | Offline váz, sorba állított műveletek |
| Nincs ideje menüzni | Kevés képernyő, **egy képernyő = egy döntés** |

**Webapp, nem natív alkalmazás** — telepíthető PWA. Ez a felhasználó döntése volt,
és jó döntés: nincs app store-súrlódás, a frissítés azonnali, a kamera és a
mikrofon elérhető a böngészőből.

### Amivel nem versenyzünk

A magyar piacon a részfunkciókra van szereplő (Számlázz.hu, Billingo, MiniCRM,
Kulcs-Soft). **A megkülönböztetés kizárólag az AI-réteg.** A terméket nem szabad
CRM-ként vagy számlázóként pozicionálni.

---

## 2. Hol tartunk most

**0. fázis — a spike-mérések még nyitottak, de a mag már épül.**

Ami eredetileg úgy szólt, hogy „semmit ne építs a mérések előtt", időközben
árnyalódott: kiderült, hogy a **mag séma és az árkalkuláció minden spike-kimenetel
mellett ugyanaz**, ezért ezek elkészültek és bizonyítottan működnek. Ami a
mérésektől függ, az a 6. modul mérete és a hang szerepe — az még nyitott.

### Ami kész és bizonyított

| Mi | Hol | Bizonyíték |
|---|---|---|
| **Adatbázis-séma** RLS-sel és a jóváhagyási kapuval | `db/` | `./db/futtat.sh` → 22 állítás zöld |
| **Mag** — árkalkuláció, fizetési határidő, kintlévőség, AI-eszközkészlet | `mag/` | `node --test mag/*.teszt.mjs` → 43 teszt zöld |
| **Telefon-első prototípus** | `prototype/CEGEM-AI-telefon.html` | `node prototype/fustproba.mjs` → 129 ellenőrzés zöld |
| Asztali prototípus (mind a 16 modul) | `prototype/CEGEM-AI-prototipus.html` | kézzel átnézve |
| **Árréses árlista + nagyker** (beszerzési ár, árrés, fedezet) | a telefonos prototípusban | a füstpróba külön szakasza |
| **Munkák + fotódokumentáció** | ugyanott | a füstpróba külön szakasza |
| **Ajánlat → díjbekérő → számla lánc** (Billingo, szimulálva) | ugyanott | a füstpróba külön szakasza |
| **Valódi backend** (Next.js + Supabase, hitelesítéssel, éles adatbázissal) | `webapp/` | `npm run build --prefix webapp` zöld; lásd lentebb |
| **„Ma" kezdőképernyő + szöveges AI-doboz** (valós DB-írással, 0. réteg) | `webapp/` | lásd 2.1. fejezet |
| **Munkák** — elfogadott ajánlatból automatikusan, DB-szintű idempotenciával | `webapp/`, `db/migraciok/0004_munkak.sql` | lásd 2.2. fejezet |
| **Munkaidő-kalkuláció, Naptár, Nagyker, Könyvelői szerepkör** | `webapp/`, `db/migraciok/0005-0011` | lásd 2.4. fejezet — a könyvelői résznél komoly biztonsági tanulsággal |
| **Fejlesztői specifikáció** | `docs/fejlesztoi-specifikacio.md` + Word/PDF | — |
| **Új termékvízió** (2026-08-31, mobil-első napi asszisztens) | `docs/termekvizio-2026-08-31.md` | lásd 2.1. fejezet |
| Spike mérőeszközök (4 db) | `spike/` | a 4. spike 0. rétege mérve |
| Demó forgatókönyv | `docs/demo-forgatokonyv.md` | — |

### Ami mérésre vár (Vince adatai kellenek)

| # | Kérdés | Eszköz | Mi hiányzik |
|---|---|---|---|
| 1 | Működik a NAV `queryInvoiceDigest` INBOUND? | `spike/nav/` | technikai felhasználó (1–3 hét átfutás) |
| 2 | Milyen pontos a magyar számlaolvasás? | `spike/szamlaolvasas/` | 50–100 valódi számla + API kulcs |
| 3 | Használható a magyar hangfelismerés zajban? | `spike/hang/` | 20 perc mérés Chrome-ban |
| 4 | Mennyibe kerül havonta az AI? | `spike/parancs/` | a 0. réteg mérve; az 1. réteghez API kulcs |

**A hangot a tulajdonos egyelőre félretette** — „lehet plugin, majd kitaláljuk".
Ne ez legyen a következő fejlesztési irány, de a mérőeszköz készen áll.

### Mit tud ma a telefonos prototípus

Ez már nem képernyőterv: a felsoroltak **működnek**, adatot írnak, és a
változás megmarad a böngészőben (localStorage, try/catch mögött — ha a
böngésző tiltja, a demó attól még hibátlanul megy, csak felejt).

| Terület | Mit tud |
|---|---|
| **Ajánlat** | Parancsból bármelyik partnernek, bármekkora felületre. Feltételezés-sáv, tételek az árlistából, módosítás beszédből, jóváhagyási kapu. |
| **Ügyfél-dokumentum** | „Így látja az ügyfél" — cégfejléces árajánlat, érvényességgel és fizetési feltétellel; **Nyomtatás / PDF** valódi PDF-et ad. |
| **Ajánlatok sorsa** | Kiküldve / nincs válasz / elfogadva / elutasítva. A „nincs válasz" utánkövetési teendővé válik. |
| **Lánc a pénzig** | Elfogadott ajánlatból előleg-díjbekérő (bruttó 40%), majd számla — Billingo `proforma` + `create-from-proforma`, **szimulálva**, kapuval és naplóval. |
| **Munkák** | Helyszín, partner, m², határidő, állapot (előkészítés → folyamatban → befejezve), kapcsolódó ajánlat. |
| **Fotódokumentáció** | A munkához kötött, dátumozott fotók; új fotó a telefon kamerájából. |
| **Árréses árlista** | Minden tételnél beszerzési ár és **árrés**; a szerkesztő beszerzési árat is kezel, és szól, ha az eladási ár alá megy. |
| **Nagyker** | A szállító árlistája; **árfrissítés a jóváhagyási kapun**: a rendszer kiszámolja az új eladási árat az árrés tartásával, de nem vezeti át magától. |
| **Fedezet** | Az ajánlat jóváhagyó lapján, **csak a vállalkozónak** — a dokumentumra és a nyomtatásba sem kerül ki. Veszteségnél piros. |
| **Számlafotó** | Kamera, kiolvasott mezők forrásmegjelöléssel, a bizonytalanok megjelölve, **javíthatóan**; a javítás nyoma a naplóban. |
| **Partnerek, cégadatok** | Felvétel és szerkesztés; a felvett partner nevét a 0. réteg felismeri. |
| **Terep** | Offline sor (a művelet elkészül, a kiküldés vár), napfény üzemmód, 56 px célfelületek. |
| **AI napló** | Minden lépés: mit javasolt, mit hagytál jóvá, mikor. |

Amit **nem** tud, és ezt a felület ki is mondja: nincs valódi modellhívás (a
felismerő determinisztikus regex), a számlakiolvasás és a Billingo-hívás
szimulált, és semmi nem megy szerverre.

### A valódi backend — Next.js + Supabase, éles adatbázissal

Ez már nem váz: fut, valódi adatbázisba ír, és a biztonsági tanácsadó
szerint tiszta. A `webapp/` mappában van, indítás: `npm run dev --prefix webapp`
(vagy `cd webapp && npm run dev`), a kapcsolódási adatok mintája
`webapp/.env.local.example`.

| Terület | Mit tud |
|---|---|
| **Hitelesítés** | Supabase Auth — regisztráció (cég + felhasználó egy lépésben), bejelentkezés, e-mail-megerősítés. |
| **Cégprofil** | Szerkeszthető: név, adószám, székhely, bankszámla, elérhetőség. |
| **Partnerek** | Felvétel, szerkesztés, archiválás; kedvezmény, fizetési határidő, „szállító" jelölés. |
| **Árlista** | Beszerzési ár + eladási ár tételenként, számolt árrés. |
| **Ajánlatkészítés** | Partner + dinamikus tételsor; **az egységár mindig a szerver saját árlistájából jön**, sosem a kliens beküldött adatából. |
| **Ajánlat állapotgépe** | piszkozat → kiküldve → elfogadva/elutasítva. A kiküldés a `javasolt_muveletek` jóváhagyási kapun megy át (valódi, nem díszlet), a nyoma a lapon is látszik. |
| **Ügyfél-dokumentum** | Nyomtatható, cégfejléces előnézet, whitelist-alapú `@media print` szabállyal (csak a dokumentum mehet papírra). |
| **Teendők** | Felvétel, sürgősség, határidő, partnerhez köthető, kész/törölve. |
| **Sorszintű izoláció** | Minden lekérdezés a bejelentkezett felhasználó jogán fut (RLS) — nem alkalmazáslogikai szűréssel. |
| **„Ma" kezdőképernyő** | Köszöntés, függő ajánlat/nyitott teendő számláló, sürgős teendők, kintlévőség-doboz (`mag/kintlevoseg.mjs`-ből — lásd 2.1). |
| **Szöveges AI-doboz** | „Készíts ajánlatot X-nek Y m²-re" — 0. réteg regex-felismerés, valós partner/árlista-egyeztetés, „amit feltételeztem" jóváhagyó lap, jóváhagyás után **valódi** ajánlat jön létre. Lásd 2.1. |

Amit még nem tud: a terepi funkciók (számlafotó, munkák + fotódokumentáció,
nagyker árfrissítés, offline sor, hang) — ezek egyelőre csak a telefonos
prototípusban élnek, lásd 8.1. fejezet.

⚠ **Amit élesben magadnak kell kipróbálnod**: a regisztráció→e-mail-megerősítés
kört helyben nem tudtuk automatikusan végigmérni, mert a Supabase próba-
projekt beépített levélküldője szigorúan korlátozott (`email rate limit
exceeded`). Ez külső, ideiglenes korlát, nem hiba — egy valódi e-mail-címmel
végzett regisztráció végig fog menni.

### 2.1 2026-08-31 — új termékvízió, és az első valódi szelet belőle

Vince egy új, 60 szakaszos termékvíziós dokumentumot hozott
(`docs/termekvizio-2026-08-31.md`) — mobil-első napi asszisztens, „Ma"
kezdőképernyő, munkacsomagok, nagyker-katalógus, naptár-optimalizálás,
könyvelői szerepkör, teljes workflow ajánlattól a könyvelőig. Ez jóval
túlmutat a jelenlegi MVP-körön, és néhány ponton finomítja is a korábbi
irányt (pl. a naptár korábban „csak bekötjük" volt, itt egy komplex
optimalizáló motor szerepel — ez most **tervezett, ütemezett** irány, a
mérésfüggő pontok (hang, 6. modul) viszont változatlanul nyitva maradnak).

Közvetlen előzmény: Vince azt mondta a webappra „nem érzem a
kreativitást... nem hasznos jelen állapotában" — jogosan, mert a webapp
pontosan az „egyszerű CRM-érzetet" adta, amit mind a sarkalatos szabályok,
mind az új dokumentum tilt. Egy teljes audit (lásd a munkamenet-jegyzetet)
megerősítette: a `mag/`-ban már kész, tesztelt logika (`arkalkulacio.mjs`,
`anyagszukseglet.mjs`, `kintlevoseg.mjs`, `eszkozok.mjs`) **egyáltalán nem
volt bekötve** a webappba.

**Az első szelet, ami emiatt elkészült:**

- **Vizuális irány**: a zöld-domináns felület helyett világos, magas
  kontrasztú alap, egyetlen modern (kék) accent — `webapp/src/app/globals.css`.
  Megosztott UI-komponensek: `webapp/src/components/ui/` (Button, Card,
  Badge, EmptyState, SubmitButton) — eddig csak az új felületek és a két
  javított jelvény-inkonzisztencia használja, a többi oldal érintetlen.
- **„Ma" kezdőképernyő** (`webapp/src/app/(vedett)/page.tsx`): valós
  adatokra épül, és most **először köti be ténylegesen** a `mag/`-ot a
  webappba — a kintlévőség-dobozt `mag/kintlevoseg.mjs` számolja. A
  `szamlak` táblának ma nincs írója, ezért ez a doboz most üres/0 Ft-ot
  mutat — ez helyes, nem hiba, és pontosan jelzi a következő hiányzó
  láncszemet (számlázás bekötése).
- **Szöveges AI-doboz** (`webapp/src/components/AiBox.tsx` +
  `webapp/src/lib/szandek.ts`): a `prototype/CEGEM-AI-telefon.html`
  `SZANDEKOK`/`kezel()` mintájának TypeScript-portja, egyetlen végigvitt
  szándékkal — „Készíts ajánlatot [partnernek] [X] m²-re". Valós
  partner-egyeztetés, valós árlista-alapú számítás (`webapp/src/lib/
  ajanlat-szamitas.ts` — ez a kézi ajánlatűrlap ÉS az AI-doboz közös,
  kanonikus számítási pontja, itt kötöttük be a `mag/arkalkulacio.mjs`
  `osszesites`/`forintra` függvényeit is), „amit feltételeztem" jóváhagyó
  lap (`JovahagyoLap.tsx`, a prototípus `lap` mintájának portja), és csak
  jóváhagyás után jön létre a valódi ajánlat. Fel nem ismert mondatra
  őszinte választ ad („ezt helyben nem ismerem fel"), nem hív modellt —
  ez még mindig a 0. réteg, a CLAUDE.md lépcsős AI-elvének megfelelően.

**Amit ez a szelet tudatosan NEM tartalmaz** (a dokumentum P1/P2 pontjai,
mind vadonatúj adatmodellt igényelnek — az audit szerint egyikből sincs
még semmi): naptár/naptár-optimalizálás, munkacsomagok/assemblies,
nagyker-katalógus böngészés, könyvelői szerepkör, dokumentum-OCR, valódi
e-mail küldés, hangvezérlés, valódi LLM- (1./2. réteg) hívás.

⚠ **Egy dolgot NEM sikerült élesben, bejelentkezett munkamenettel
végigtesztelni**: a szándékfelismerő regex-logikáját külön Node-szkripttel
igen (helyesen ismeri fel a példamondatokat, és helyesen utasítja el az
irrelevánsakat), és a `npm run build --prefix webapp` is tiszta — de a
teljes böngészős kattintás-végigfuttatást (AI-doboz → jóváhagyó lap →
valódi DB-írás) nem lehetett elvégezni, mert a korábbi élő munkamenet
kijelentkezett, Vince jelszavát nem ismerjük, egy új teszt-regisztráció
pedig e-mail-megerősítést igényel, amihez nincs postafiók-hozzáférésünk.
**Ezt Vincének kell kipróbálnia elsőként.**

### 2.2 Ugyanaznap — 2. szelet: Munkák (elfogadott ajánlatból automatikusan)

A vízió-dokumentum „Wow #7"-e: *„Elfogadott ajánlat → projekt + naptár +
anyaglista automatikusan."* Ebből a szeletből a **munka** entitás készült
el — a naptár és az automatikus anyaglista-generálás külön, később
jóváhagyandó szelet marad.

- Új tábla és migráció: `db/migraciok/0004_munkak.sql` — `munkak` tábla
  (`allapot`: előkészítés/folyamatban/befejezve, szabadon oda-vissza
  váltható, **nem** megy a jóváhagyási kapun, mert belső nyilvántartás,
  nem külső hatású művelet), ugyanazzal az RLS-mintával, mint a többi
  tábla. Élesben alkalmazva, `get_advisors` tiszta, `types.ts` regenerálva.
- **`cim` és `hatarido` szándékosan NULLABLE**, és auto-létrehozáskor
  üresen maradnak — a munka helyszíne gyakran más, mint a partner
  számlázási címe, és nincs valós adat a határidőre. Egy tervező-agent
  kifejezetten erre a döntésre hívta fel a figyelmet: a hamisan
  kitöltöttnek tűnő mező rosszabb, mint egy látható üres mező.
- **Idempotencia DB-szinten, nem alkalmazáskódban**: `unique (ajanlat_id)`
  a `munkak` táblán — ha `ajanlatAllapotValtas` valamiért kétszer futna le
  ugyanarra az elfogadásra, a második `insert` `23505`-tel elbukik, amit
  az alkalmazás kód szándékosan idempotenciaként kezel, nem hibaként.
  **Élesben leteszteltem**: második insert ugyanarra az `ajanlat_id`-ra
  valóban `23505`-öt ad, két `null ajanlat_id`-jú kézi munka pedig
  egymás mellett is elfér (a Postgres a NULL-okat nem ütközteti).
- `webapp/src/app/(vedett)/ajanlatok/actions.ts` `ajanlatAllapotValtas`-a
  most, elfogadáskor, ezt a beszúrást is elvégzi — a partnert és a
  sorszámot mindig a frissen lekérdezett DB-sorból veszi, sosem a
  kliensből (ugyanaz az elv, mint az `ajanlatKikuldese` naplózásánál).
- Navigáció a vízió-dokumentum célszerkezete szerint igazítva („Ma |
  Munkák | Ajánlatok | Teendők | Több" — Árlista a Többe költözött, a
  Naptár egyelőre nincs, mert a tábla sem létezik még).
- ⚠ Ugyanaz a korlát áll fenn, mint a 2.1-ben: élő, bejelentkezett
  böngészős végigfuttatás (kézi munka létrehozása, állapotváltás, ajánlat
  elfogadása a felületen) nem történt meg — a DB-szintű viselkedést
  (beszúrás, idempotencia) közvetlen SQL-lel igen.

### 2.3 Ugyanaznap — 3. szelet: Utánkövetés (Wow #6, nincs új tábla)

A vízió-dokumentum "Wow #6"-a: *"Ezt az ajánlatot 4 napja nem válaszolták
meg → follow-up draft."* Ehhez **nem kellett új tábla** — csak két már
meglévő, eddig kihasználatlan darabot kellett összekötni:
`mag/fizetesi_hatarido.mjs` `napokEltelte()`-je (eddig sehol nem hívta
semmi a webappban) és a `javasolt_muveletek` napló, amiben az ajánlat
tényleges kiküldési időpontja (`vegrehajtva`) már ott van.

- `webapp/src/lib/kovetes.ts` — tiszta szövegsablon-függvény (nincs
  DB-hozzáférése, könnyen tesztelhető), `webapp/src/components/
  KovetesLista.tsx` — a "Ma" képernyőn megjelenő lista, soronként
  kibontható javasolt szöveggel és "Másolom" gombbal (vágólap API).
- **Fontos, hogy honnan számol**: a napok száma a `javasolt_muveletek`
  `vegrehajtva` mezőjéből jön (a tényleges kiküldés pillanata), NEM az
  ajánlat `letrehozva` dátumából — egy ajánlat gyakran piszkozatként áll
  egy ideig, mielőtt kimegy, ez a kettő nem ugyanaz.
- Küszöb: 3+ nap válasz nélkül (`UTANKOVETES_KUSZOB_NAP` a
  `webapp/src/app/(vedett)/page.tsx`-ben) — ez egy ésszerű alapértelmezés,
  nem Zolitól kapott konkrét szám, később állíthatóvá tehető.
- Nem küld semmit — csak szöveget javasol másolásra. Nincs
  e-mail-integráció (lásd `CLAUDE.md` "amit ne csinálj").
- **Élesben leellenőrizve** `execute_sql`-lel és egy külön `node -e`
  hívással: a `mag/fizetesi_hatarido.mjs` `napokEltelte()`-je pontosan
  ugyanazt az 5 napot adja, mint a Postgres saját dátum-kivonása
  ugyanarra a valós, korábban felvitt AJ-2026-002 ajánlatra.

### 2.4 Ugyanaznap — a maradék négy pillér egy menetben

Vince kérése: „mindet csináld meg" — a vízió-dokumentum összes megmaradt
nagy pillére. Ez valójában a dokumentum saját becslése szerint is
heteknyi munka; a folyamat: egy workflow **párhuzamosan** kidolgozta mind
a négy pillér részletes tervét (migráció, fájllista, kockázatok), majd
sorrendben, a kockázat növekvő sorrendjében épült meg mindegyik —
munkaidő-kalkuláció → naptár → nagyker → **legvégül** könyvelői
szerepkör, mert az utóbbi adatszivárgási kockázatot hordoz.

**Munkaidő-kalkuláció** (`db/migraciok/0005_munkaido.sql`,
`mag/munkaido.mjs` + 10 teszt): a vállalkozó megadhat egy normaidőt egy
árlistatételhez (perc / 1 mértékegység, egy menetben) — **soha nincs
alapértelmezett, kitalált szakmai norma beégetve**, ez mindig üres, amíg
a felhasználó ki nem tölti. Az ajánlat tételén egy „szorzó" mező (pl.
rétegek száma) csak a becsült időt szorozza, az anyagmennyiséget és az
árat nem. Az ajánlat nézeten megjelenik a becsült munkaidő összesen, és
jelzi, ha egy tételnél hiányzik a normaidő — nem hallgatja el.

**Naptár** (`db/migraciok/0006_naptar.sql`, `webapp/src/lib/het.ts`):
egyszerű, lista-alapú hét-nézet + „Naptárba teszem" gomb a munka
nézetén. **Fontos, élesben tesztelt részlet**: a szerver nem feltétlenül
Budapest időzónában fut, ezért egy saját, könyvtár nélküli
időzóna-konverziós függvény (`budapestIdopontIso`) gondoskodik róla,
hogy „2026-09-03 08:00" mindig ugyanazt az UTC-pillanatot jelentse,
nyári/téli időszámítástól függetlenül — ezt közvetlenül a Postgres saját
`at time zone` számításával vetettem össze, egyezik. Az esemény vége
(`veg`) szándékosan NULLABLE — nincs valós adat, amiből ki lehetne
találni. Az „intelligens" (útvonal-optimalizáló) naptár tudatosan kimaradt:
ahhoz valós térkép/útvonaltervező API kellene.

**Nagyker / anyag-katalógus** (`db/migraciok/0007_nagyker.sql`, `nagyker/`
modul): ez az ELSŐ webapp-funkció, ami a `javasolt_muveletek` kaput az
`ajanlat_kikuldes`-en kívül használja — egy beszállítói árváltozás
javaslatot hoz létre (`muvelet_tipus` bővítve `'arfrissites'`-szel), és
csak jóváhagyás után írja át a tényleges árakat, két mód közül
választva (teljes árrés-tartás vagy csak a beszerzési ár). Az árrés
arányát megtartó számítás **élesben, a jóváhagyási kapun ténylegesen
átvezetve leellenőrizve**: 3200→3600 Ft beszerzés esetén a 23,8%-os
árrés pontosan megmaradt (4200→4725 Ft eladási ár). Munkacsomagok
(assemblies) tudatosan kimaradtak — önálló adatmodellt igényelnének.

**Könyvelői szerepkör** (`db/migraciok/0010_konyvelo_szerep.sql`,
`0011_konyvelo_hozzaferes.sql`, `konyvelo/` + `cegprofil/konyvelok/` +
`dokumentumok/` modulok) — ⚠ **ez a pillér egy valódi, komoly biztonsági
tanulságot hozott, olvasd el figyelmesen**:

Mielőtt a tervezett SQL élesedett volna, egy ellenséges biztonsági
felülvizsgálatot futtattam rá (5 független „támadó" nézőpont). Ez **két
valós, megerősített rést talált**:

1. **Jogosultság-eszkaláció — és ez FÜGGETLEN volt a könyvelői
   funkciótól, már korábban is fennállt**: a `felhasznalok` táblán a
   meglévő tenant-policy (`ceg_id = aktualis_ceg()`) csak azt ellenőrizte,
   MELYIK cég sorát látod — a `szerep` OSZLOPOT semmi nem védte. Egy sima
   `munkatars` egyetlen `PATCH /felhasznalok?id=eq.<sajat_id>
   {szerep:"tulajdonos"}` hívással saját magát tulajdonossá tudta volna
   léptetni. **Javítva, azonnal, a könyvelői migrációtól függetlenül**:
   `db/migraciok/0009_felhasznalo_update_szigoritas.sql` teljesen megvonja
   az UPDATE jogot a `felhasznalok` táblán `authenticated`/`cegem_app`-tól
   — minden jövőbeli szerepkör-váltás kizárólag SECURITY DEFINER RPC-n
   mehet. **Tanulság**: a `0008_felhasznalo_szerep_vedelem.sql` első
   próbálkozásom (oszlop-szintű `revoke update (szerep, ceg_id) ...`)
   NEM ért semmit, mert Postgres-ben egy oszlop-szintű REVOKE nem szűkíti
   egy már meglévő, szélesebb TÁBLA-szintű GRANT-ot — ezt
   `information_schema.column_privileges`-szel közvetlenül ellenőriztem
   is, csak a 0009-es (teljes tábla-szintű revoke) után tűnt el ténylegesen
   a jog. Ha valaha oszloponkénti jogosultságot akarsz, a helyes minta:
   vond meg a tábla-szintű jogot, és add vissza oszloponként, amit tényleg
   engedni akarsz — nem fordítva.
2. **Idegen cégre szerezhető könyvelői hozzáférés**: a
   `konyvelo_meghivas_veglegesitese` eredeti terve sosem ellenőrizte, hogy
   a paraméterként kapott Auth-fiók valóban a megadott e-mailhez
   tartozik-e — egy tulajdonos ezzel egy MÁSIK saját fiókját állíthatta
   volna be egy célzott, valódi könyvelő e-mail-címe mögé, majd (a nem
   egyedi `email` oszlop miatt) amikor az áldozat cég valódi tulajdonosa
   ugyanazt az e-mailt hívta volna meg, a támadó hamis sorát találhatta
   volna — idegen cégre szerezve hozzáférést. **Javítva**: a végleges
   `0011`-es migráció a `sajat_ceg_letrehozasa` már bevált mintáját
   követi (`select email from auth.users where id = ...`, összevetve a
   kapott e-maillel, eltérésnél elutasítva), plusz egy parciális egyedi
   indexet ad `felhasznalok (lower(email)) where szerep='konyvelo'`-ra.

A tényleges adatmodell (`konyvelo_hozzaferes` kapcsolótábla, a
`felhasznalok.ceg_id` NULL-lá válása KIZÁRÓLAG könyvelőnél, két
SECURITY DEFINER RPC a meghíváshoz) a `db/migraciok/0011_konyvelo_hozzaferes.sql`
fájl fejlécében részletesen dokumentálva van. A könyvelő a
`(vedett)`-en KÍVÜLI, saját `/konyvelo` felületet kap (saját layout,
`webapp/src/lib/sajat-konyvelo.ts` őrzi), mert a meglévő
`sajatCegVagyIranyitas()` egyetlen cégre épít.

⚠ **Amit nem lehetett élesben tesztelni**: a teljes meghívási folyamat
(Supabase Auth Admin `inviteUserByEmail` → e-mail → jelszóbeállítás →
dokumentum-lista) valódi bejelentkezést és a `SUPABASE_SERVICE_ROLE_KEY`
környezeti változót igényli, ami ebben a környezetben nincs beállítva
(lásd `webapp/.env.local.example`) — **ezt Vincének kell pótolnia** a
Supabase projekt Settings → API oldaláról, mielőtt a meghívás ténylegesen
kipróbálható. A biztonsági javításokat viszont közvetlen SQL-lel
leellenőriztem (CHECK constraint, parciális egyedi index, a
`information_schema`-alapú jog-ellenőrzés).

Amit ez a pillér tudatosan kihagyott: külön könyvelői UI/workspace helyett
a meglévő UI-ra épülő szerepkör-nézet (a vízió-dokumentum saját V1-
javaslata); dokumentumtípus-alapú finomhangolt jogosultság (mindent lát,
amit a cég feltöltött); „hiányzó dokumentum" számláló (ehhez ki kellene
találni, milyen dokumentum „várható" — pont a „ne találgass" elv ellen
menne); valódi fájltárolás (a `dokumentumok.fajl_url` egyelőre egy már
meglévő linket vár, pl. Google Drive).

### 2.5 Ugyanaznap — élő visszajelzés után: nav-hiba, kattintható naptár, nagyker-link

Vince élesben kipróbálta a fentieket. Három konkrét visszajelzés jött, plusz
két kérés, amit tudatosan NEM építettem meg — lásd alább, miért.

**„A több menüpont nem működik" (hibajavítás).** A `Nav.tsx`-ben az
`overflow-x: auto` a fő linksoron a CSS-specifikáció szerint automatikusan
`overflow-y: auto`-t is beállít (nem lehet csak az egyik tengelyt
`auto`-ra tenni, a másikat `visible`-ön hagyni) — ez levágta a „Több"
lenyíló menüjét, mert az a saját dobozán túlnyúlt. Javítás: a
vízszintesen görgetendő linksor egy belső `<div>`-be került, a „Több"
gomb és a lenyíló menü kikerült ebből a görgetési/vágási kontextusból.

**„A naptár rész jó lenne, ha kattintható lenne" (megépítve).** Eddig a
hét-nézet csak listázott és törölt — sem a napra, sem egy eseményre nem
lehetett kattintani. Most:
- egy nap fejlécén „+ esemény" link → `/naptar/uj?datum=YYYY-MM-DD`
  (előre kitöltött dátummal),
- egy esemény sorára kattintva → új `/naptar/[id]` szerkesztő oldal
  (`NaptarEsemenyForm` most `esemeny` propot is elfogad, előtölti az
  összes mezőt, `budapestIdoString()` az új segédfüggvény az óra:perc
  kiolvasásához),
- a szerkesztőn törlés gomb is van, ami — eltérően a munka-oldali
  törlésgombtól, ami helyben marad — a `/naptar`-ra navigál vissza (egy
  helyi, `"use server"` inline wrapper-függvénnyel, hogy az általános
  `esemenyTorlese`-t ne kelljen mindenhol átirányításra kényszeríteni).
- A `NaptarEsemenyForm` `action` propja emiatt kötelezővé vált — minden
  hívási helyet (a `naptar/uj`, `naptar/[id]`, `munkak/[id]`) frissíteni
  kellett.

**„Nem lehetne a nagykeresnél beágyazni egy oldalt, amiből böngészve
lehet keresni?" — tudatosan NEM építve meg.** Egy beszállító weboldalának
tényleges beágyazása/scrapelése komoly jogi (ToS-sértés, a legtöbb
webshop kifejezetten tiltja az automatizált böngészést/scrapelést) és
technikai (a legtöbb oldal `X-Frame-Options`/CSP-vel eleve tiltja az
`iframe`-es beágyazást, és bármelyik réteg-átalakítás törékeny, karbantartás-
igényes) kockázatot hordoz — pontosan az az irány, amit a vízió-dokumentum
saját V1-scope-ja is kizár. Helyette: `partnerek.weboldal` új, opcionális
mező (`db/migraciok/0012_partner_weboldal.sql`), ami egy kényelmi linket
ad a beszállító saját katalógusához/weboldalához (új fülön nyílik a
`nagyker/[szallitoId]` oldalon) — egy kattintás, nulla törékenység.

**„Nem gondolt-e arra, hogy a bejövő e-maileket naponta kétszer átnézi és
megválaszolja draftban, ill. a rendszerből induló e-mailek (pl. lejárt
számla) is menjenek?" — mindkettő tudatosan NEM épült meg, két különböző
okból**:
- A bejövő Gmail-fiók automatikus átnézése/draftolása **Gmail-integrációt**
  jelentene — ez a `CLAUDE.md` sarkalatos szabálya szerint kifejezetten
  V2-re halasztott terület (a Google CASA biztonsági felülvizsgálata
  hónapokig tart), NEM ez a session dönt máshogy.
- A saját rendszerből induló, valódi e-mail-KÜLDÉS (pl. automatikus
  fizetési emlékeztető) technikailag más tészta — ehhez NEM kell a
  felhasználó Gmail-fiókjához hozzáférni, egy tranzakciós e-mail-szolgáltató
  (pl. Resend) is elég lenne, tehát nem esik a CASA-tiltás alá. Vince
  explicit döntése viszont: **„Egyelőre csak piszkozat, ne küldjön."** —
  tehát a meglévő, már kész `Utánkövetés`/`KovetesLista` piszkozat-
  másolás-vágólapra minta marad az egyetlen e-mail-kapcsolódási pont,
  amíg más utasítás nem jön. Valódi kimenő e-mail-küldő infrastruktúrát
  ez a session NEM épített.

Érintett fájlok: `webapp/src/app/(vedett)/Nav.tsx` (görgetési vágás
javítva), `webapp/src/lib/het.ts` (`budapestIdoString` új függvény),
`webapp/src/components/NaptarEsemenyForm.tsx` (általánosítva
szerkesztéshez), `webapp/src/app/(vedett)/naptar/{actions.ts,uj/page.tsx,
page.tsx,[id]/page.tsx}`, `webapp/src/app/(vedett)/munkak/[id]/page.tsx`,
`db/migraciok/0012_partner_weboldal.sql`,
`webapp/src/app/(vedett)/partnerek/{PartnerForm.tsx,actions.ts}`,
`webapp/src/app/(vedett)/nagyker/[szallitoId]/page.tsx`.

Ellenőrzés: `npm run build --prefix webapp` tiszta, minden route
(beleértve az új `/naptar/[id]`-t) legenerálva. Élő böngészős tesztre
(bejelentkezéssel) még nem került sor ebben a lépésben.

### 2.6 Ugyanaznap — naptár .ics szinkron (Vince kérése: „legalább napi szinkron")

Vince a kattintható naptár után azt kérte, hogy legalább napi szinten
szinkronizálódjon a saját (telefonos) naptárával. A választott megoldás
**egy szabványos iCalendar (.ics) feed URL cégenként**, amit egyszer
feliratkoztat a saját Google/Apple/Outlook naptárába — ezek az appok a
feliratkozott naptárakat alapból kb. naponta frissítik, ami pontosan ezt
adja, egy teljes Google Calendar API OAuth-integráció (jóváhagyási
folyamat, tokentárolás) nélkül. **Ez EGYIRÁNYÚ** (a mi naptárunkból
kifelé) — pont úgy, ahogy Google Calendar saját "titkos iCal cím"
funkciója is működik. Ezt Vince kifejezetten jóváhagyta ("ez a terv,
tetszik") egy rövid tervismertetés után.

**Adatmodell** (`db/migraciok/0013_naptar_feed_szinkron.sql`): a
`cegek` tábla kapott egy `naptar_feed_token uuid` oszlopot (külön a cég
`id`-jétől, hogy szivárgás esetén önállóan újragenerálható legyen, a cég
többi adatának érintése nélkül), egyedi indexszel. Két új, **SECURITY
DEFINER** SQL-függvény szolgálja ki a feedet: `naptar_feed_ceg_neve` és
`naptar_feed_esemenyei`, mindkettő kizárólag a kapott tokenre szűr.

⚠ **Ez az ELSŐ hely a projektben, ahol egy SECURITY DEFINER függvényt az
`anon` (be nem jelentkezett) Postgres-szerepnek is futtatnia kell
tudnia** — a naptáralkalmazás, ami a feed URL-t lekéri, nyilvánvalóan
nem hordoz Supabase-munkamenetet. Emiatt, a könyvelői szerepkörnél már
bevált gyakorlat szerint, **ez a pillér is kapott egy ellenséges
biztonsági felülvizsgálatot** (5 független támadó-nézőpont: tenant-
izoláció/IDOR, SECURITY DEFINER search_path-eltérítés, .ics-injektálás
a felhasználó által beírt esemény/munka/partner szövegeken keresztül,
token-életciklus, és rendelkezésre állás/DoS) — **mielőtt** a
funkciót Vince ténylegesen használatba vette volna. A felülvizsgálat 12
találatot hozott (mindegyiket egy második, független ellenőrző menet is
megerősítette a valódi kódon, 0 elutasított/bizonytalan), ebből kettő
komoly volt — **mindkettőt még ugyanebben a lépésben javítottam**,
`db/migraciok/0014_naptar_feed_biztonsagi_javitasok.sql`-ben:

1. **MAGAS — a könyvelő ki tudta volna olvasni egy ügyfélcég feed-
   tokenjét.** A `cegek` tábla `authenticated`-nek adott SELECT joga
   oszlopmegkötés nélküli, a könyvelői sor-szintű policy (`cegek_konyvelo`,
   0011) pedig a teljes sort láthatóvá teszi — a felület sosem kérdezi le
   ezt az oszlopot, de ez nem adatbázis-szintű garancia, egy közvetlen
   PostgREST-hívással a könyvelő saját munkamenete kiolvashatta volna. A
   token emellett a könyvelői hozzáférés visszavonása UTÁN is örökre
   érvényes maradt volna, mert a feed-függvények sosem néztek a
   `konyvelo_hozzaferes` táblába. **Javítás**: a token egy ÖNÁLLÓ táblába
   (`naptar_feed`) került, saját, könyvelői kivétel NÉLKÜLI tenant-RLS-
   szel — egy könyvelő `aktualis_ceg()`-je mindig NULL, tehát szerkezetileg
   sosem fér hozzá, sem a régi (törölt) oszlophoz, sem az újhoz.
2. **KÖZEPES — egy idegen cégre mutató `munka_id` beszivárogtathatta
   volna egy másik cég munkacímét/ügyfélnevét a feedbe.** A
   `naptar_feed_esemenyei` a `munkak`/`partnerek` táblákkal anélkül
   JOIN-olt, hogy visszaellenőrizte volna a cég-egyezést — mivel SECURITY
   DEFINER, ez megkerülte az RLS-t, ami korábban csendben védte ezt (a
   `munka_id` idegen kulcs önmagában sosem volt cég-specifikus). **Javítás
   két rétegben**: a join-ba visszakerült a cég-egyezés ellenőrzése
   (olvasási oldal), ÉS egy új trigger (`naptar_esemenyek_munka_ellenorzese`)
   már ÍRÁSKOR megakadályozza, hogy egy esemény idegen céghez tartozó
   munkára mutasson — ugyanaz a minta, mint a 0007-es migráció
   `nagyker_tetel_szallito_ellenoriz` triggere. **Élesben tesztelve**: egy
   ideiglenes második céget és munkát létrehozva, a kereszt-cég beszúrás
   ténylegesen elutasításra került (`23514` hibakóddal), a saját-cégen
   belüli pedig sikerült — utána a teszt-adatok törölve.

Ugyanebben a migrációban javítva még: a token-csere mostantól kizárólag
egy SECURITY DEFINER RPC-n (`naptar_feed_token_ujrageneralasa`) megy,
ami adatbázis-szinten (nem csak a felületen) ellenőrzi, hogy a hívó
`tulajdonos`-e — korábban bármelyik `munkatárs` visszavonhatta volna az
egész csapat megosztott linkjét; és minden SECURITY DEFINER függvény
hivatkozása sématagolt (`public.cegek` stb.) a Postgres saját
search_path-eltérítés elleni ajánlása szerint (ma nem kihasználható, de
ingyenes hardening).

A `webapp/src/lib/ics.ts`-ben (nem migrációs, kód-oldali) javítva
három kisebb találat: a sortördelés mostantól Unicode-kódpont szerint
vág (nem UTF-16-kódegység szerint), így egy szürrogát-párral kódolt
karakter (pl. emoji) sosem törik két érvénytelen `U+FFFD`-re; az
escape-elés kiszűri az irányjelző Unicode-vezérlőket (RLO, izolátumok,
LRM/RLM — ezekkel egy esemény címében egy URL-t vizuálisan meg lehetne
hamisítani), és a CRLF mellett a Unicode sor-/bekezdéselválasztókat
(U+2028/U+2029) és a NEL-t (U+0085) is soremelésként escape-eli, mert
egyes, az RFC 5545-nél megengedőbb szövegfeldolgozók sortörésként
értelmeznék. Mindhárom javítást önálló szkripttel leellenőriztem.

Tudatosan **elfogadott, nem javított** találatok (mind informatív/
tervezési jellegű, dokumentálva a migráció fejlécében is): a végpontnak
nincs saját sebességkorlátozása (ez a Supabase-projekt/infrastruktúra
szintjén dőlne el, egy csak a Next.js route-ra épített korlátozást a
Supabase PostgREST réteg közvetlen elérhetősége amúgy is megkerülné);
a token nem jár le, és nyers formában szerepel az URL-ben (naplókba,
böngészőelőzményekbe kerülhet) — ugyanaz a tervezési modell, mint
Google Calendar saját "titkos iCal cím" funkciójáé; a feed mérete
időablakkal (elmúlt 90 nap – jövő 365 nap) és egy 500-as felső korláttal
védett, nem korlátlan.

**Élesben, a valódi Supabase-adatbázison ellenőrizve**: egy teszteseményt
felvéve a feed helyesen tartalmazta (UID, DTSTART/DTEND UTC-ben, SUMMARY
ékezetes szöveggel helyesen), majd törölve eltűnt; érvénytelen/nemlétező
token 404-et ad; a token-újragenerálás gomb a `cegprofil` oldalon
ténylegesen lecseréli az adatbázisban tárolt tokent, és a régi URL
utána azonnal 404-et ad — mindezt a 0014-es biztonsági javítás UTÁN,
az új `naptar_feed` táblán keresztül újra megismételve.

Amit ez a pillér tudatosan kihagyott: kétirányú szinkron (a telefonos
naptárban tett módosítás NEM jön vissza) — ha valaki a saját natív
naptárában szerkeszt egy eseményt, az csak ott változik; push-alapú
azonnali frissítés (a szinkron sebessége a naptáralkalmazás saját
feliratkozás-frissítési ütemétől függ, jellemzően ~napi); és bármilyen
Google/Apple/Outlook API-integráció — szándékosan, mert azok OAuth-
jóváhagyást, tokentárolást és (Gmailhez hasonlóan, bár enyhébb szinten)
platform-felülvizsgálati kockázatot hoznának be, amit a CLAUDE.md a
Gmail-integrációnál kifejezetten kizár, és ami itt sem indokolt egy
ilyen egyszerű, szabványos alternatíva mellett.

Érintett fájlok: `db/migraciok/0013_naptar_feed_szinkron.sql` (új),
`db/migraciok/0014_naptar_feed_biztonsagi_javitasok.sql` (új — a fenti
felülvizsgálat javításai: `naptar_feed` önálló tábla, tulajdonos-
ellenőrzött RPC, cég-egyezés a join-ban és íráskor, sématagolás),
`webapp/src/lib/supabase/types.ts` (kétszer regenerálva, verbátim),
`webapp/src/lib/ics.ts` (új — RFC 5545 generálás, escape-eléssel, majd
a felülvizsgálat után kiegészítve az Unicode-vezérlőkarakter-szűréssel
és a kódpont-alapú sortördeléssel),
`webapp/src/app/naptar-feed/[token]/route.ts` (új — nyilvános route
handler, SZÁNDÉKOSAN a `(vedett)` csoporton kívül),
`webapp/src/components/NaptarSzinkron.tsx` (új, majd a felülvizsgálat
után kiegészítve a `tulajdonos`-kapuval),
`webapp/src/app/(vedett)/cegprofil/{page.tsx,actions.ts}` (a token
kiolvasása/cseréje áttéve az önálló `naptar_feed` táblára/RPC-re).

### 2.7 Ugyanaznap — öt darab egy menetben: Wow #2, ajánlat-logó, munka-fotó, offline sor, számla-lánc

Vince kérése: „mindet csináld meg egy sessionben" — a korábban feltérképezett
lista szinte minden tőlem függő pontja, plusz UI-modernizációs ajánlás
(lásd külön üzenetben/PR-leírásban, nem ebben a fejezetben, mert az még
nem implementáció). **Egy pontot tudatosan kihagytam és nem térek el ettől
kérdés nélkül**: a számlafotó valódi AI-kiolvasása pontosan a 6. modul,
amit a CLAUDE.md kifejezetten megtilt addig, amíg a NAV- és
számlaolvasás-spike eredménye nincs meg (`spike/eredmenyek/EREDMENY-
SABLON.md` még üres) — ezt nem építettem meg.

**Wow #2 — naptár esemény szövegből** (`webapp/src/lib/szandek.ts`,
`webapp/src/lib/het.ts`, `webapp/src/app/(vedett)/actions.ts`): az AI-doboz
mostantól felismeri a "Holnap 10-kor megyek Kovácshoz" mintájú mondatokat
is. Szándékosan **szűk, konkrét minta** (a nap-szónak a mondat elején kell
állnia, idő nélkül nem hoz létre semmit — nem talál ki egy alapértelmezett
órát), a 0. réteg "inkább továbbadjon, mint találgasson" elve szerint.
Nincs külön jóváhagyó lap: a `naptar_esemenyek` maga sem megy a
`javasolt_muveletek` kapun (0006), ezért az esemény azonnal létrejön, a
válasz pedig megmutatja, mit értett a rendszer, szerkesztő linkkel.
**Élesben tesztelve**: "Holnap 10-kor megyek Kovácshoz" → helyesen
szeptember 4., péntek 10:00, Kovács Építő Kft.-hez kötve; "Kedden 9-kor
Nagy Istvánnál felmérés" → helyesen a következő keddre (nem a mai napra,
ha ma épp kedd lenne), 09:00, Nagy István.

**Ajánlat-dokumentum logó** (`db/migraciok/0016_ceg_logo.sql`,
`webapp/src/components/CegprofilLogo.tsx`): a `cegek.logo_url` oszlop már
az 0001 óta megvolt, csak semmi nem töltötte fel. Egy nyilvános Storage
bucket (`ceg-logok`) + feltöltő űrlap a cégprofilon, megjelenítve az
ajánlat-dokumentum fejlécén. **Szándékosan NEM épült meg** a szerveroldali
PDF-export (a "Nyomtatás/PDF" böngésző-nyomtatás marad) — ehhez egy új,
számottevő függőség kellene (Playwright/Chromium vagy egy szerverless-re
szabott változat, pl. `@sparticuz/chromium`), ami valós méret- és
hidegindítás-kockázatot hordoz Vercel-szerű környezetben, és ezt a
döntést nem hoztam meg helyette — a meglévő böngésző-nyomtatás már ma is
tökéletesen ad PDF-et ("Mentés PDF-ként" a nyomtatási párbeszédben).

**Munka-fotódokumentáció** (`db/migraciok/0015_munka_fotok.sql`,
`webapp/src/components/MunkaFotok.tsx`): a HANDOVER 8.1-ben még
hiányzóként jelölt terepi funkció. A `munka-fotok` bucket **privát**
(ellentétben a logóval — egy munkahelyszín fotója valós ügyféladat),
ezért a megjelenítés mindig 10 perces aláírt URL-en megy. Írás-időben egy
trigger (ugyanaz a minta, mint a naptár-eseményeknél, 0014) megakadályozza,
hogy egy fotó idegen cég munkájához kapcsolódjon. A feltöltő mező
`capture="environment"`-tel a mobil böngészőn egyből a hátsó kamerát
nyitja meg. ⚠ **A tényleges fájlfeltöltést böngésző-automatizálással nem
lehetett élesben leellenőrizni** (egy `<input type="file">` értékét
biztonsági okból nem lehet szkriptből beállítani) — az oldal hibamentesen
betöltődik és renderel, de a feltöltés gombot Vincének érdemes egyszer
kézzel kipróbálnia.

**Offline sor** (`webapp/src/components/AiBox.tsx`): az AI-doboz
mostantól `localStorage`-ban sorba teszi a beírt parancsot, ha nincs net
(`navigator.onLine`), és `online`/`offline` eseményekre figyel. **Nem
küldi el automatikusan** a várakozó parancsokat, amint visszajön a net —
ezt tudatosan hagytam kézi ("Most elküldöm") gombra, mert egy
"ajánlat_keszites" szándéknál a jóváhagyó lapot valakinek látnia és
jóváhagynia kell, ezt nem lehet a felhasználó háta mögött eldönteni. Ez
tehát egy **szűkebb, becsületesebb** funkció, mint egy teljes, néma
háttér-szinkron — semmi nem vész el, de semmi nem történik automatikusan
a felhasználó tudta nélkül sem. **Élesben tesztelve**: `navigator.onLine`
szimulált false-ra állítva → a parancs sorba került, a banner és a gomb
felirata ("Sorba teszem") megjelent, `online` esemény után a "Most
elküldöm" gombbal a sorból ténylegesen létrejött a naptár-esemény.

**Számla-lánc** (`db/migraciok/0017_szamla_lanc_enumok.sql`,
`0018_szamla_ajanlat_kapcsolat.sql`, `ajanlatok/actions.ts`
`szamlaKiallitasa`): egy elfogadott ajánlaton megjelenő "Számla
kiállítása" gomb — ugyanaz a minta, mint az `ajanlatKikuldese`-nél (a
kattintás maga a jóváhagyás, de a `javasolt_muveletek` sor ugyanúgy
javasolt → jóváhagyott → végrehajtott állapotokon megy át). ⚠
**SZIMULÁLT**: a `szamlak.forras = 'szimulalt'` ezt a felületen is
kimondja (sárga jelvény a számla mellett) — amíg nincs választott
szolgáltató (Számlázz.hu vagy Billingo, ez a döntés a saját
`EREDMENY-SABLON.md`-ben is nyitott) és valós API-kulcs, nem történik
tényleges számlakiállítás. A `szamlak.ajanlat_id` új oszlop (parciális
egyedi indexszel) adja az idempotenciát. **Élesben tesztelve**: az
AJ-2026-003 elfogadott ajánlatra kiállítva SZ-2026-001 lett, helyes
összeggel és fizetési határidővel, és — mivel a `szamlak` már a "Ma"
képernyő kintlévőség-dobozának is adatforrása (lásd 2.1) — a kintlévőség
doboz **azonnal, valós adatként** mutatta az 1 885 950 Ft-ot. A jóváhagyási
napló felirata korábban mindig "Kiküldve"-t írt volna erre is (a
`muvelet.tipus`-t nem nézte) — ezt élő tesztelés közben vettem észre és
javítottam (`ajanlatok/[id]/page.tsx`).

Az élő teszteléshez létrehozott ideiglenes adatokat (két teszt naptár-
esemény, egy teszt számla, egy ideiglenes teszt-felhasználó/cég a korábbi
biztonsági teszthez) minden esetben töröltem — Vince valódi adatai a
tesztelés előtti állapotban maradtak, a `szamlak`/`naptar_esemenyek`
táblák tartalma nem változott tartósan.

Érintett fájlok: `db/migraciok/{0015_munka_fotok,0016_ceg_logo,
0017_szamla_lanc_enumok,0018_szamla_ajanlat_kapcsolat}.sql` (új),
`webapp/src/lib/supabase/types.ts` (regenerálva, verbátim),
`webapp/src/lib/szandek.ts`, `webapp/src/lib/het.ts` (`napHozzaad`,
`napszoDatumma`), `webapp/src/app/(vedett)/actions.ts` (naptár-szándék
ága), `webapp/src/components/{AiBox,CegprofilLogo,MunkaFotok}.tsx` (új
vagy jelentősen bővítve), `webapp/src/app/(vedett)/cegprofil/{page.tsx,
actions.ts}` (logó), `webapp/src/app/(vedett)/munkak/{actions.ts,
[id]/page.tsx}` (fotó), `webapp/src/app/(vedett)/ajanlatok/{actions.ts,
[id]/page.tsx,[id]/dokumentum/page.tsx}` (számla-lánc + logó
megjelenítés), `webapp/src/app/(vedett)/page.tsx` (elavult komment/
üresállapot-szöveg frissítve, mivel a `szamlak`-nak már van írója).

### 2.8 Ugyanaznap — UI-modernizáció (design-token szintű, nem oldalankénti átírás)

Vince saját szavaival a felület "generikus" volt: lapos fehér kártyák,
1px szürke szegélyek, semmi mélység, a szinte minden AI-startup által
használt indigó-kék CTA, nulla ikon, és — ami nem csak esztétika — **nulla
sötét/napfény mód**, pedig a CLAUDE.md kifejezetten helyszíni, napfényben
dolgozó felhasználót céloz meg. A javítás **szándékosan a megosztott
design-tokeneken és UI-kit komponenseken** ment át (`globals.css`,
`components/ui/classes.ts`, `Nav.tsx`), NEM oldalankénti egyedi átírással —
mivel a ~30 oldal túlnyomó többsége ugyanazokra a tokenekre/komponensekre
épül, ez egy központi módosítással az egész appon átüt, kockázat és
munka nélkül minden egyes oldal külön bejárására.

**Mélység**: a `kartya` (Card) osztály lapos szegély helyett finom
árnyékot kapott (`--shadow-kartya`), ami módonként külön hangolt (sötétben
erősebb, napfényben nulla — ott a vastag fekete szegély ad kontrasztot,
nem az árnyék). Új `kartyaInteraktiv` variáns hover-emeléssel a
kattintható listasoroknak.

**Szín**: a lapos `#2f5aff` helyett egy markánsabb indigó (`#4338ca`
világosban, `#8b87f0` sötétben) — még mindig egyértelműen "elsődleges
kék", csak kevésbé sablonos.

**Ikonok**: `lucide-react` új függőség (könnyű, fa-lombozó, React 19-
kompatibilis). A fő- és "Több" navigáció minden pontja, valamint a "Ma"
képernyő öt szekciófejléce kapott ikont — ez mutatja az irányt, a többi
oldal a megosztott komponenseken (Card, gombok) keresztül profitál a
mélység/szín/animáció frissítésből ikon nélkül is.

**Sötét mód**: valódi `prefers-color-scheme: dark` alapú paletta —
mindhárom szín-mód (világos, sötét, napfény) UGYANAZOKAT a CSS-token-
neveket írja felül, sosem definiál újakat, így minden komponens
automatikusan helyesen viselkedik mindháromban.

**Napfény mód** (`webapp/src/components/TemaValto.tsx`): kézi kapcsoló a
fejlécben (nap/felhő ikon), `data-napfeny="true"` attribútumot ír a
`<html>`-re, `localStorage`-ban perzisztálva. Ez a CLAUDE.md saját,
korábban csak a telefonos prototípusban létező elvárása, most a valódi
webapp-ban is: maximális kontraszt (fekete szegélyek, tiszta fehér-fekete),
erős kültéri fényben olvashatóság — SZÁNDÉKOSAN világos alapú, nem sötét,
mert erős napfényben egy sötét felület rosszabbul olvasható.

⚠ **Valódi hibát talált az élő tesztelés**: a napfény-mód villanásmentes
alkalmazásához egy `<script>` a hidratáció ELŐTT írja rá a `data-napfeny`
attribútumot a `<html>`-re (`webapp/src/app/layout.tsx`
`NAPFENY_ELOKESZITO`) — ez React hidratáció-eltérési hibát dobott a
konzolon, mert a szerver-renderelt HTML nem tartalmazta még ezt az
attribútumot. Javítva `suppressHydrationWarning`-gal a `<html>`-en
(a Next.js/next-themes saját dokumentált mintája pontosan erre az
esetre) — **egy friss böngészőfülön leellenőrizve, hogy a hiba tényleg
eltűnt**, nem csak a régi fül gyorsítótárazott konzol-üzeneteit néztem.

**Élesben ellenőrizve**: világos, sötét (rendszer-preferencia) és
napfény mód is helyesen jelenik meg a "Ma", "Naptár" és más oldalakon,
a napfény-kapcsoló állapota túléli az újratöltést.

Amit ez a pillér tudatosan kihagyott: oldalankénti egyedi ikon-/vizuális
finomhangolás minden egyes modulra (csak a "Ma" képernyő kapott
mintaként teljes ikon-készletet); animált oldalátmenetek; egy teljes
design-rendszer dokumentáció (Storybook-szerű komponensgyűjtemény) — ezek
külön, jóváhagyandó befektetést igényelnének.

Érintett fájlok: `webapp/src/app/globals.css` (tokenek, sötét/napfény
mód, átmenetek), `webapp/src/components/ui/classes.ts` (árnyék, hover),
`webapp/src/components/TemaValto.tsx` (új), `webapp/src/app/layout.tsx`
(napfény-előkészítő script + `suppressHydrationWarning`),
`webapp/src/app/(vedett)/layout.tsx` (`TemaValto` bekötve),
`webapp/src/app/(vedett)/Nav.tsx` (ikonok), `webapp/src/app/(vedett)/
page.tsx` (ikonok a szekciófejléceken), `webapp/package.json`
(`lucide-react` új függőség).

### 2.9 Ugyanaznap — PWA telepíthetőség, globális visszajelzés, keresés a listákon

Vince kérése: "csináld meg azokat, amikhez nem kell API-kulcs" — a
feltérképezett bővítési listából a három ilyen tétel.

**PWA telepíthetőség** (`webapp/src/app/manifest.ts`, `public/sw.js`,
`public/offline.html`, `components/SwRegisztracio.tsx`, gyökér
`layout.tsx`): a CLAUDE.md "telepíthető PWA"-ként írja le a webappot, de
eddig sem manifest, sem service worker nem volt. A manifest a Next.js
saját fájl-konvenciójával készül (`/manifest.webmanifest`), a
`theme-color` az új `viewport` exportba ment (a `metadata.themeColor`
Next 14 óta deprecált — a helyi `node_modules/next/dist/docs` alapján
ellenőrizve). Az ikonok a fejléc szóvédjegyét renderelik (Playwright, a
repó gyökeréből — `ikon-192/512/180.png`).

⚠ **A service worker tervezésének fő szempontja a biztonság volt, nem az
offline-teljesség.** Ez egy hitelesített, több cég adatát RLS-szel
elválasztó app — egy SW-cache pontosan az a hely, ahol egy cég adata
átszivároghat egy másik felhasználóhoz ugyanazon az eszközön, vagy ahol
kilépés után is "él" egy bejelentkezett képernyő (a kutatás: OWASP
multi-tenant cheat sheet, w3c/ServiceWorker #909). Ezért a SW **HTML-
navigációt soha nem cache-el** (hálózat-először, hálózat nélkül a
statikus, adatmentes `/offline.html`), **csak** a tartalom-hash-elt
`/_next/static/*` fájlokat, az ikonokat és a manifestet, és a
`/naptar-feed/*` titkos feedhez hozzá sem nyúl. Mivel felhasználói adat
sosem kerül a cache-be, kilépéskor nincs mit törölni — ez tudatos: egy
"töröld kilépéskor" horog elfelejthető, egy soha-nem-cache-elt adat nem.
A regisztráció csak `NODE_ENV=production`-ben fut (fejlesztés közben a
HMR és a SW-cache egymásnak megy).

⚠ **Amit itt NEM lehetett élesben bizonyítani**: az itteni beágyazott
böngésző-pane a service worker script letöltését blokkolja
("unknown error occurred when fetching the script"), miközben a `sw.js`
`node --check`-kel hibátlan, a szerver 200-zal és helyes
`application/javascript` típussal adja, és az oldalról sima `fetch`-csel
is letölthető — a hiba tehát a környezeté, nem a kódé. **Vincének egyszer
érdemes megnéznie** egy valódi Chrome-ban (DevTools → Application →
Service Workers, ill. a "Telepítés" felajánlás a telefonon). A manifest,
a meta-tagek (`mobile-web-app-capable`, `apple-mobile-web-app-title`,
`apple-touch-icon`, `theme-color`) és az offline-oldal élesben
(`next start`, :3100) ellenőrizve.

**Globális visszajelzés — toast + flash** (`components/Toast.tsx`,
`lib/flash.ts`, `(vedett)/layout.tsx`): eddig minden akció csak inline
szöveggel jelzett, és a `redirect()`-tel záruló akciók után (új partner,
munka, ajánlat, esemény) SEMMI visszajelzés nem volt — az inline üzenet
az átirányítással eltűnt. Megoldás: egy 15 mp-es, nem-httpOnly
`cegemai_flash` süti, amit a Server Action a `redirect()` előtt beállít
(`flashUzenet`), a `(vedett)/layout.tsx` kiolvas (`flashOlvasas`), a
kliens toast megjelenít, majd töröl. A `nonce` azért kell, hogy két
egymás utáni azonos szöveg is két toastot adjon. SZÁNDÉKOSAN a
`(vedett)` layoutban és nem a gyökérben: a süti-olvasás dinamikussá
tenné a belépés/regisztráció oldalakat, amik most statikusak. A toast
alul, min. 56 px-es, koppintásra is eltűnik — a telefon-első elv szerint.
Bekötve: partner létrehozás/mentés, munka létrehozás/mentés, esemény
létrehozás/mentés, ajánlat létrehozás/kiküldés, számla kiállítás (utóbbi
eddig teljesen néma volt). A süti-értelmezés élei (rossz JSON, hiányzó
mező, ismeretlen típus) önálló szkripttel tesztelve.

**Keresés/szűrés** (`lib/kereses.ts`, `components/KeresoMezo.tsx`;
partnerek, ajánlatok, munkák, árlista oldalak): `?q=` paraméter, a
szűrés a szerveren, JS-ben, az RLS-szel már cégre szűrt lista fölött —
egy kisvállalkozás listái tíz-száz elemesek, ehhez nem kell adatbázis-
szintű keresés, és így a beágyazott mezőkre (ajánlat partnerének neve)
is ugyanaz az egyszerű szabály érvényes. **Ékezet- és kisbetű-független**
— ugyanaz a `norm()`, mint az AI-doboz szándékfelismerője: "kovacs"
megtalálja a "Kovács Építő Kft."-t, "elfogadva" az állapot magyar
címkéjére is illeszkedik. A `KeresoMezo` 250 ms késleltetéssel ír az
URL-be (`router.replace`, görgetés megtartva), a keresés így linkként
megosztható és túléli a frissítést. 9 illeszkedési eset szkripttel
tesztelve (ékezet, nagybetű, pont, üres, kötőjel, két szó, nincs
találat).

Tudatosan kihagyva: teljes offline-működés (adatszinkron, konfliktus-
kezelés — külön, nagy szelet, és a fenti biztonsági okból nem "ingyen"
jön); push-értesítés (szerver oldali kulcsok kellenének); adatbázis-
szintű teljes szöveges keresés (a listaméretek nem indokolják).

### 2.10 Ugyanaznap — a "hosszú session": munkacsomagok, ajánlat-szerkesztés, partner-lap, anyaglista, teendő és partner-helyzet az AI-dobozból

Vince: "kezdheted a hosszú sessiont, funkciókat akarok bővíteni" — API-kulcs
nélkül megépíthető, a vízió-dokumentumból még hiányzó darabok, értéksorrendben.

**Munkacsomagok — Wow #1** (`db/migraciok/0019_munkacsomagok.sql`,
`lib/munkacsomag.ts`, `arlista/csomagok/*`): a 2.4-ben tudatosan kihagyott
adatmodell. Egy csomag = az árlista tételei, tételenként azzal, hogy
mennyi kell belőle a munka EGY egységére (1 m² térkövezés → 1,05 m² térkő,
0,04 m³ homok…). **A csomag nem tárol árat** — az ár mindig az árlista
aktuális eladási árából jön az `ajanlatSzamitas`-on át, így egy
árfrissítés után a csomag magától a friss árat adja. **Nincs beégetett
szakmai norma**: a mennyiségeket a vállalkozó adja meg (a 0005-ös
normaidő elve). RLS + `force`, a tételeken a 0014/0015-ös
cég-ellenőrző trigger mintája (a termék ugyanahhoz a céghez tartozzon,
mint a csomag). Az AI-dobozban a mondat vége a csomag neve: "Készíts
ajánlatot Kovácsnak 50 m²-re **térkövezés**" → a csomag tételei a saját
arányaikkal; ha nincs ilyen nevű csomag, marad a régi, őszinte közelítés
(minden m²-es tétel) ÉS a feltételezés kimondja, hogy a csomagot nem
találta. Az ajánlat-űrlapon "Munkacsomagból" panel tölti fel a sorokat
(ugyanaz a `csomagTetelBemenetek` tiszta függvény, mint a szerveren).

**Ajánlat szerkesztése és másolása** (`ajanlatok/[id]/szerkesztes`,
`ajanlatFrissitese`, `ajanlatMasolasa`, `ajanlatTetelekCsereje`): az
AI-doboz feltételezés-szövege eddig azt ígérte, hogy "a kézi űrlapon még
módosíthatod" — de nem volt szerkesztő oldal. Most van, **csak
piszkozatra**, a szerveren ellenőrizve (a gomb hiánya nem biztonsági
határ): a kiküldött ajánlat a kiadáskori árak pillanatképe (9. fejezet
buktató), azt nem írjuk át — abból "Másolat" készül: új piszkozat
ugyanazokkal a tételekkel, **a mai árakon**, új sorszámmal; ha egy tétel
azóta kikerült az árlistából, a toast megmondja, hány maradt ki. Az
`AjanlatForm` ehhez vezérelt sorokra lett átírva (`kezdoSorok`, `action`
prop — ugyanaz a minta, mint a `MunkaForm`).

**Partner-lap történettel** (`partnerek/[id]/page.tsx`): eddig csak az
űrlap volt. Most: kintlévőség (ugyanaz a `mag/kintlevoseg.mjs`, mint a
"Ma"), kimenő számlák **"Fizetve" gombbal**, ajánlatok és munkák
jelvénnyel — az adatlap alulra került. Az AI-dobozban "Hogy állunk
Kovácssal?" (a prototípus `partner` parancsa) ugyanezt foglalja össze
egy kártyán, linkkel a lapra.

**Anyaglista a munkához — Wow #7 hiányzó harmada** (`munkak/[id]/page.tsx`):
a forrás-ajánlat "anyag" kategóriájú tételei mennyiséggel, és ha van
hozzájuk aktív nagyker-tétel, a beszállító beszerzési árával és a becsült
beszerzési összeggel; "Lista másolása" gomb a nagyker-rendeléshez.
**Tudatosan a vállalkozó saját árlista-kategóriáiból épül**, nem a
`mag/anyagszukseglet.mjs` beégetett térkövezés-anyagaiból — azok
terméknevei nem egyeznének az ő árlistájával, és kitalált tétel lenne. Ami
nincs "anyag"-ként felvéve, az itt sem jelenik meg, és a felület ezt
kimondja. Ez belső nézet: a beszerzési ár a dokumentum-oldalra és a
nyomtatásba továbbra sem megy ki.

**Számla fizetve** (`szamlaFizetve`): belső nyilvántartás, nem külső
hatású művelet — nem megy a kapun (ugyanaz az érv, mint az
`ajanlatAllapotValtas`-nál). Enélkül a szimulált számla örökké
kintlévőség maradt volna.

**Lejárt ajánlat — származtatva, nem tárolva** (`lib/ajanlat-allapot.ts`):
kiküldve + az `ervenyes_ig` a mai nap előtt. Nincs időzített feladat,
nincs GET közbeni írás; a lista, a részletező, a partner-lap, a "Ma"
függő-számlálója és az AI partner-helyzet ugyanabból az egy szabályból
számol. Piszkozat nem jár le (nem küldtük ki).

**Teendő az AI-dobozból** (`szandek.ts` `feladat_felvetel`): "Írd fel,
hogy hívjam fel Kovácsot holnap" → teendő, az EREDETI (ékezetes) szöveggel
címként, opcionális nap-szóval határidőnek, és ha a címben ismert partner
van, hozzákötve (`forras: "ai_doboz"`). Kapu nélkül, mint a naptár.

**Partnerkeresés toldalékos alakra** (`partnerKereses` a
`(vedett)/actions.ts`-ben): "Kovácssal", "Kovácsnak", "Kovácshoz" — nem
morfológia, hanem a partner nevének első szava a mondat egy szavának
elején (≥ 4 betű). **Több találatnál nem választ** (CLAUDE.md 5. szabály),
hanem felsorolja őket és pontosítást kér. A naptár-ág is erre állt át.

**Ellenőrzés**: `npm run build` tiszta (30 route); a szándékfelismerő 11
esete és az illeszkedés 9 esete szkripttel (`node
--experimental-strip-types` közvetlenül a TS-en); az új táblákon RLS
kényszerítve (SQL-lel ellenőrizve); ellenséges felülvizsgálat 5
nézőpontból (tenant, állapotgép/pénz, bemenet, verseny/atomicitás,
termékszabályok) — az eredménye és a javítások lentebb. ⚠ Élő, böngészős
végigkattintás **nem történt**: a beágyazott böngészőben nem volt
bejelentkezett munkamenet (lásd 2.9). Vincének érdemes egyszer
végigmennie: csomag felvétele → AI-doboz "50 m² [csomagnév]" → jóváhagyás
→ Szerkesztés → Kiküldöm → Másolat; "Hogy állunk …?"; "Írd fel, hogy …".

**Az ellenséges felülvizsgálat eredménye és a javítások.** 11 megerősített
állítás (4 magas, 6 közepes, 1 alacsony), 0 elutasított; a teljes riport
`docs/felulvizsgalat-2026-09-03-bovites.md`, a lényeg itt:

- **H1 — az AiBox nem renderelte az új állapotokat.** Valós volt, és a
  gyökérok tanulságos: az AiBox-átírás egy `&&`-láncban állt egy bukó
  teszt UTÁN, ezért a fájlírás csendben kimaradt, a build pedig a régi
  fájllal is fordult (a JSX-feltétellánc nem kimerítőség-ellenőrzött).
  Javítva: a két új ág + a beviteli mező ürül lefutott parancs után
  (különben az újraküldés duplán írna). **Tanulság: fájlírást soha ne
  köss `&&`-vel teszt eredményéhez.**
- **H2 — inaktív termék csendben beárazódott** (másolat, szerkesztés,
  csomag-ajánlat): az árlista nem töröl, csak inaktivál, és az
  `ajanlatSzamitas` nem szűrt aktívra. Javítva egy helyen, minden hívóra:
  `.eq("aktiv", true)` + Set-alapú hiányellenőrzés (ez egyben egy
  rejtett hibát is megszüntet: ugyanaz a termék két sorban eddig hamis
  "nem elérhető" hibát adott). A Másolat az inaktív tételeket kihagyja és
  a toast megmondja, hányat; a csomag-ág névvel utasítja el az inaktív
  tételt.
- **H3/H4 — a vezérelt `<select>` csendes cseréje.** Ha a sor termékét
  időközben inaktiválták, a böngésző (és a React) az ábécé ELSŐ aktív
  termékét jelöli ki, a FormData a DOM-ból megy → 20 m² térkő helyett
  "Ágyazóhomok 20" ment volna a szerverre, figyelmeztetés nélkül; a
  csomagnál ugyanez az árazási törzsadatot rontotta volna el tartósan.
  Javítva: jelölt "Már nincs az árlistában" opció tartja a helyet (NEM
  disabled — az kimaradna a FormData-ból és elcsúsztatná az
  indexpárosítást), piros figyelmeztetés, a csomag-szerkesztő a
  hivatkozott inaktív terméket "— inaktív" jelöléssel mutatja, és a
  szerver (`csomagok/actions.ts`, `ajanlatSzamitas`) névvel utasít el.
- **M1 — nem atomi mentés + TOCTOU a kiküldéssel.** Javítva a minimális,
  csak-TS változat: a szerkesztés fej-UPDATE-je `allapot = 'piszkozat'`
  feltételű (Postgres sorzár alatt atomi; 0 sor → hiba, a tételekhez hozzá
  sem nyúlunk), a kiküldés állapotváltása compare-and-set (`piszkozat` +
  a kapu naplójában rögzített bruttó); ha közben változott, a naplósor
  `elvetett` + hibaüzenet, hiba-toast, és NEM állítunk kiküldést.
  ⚠ **Ami tudatosan nyitva maradt**: a fej → tételek törlése → tételek
  beszúrása három külön PostgREST-hívás; egy közbeeső Supabase-hiba
  fej-új-összeg/nulla-tétel piszkozatot hagyhat, amit az újramentés
  helyrehoz. A teljes lezárás egy `0021` SECURITY INVOKER RPC
  (`select … for update` + a három írás egy tranzakcióban) — akkor
  érdemes, ha a szerkesztés valós használatba kerül.
- **M2 — az `ervenyes_ig` csak létrehozáskor íródott**, így egy régebbi
  piszkozat kiküldve azonnal "lejárt" lett volna. Javítva:
  `alapErvenyesseg()` egy helyen, a kiküldés újraindítja a 30 napot.
- **M3/M4 — csomag- és partnerkeresés találgatott.** Mindkettő a
  `lib/szandek.ts`-be került (DB nélkül tesztelhető):
  `csomagKereses` rangsorral (pontos → név-előtag toldalékkal, a
  leghosszabb nyer → csonka bevitel → részsztring ≥ 4 betű, egymásba
  ágyazott neveknél a hosszabb; egyébként `tobb` → kérdez);
  `partnerKereses` `biztos` jelzéssel (teljes név egész szavakként =
  biztos; részsztring/első-szó-előtag = tipp). A teendő CSAK biztos
  találatot köt partnerhez ("nagyon fontos a beton" nem a Nagy Kft.-ről
  szól); az ajánlat-ág tippnél feltételezés-sorban kimondja, mit értett.
- **M5 — túl tág teendő-kiváltók**: "Állíts be 20% kedvezményt", "Vegyél
  fel egy partnert", "Rögzíts egy számlát" csendben teendő lett volna.
  Javítva a prototípus őrével: ezek az igék CSAK nap-szóval teendők,
  különben a 0. réteg továbbad (ismeretlen).
- **M6 — egység-átértelmezés**: "30 m²" egy fm-alapú csomagra 30 fm-et
  adott volna. Javítva: nem-m² csomagnál hiba, nem átszámolás.
- **L1 — jogosultságok**: a Supabase default-jogai miatt az `anon` és az
  `authenticated` MINDEN public táblán ALL-t örökölt (TRUNCATE-tel, amire
  az RLS nem vonatkozik); az anon-t egyedül a 0003-as
  `revoke execute on aktualis_ceg()` tartotta távol. Javítva:
  `0020_jogosultsag_szukites.sql` — anon: semmi táblajog; authenticated:
  csak select/insert/update/delete; ugyanez a `postgres` szerep default
  privileges-ében a jövőbeli táblákra. Élesben ellenőrizve (anon: 0 sor a
  `role_table_grants`-ban; a naptár-feed `.ics` továbbra is 200). ⚠ A
  `supabase_admin` default ACL-je (anon=ALL) marad, azt `postgres`-ként
  nem lehet módosítani — a migrációk `postgres`-ként futnak, ezért nem
  érinti őket; ha valaha `supabase_admin`-ként jönne létre tábla, arra
  külön revoke kell.

**Ellenőrzés a javítások után**: build tiszta; 15 szándék-eset + 8
partnerkereső + 9 csomagkereső eset (mind zöld); a 0020 hatása SQL-lel;
a feed `curl`-lel. A tesztek a repóban vannak, bármely gépen futnak,
DB nélkül:

```bash
cd webapp && node --experimental-strip-types --no-warnings src/lib/szandek.teszt.mts
node webapp/src/lib/kereses.teszt.mjs
```

### 2.11 2026-09-04 — A lépcsős AI-réteg bekötése (OpenAI): 1. réteg, napi összefoglaló, kísérőlevél

Vince: "ma bekötöm a ChatGPT API-t — találd ki, milyet, mennyit fogyaszt
egy felhasználón, és tegyünk bele több API-s részt optimalizálva." Ez a
CLAUDE.md költségszabályának (0. → 1. → 2. réteg) első valódi bekötése;
eddig kulcs híján csak a 0. réteg futott.

**Modellválasztás (2026-09-04-i listaárak, USD / 1M token — forrás:
developers.openai.com/api/docs/pricing; a kód `lib/ai/naplo.ts`
`MODELL_ARAK_USD_1M` táblája, dátummal):**

| Feladat | Modell | Be / cache / ki | Miért |
|---|---|---|---|
| 1. réteg — zárt sémás szándékfelismerés | `gpt-5-nano` | 0,05 / 0,005 / 0,40 | a legolcsóbb; zárt séma mellett elég |
| Rövid magyar szöveg (összefoglaló, kísérőlevél) | `gpt-5-mini` | 0,25 / 0,025 / 2,00 | 8× a nano ára, még mindig fillérek |
| — nem kell — | gpt-5.6 Sol / gpt-6 Astra | 4/20 · 10/50 | 16–200× drágább; a 6. és 15. modulnál, spike-ok után |

Mindhárom modellnév env-ből felülírható (`OPENAI_MODELL_OLCSO`,
`OPENAI_MODELL_EROS`), a kulcs `OPENAI_API_KEY` (csak szerveren; lásd
`.env.local.example`). **Kulcs nélkül minden működik tovább a 0. réteggel**
— az AI-doboz ezt ki is írja, az összefoglaló és a kísérőlevél egyszerűen
nem jelenik meg.

**Fogyasztás egy cégre (becslés; a tényleges számot az `ai_naplo`
`koltseg_ft` oszlopa adja, és a spike-mérés):** feltevés 300
parancs/hó, ebből ~40% jut az 1. rétegre (a 0. réteg lefedettsége a
spike korpuszán felső becslés), hívásonként ~700 be / ~120 ki token;
22 napi összefoglaló (~600/200); 10 kísérőlevél (~500/250); 380 Ft/USD.

| Tétel | Havi hívás | Havi költség |
|---|---|---|
| 1. réteg (nano) | ~120 | ~4 Ft |
| Napi összefoglaló (mini) | 22 | ~5 Ft |
| Kísérőlevél (mini) | 10 | ~2 Ft |
| **Összesen** | | **~11 Ft / cég / hó** |

Tízszeres használat mellett is ~110 Ft. A valódi kockázat nem az ár,
hanem az elszabadult hurok — ezért **napi hívásplafon cégenként**
(`AI_NAPI_PLAFON`, alap 200, az `ai_naplo` sorai számolják; elérve minden
AI-funkció barátságos hibát ad): a legrosszabb eset 200 mini-hívás/nap
≈ 50 Ft/nap. Az OpenAI prompt-cache csak 1024 token fölött indul, a
mi promptjaink kisebbek — ezért nem építünk rá.

**Amit beépítettünk (mind naplózva, plafonnal, AI Act-jelzéssel):**

- **1. réteg az AI-dobozban** (`lib/ai/reteg1.ts`, `(vedett)/actions.ts`):
  CSAK akkor hívódik, ha a 0. réteg `ismeretlen`-t ad. Responses API,
  `strict` JSON-séma a webapp NÉGY műveletére (ajánlat, naptár, teendő,
  partner-helyzet) + `ismeretlen`; a modell megkapja a cég partner- és
  csomagneveit (max 60/30), hogy a "Kovácsék"-at feloldja, de a végső
  illesztés továbbra is a determinisztikus `partnerKereses` (több
  jelölt → kérdez). A válasz ugyanabba az `Ertelmezes` alakba fordul
  (`reteg1Ertelmezesse`, tiszta, tesztelt), és **ugyanaz a `vegrehajt`
  fut**, mint a 0. rétegnél — a modell megért, nem számol. Hiányzó adatnál
  `kerdes` állapot: a modell rövid visszakérdezése jelenik meg, semmi nem
  íródik. A gpt-5 család gondolkodó modell: `reasoning.effort: "minimal"`
  (késleltetés és költség miatt), `temperature`-t nem küldünk (nem
  támogatott). Az `ai_naplo`-ba kerül a teljes bemenet (utasítás-név +
  a modellnek adott szöveg), a válasz, tokenek, Ft — 2. sarkalatos szabály.
- **Napi összefoglaló** (`lib/ai/osszefoglalo.ts`, `osszefoglalo-actions.ts`,
  `NapiOsszefoglalo.tsx`, tábla `napi_osszefoglalok` — 0021): a
  vízió-dokumentum "Jó reggelt, Zoli!" képernyője. Naponta EGYSZER
  cégenként, tárolva (kulcs: cég+nap; párhuzamos megnyitásnál a második
  a tároltat olvassa). A bemenet kizárólag determinisztikus tény (a "Ma"
  oldal számai, mai naptár, régóta várakozó ajánlatok), az utasítás tiltja
  a kitalált számot/tanácsot. A kliens-komponens kéri le betöltéskor — az
  oldal renderje nem ír adatbázist. ⚠ A `maiTenyek` a page.tsx
  lekérdezéseinek másolata; ha bővül, érdemes a page.tsx-et is erre
  átállítani.
- **Kísérőlevél az ajánlathoz** (`lib/ai/kisero.ts`, `kiseroSzovegGeneralasa`,
  `KiseroLevel.tsx`, oszlop `ajanlatok.kisero_szoveg` — 0021): kérésre
  generált magázó PISZKOZAT (tárgy + törzs), tárolva, "Levél másolása"
  gombbal. **Nem küld e-mailt** (10. modul, V2; Gmail tilos) — a
  vállalkozó a saját levelezőjébe másolja.
- **AI Act 50. cikk**: eddig hiányzott. Az AI-doboz felett állandó
  jelzés, és MINDEN válasz alatt "0. réteg · helyi mintaillesztés" vagy
  "1. réteg · nyelvi modell: gpt-5-nano"; az összefoglaló és a kísérőlevél
  alatt "AI-generált szöveg — ellenőrizd".
- **Spike 4 mérhető a te kulcsoddal**: `spike/parancs/merd.mjs` kapott
  OpenAI-ágat (ugyanaz a séma/utasítás, Responses API) —
  `OPENAI_API_KEY=... node parancs/merd.mjs --reteg1` a 68 mondatos
  korpuszon valódi tokenszámot és Ft/hívást mér. **Ezt Vince futtassa**,
  a kulcs nem kerül a chatbe és a repóba.

**Ellenőrzés**: build tiszta; `reteg1.teszt.mts` 13 eset (leképezés,
kérdés-ágak, ISO dátum, rossz idő) + a korábbi 32 eset zöld; a 0021
alkalmazva; `tsconfig` `allowImportingTsExtensions` bekapcsolva (a
tesztek Node-dal, bundler nélkül futhatnak). ⚠ **Valódi modellhívás NEM
történt** ebben a munkamenetben — nincs kulcs a gépen. Az első éles
próba Vincénél: kulcs a `.env.local`-ba, `npm run build && npm start`,
majd az AI-dobozba egy 0. réteg által nem ismert mondat (pl. "Kovácséknak
kéne egy ajánlat úgy nyolcszáz négyzetre") → a válasz alatt "1. réteg ·
gpt-5-nano", az `ai_naplo`-ban egy sor Ft-költséggel. Ha a Responses API
egy paramétert visszautasít (pl. `reasoning.effort` egy más modellnél), a
doboz a modell hibaüzenetét mutatja — ott kell igazítani, nem csendben
tűnik el.

**Tudatosan NEM**: 6. modul (számlafotó-kiolvasás) — a 2. spike (50–100
valódi számla) előtt tilos; a kulccsal a spike most futtatható.
Csúcsmodell — nincs rá feladat. Beszélgetés-előzmény — az AI-doboz
egyfordulós, nincs kontextus-plafon gond.

**Kulcs-bekötés, ahogy tényleg történt (tanulság a következő gépre):** a
kulcs beillesztése négy nekifutásba került — a chatben adott parancsot a
felhasználó változatlanul futtatta (a helyőrző szöveg került a fájlba), majd
a kulcsot közvetlenül a promptba illesztette (a zsh `command not found`-ot
írt, a kulcs a shell-előzménybe került), végül a terminál paszta-duplázása
miatt háromszor egymás után íródott be. A működő út: egy `read -s`-sel
bekérő parancs, amit a felhasználó futtat, és a kulcsot a promptba
illeszti; utána a fájl ellenőrzése az érték kiírása NÉLKÜL (hossz, `sk-`
előtag, ismétlés). A chatbe került első kulcsot a felhasználó visszavonta.
Az OpenAI-fiókban ekkor még nem volt egyenleg ("no credits remaining") —
a kulcs érvényes, a feltöltés a felhasználó dolga. **A spike ingyenes
része már megjött**: a 68 mondat 92,6%-át a 0. réteg oldja meg, 0 téves
felismeréssel — a modellre a becsült 40% helyett ~8% jut (felső becslés,
a korpuszt a minták írója írta).

### 2.12 2026-09-04 — Hang: nyomva tartós mikrofon, „mik a teendőim?", felolvasás

Vince: "a hangot oldjuk meg — naptárba bevinni dolgokat, megkérdezni, mik
a teendők, és erre válaszoljon". A CLAUDE.md "félretéve" státusza ezzel
megszűnt (a fájl frissítve).

**Elv**: a hang nem új "agy", hanem új BEMENET. A gomb csak szöveget ad,
ami ugyanabba a csőbe megy (0. → 1. réteg → `vegrehajt`), mint a gépelt
parancs — semmi új szándéklogika nem került a hangba.

- **`HangGomb.tsx`** — push-to-talk (pointer le/fel, billentyűvel is;
  hosszú nyomásra nincs kontextusmenü; `touch-action: none`), 64 px, rezgés
  a felvétel elején/végén, másodperc-számláló, legfeljebb 15 mp. Két
  lépcső: (1) **a böngésző saját felismerője** (Web Speech API, `hu-HU`,
  `continuous` + `interimResults`, a köztes átirat látszik) — 0 Ft; (2)
  **felhő-tartalék**: `MediaRecorder` (webm/opus, iOS-en mp4) → Server
  Action (`hang-actions.ts`) → `lib/ai/hang.ts` → OpenAI
  `/v1/audio/transcriptions` (`gpt-4o-mini-transcribe`, 0,003 $/perc,
  `language: hu`). Felhő akkor, ha a böngésző nem tud hangot, vagy a
  felhasználó "zajos helyszín (felhő)" módra kapcsol (localStorage-ban
  marad). Nincs folyamatos hallgatás, nincs ébresztőszó.
- **Naplózás**: minden felhős átirat az `ai_naplo`-ban (`hang_atirat`,
  hossz mp-ben, percarányos Ft) — a 3. spike szándékpontossága így élesben,
  folyamatosan mérhető; a böngészős út 0 Ft, nincs szerverhívás.
- **„Mik a teendőim?"** — új `teendok` szándék a 0. rétegben
  (`mai teendo|mi a dolgom|teendoim|teendok|mi van ma|napirend|…`) és az
  1. réteg sémájában; a hub csak OLVAS: nyitott teendők (sürgős elöl) +
  mai naptár, és egy-két felolvasható mondatot ad a saját adatokból (nem
  modell-szöveg). Az AiBox listát mutat linkekkel.
- **Felolvasás** (`lib/felolvasas.ts` + `speechSynthesis`, `hu-HU`): CSAK
  hangból jött parancs után szól, kikapcsolható ("felolvasás ki",
  localStorage). Minden eredménytípushoz egy rövid mondat; az ajánlatnál
  kimondja, hogy a képernyőn kell jóváhagyni.
- **Biztonság/őszinteség**: az átirat megjelenik a mezőben, és a kockázatos
  kimenet (ajánlat) továbbra is a jóváhagyó lapon áll meg; naptár/teendő
  szerkeszthető. Üres vagy túl rövid felvételnél nem küld semmit.

**Ellenőrzés**: build tiszta; szándék-teszt 16 eset (+ teendok), leképezés
14, felolvasás 7 — mind zöld. ⚠ **Mikrofonos, élő próba NEM történt**: a
beágyazott böngésző nem ad mikrofont, és a felhős átíráshoz egyenleg kell.
Vince próbája telefonon (Chrome/Safari, HTTPS vagy localhost kell a
mikrofonhoz): nyomva tart → "holnap tízkor megyek Kovácshoz" → elenged →
az átirat a mezőben, naptárbejegyzés, felolvasva; majd "mik a mai
teendőim?" → lista + felolvasás. Firefoxban csak a felhős út megy.

### 2.13 2026-09-10 — Élesítés Zolinak: Vercel + munkatárs meghívása

Cél: egy cím Zolinak (az első valódi tesztelő) és belépés — jelszó
kézbeadása és kézzel gyártott fiók NÉLKÜL.

**Munkatárs meghívása** (`0022_munkatars_meghivas.sql`, Cégprofil →
Munkatársak, `regisztracio/befejezes`): a tulajdonos felvesz egy e-mailt
(függő meghívás: `felhasznalok`-sor `auth_user_id` nélkül); a meghívott a
saját címével regisztrál a belépő oldalon; a `sajat_ceg_letrehozasa` a
MEGERŐSÍTETT e-mail alapján a meglévő sorhoz köti a fiókot, és nem hoz
létre új céget — így Zoli a demóadatos cégben landol. A befejező oldal
"Csatlakozom: <cég>"-et mutat (`fuggo_meghivas` RPC), cégnév mező nélkül.
Biztonság: csak `email_confirmed_at` mellett köt (más nevében nem lehet
beülni egy meghívásba); egy cégen belül egy e-mailre egy függő meghívás.
**Mellékhatásként javított hiba**: a `felhasznalok` táblát eddig a cég
MINDEN tagja írhatta — egy munkatárs a saját szerepét tulajdonosra
írhatta volna. Most: olvasás minden tagnak, írás/törlés csak a
tulajdonosnak (`sajat_szerep()` SECURITY DEFINER segéd, hogy a policy ne
hivatkozzon rekurzívan a saját táblájára); élő tag törlése szándékosan
nincs (külön döntés, mi legyen az adataival).

**Vercel — ahogy ténylegesen élesedett (2026-09-10).** Projekt:
`zolt-n-g-l-ppdl` a Vince-csapatban ("garntos", Hobby), cím:
https://zolt-n-g-l-ppdl.vercel.app, a GitHub-repóból; production ág:
`claude/projekt-folytatasa-p0titv` — minden push erre az ágra automatikusan
élesedik. Buktatók, amikbe beleszaladtunk:

- **Az első import „Other" presettel és `./` Root Directoryval futott**: a
  Vercel a repó GYÖKERÉT tette ki statikus fájlként (404 a főoldalon, de a
  `/HANDOVER.md`, `/CLAUDE.md` és a prototípus olvasható volt). Új
  kiszivárgás nem volt, mert a GitHub-repó maga is nyilvános, és a teljes
  git-előzményben kulcsot nem találtunk (OpenAI-kulcs, `sb_secret_`, JWT:
  0). Javítás: Settings → Build and Deployment → Root Directory `webapp`,
  Framework Preset Next.js, „Include files outside the root directory" BE (a
  `mag/` import miatt), „Skip deployments" KI (különben egy csak `mag/`-ot
  érintő push nem élesedne).
- **A Vercel a `NEXT_PUBLIC_` kezdetű változókat nem engedi Secretként
  menteni** — ezek Config típusúak (úgyis a böngészőbe kerülnek; az adatot
  az RLS védi). Az `OPENAI_API_KEY` külön körben, Secretként; egyenleg
  nélkül szándékosan kimaradhat: akkor a 0. réteg fut, és a felhasználó nem
  lát angol nyelvű számlázási hibát.
- **Élesben beállított változók**: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SITE_URL=https://zolt-n-g-l-ppdl.vercel.app` (+
  `OPENAI_API_KEY`, ha van egyenleg). A többi env-nek van kódbeli
  alapértéke.
- **A Claude-oldali Vercel-eszköz ennek a csapatnak a projektjeit és
  build-naplóit NEM látja** (üres lista, 401) — az élesítést innen csak a
  nyilvános címen, `curl`-lel lehet ellenőrizni. Egy korábbi, elbukott
  eszközös próbálkozás hagyhatott egy üres `zolt-n-g-l` projektet a
  csapatban; ha ott van, törölhető.
- **Hobby csomag**: a Vercel feltételei szerint nem kereskedelmi
  használatra szól; éles üzleti használathoz Pro kell. A
  szerverfüggvény-időkorlát rövid; az AI-hívások beleférnek.

**Supabase — két kézi beállítás (Vince):** Authentication → URL
Configuration: Site URL `https://zolt-n-g-l-ppdl.vercel.app`, Redirect URLs
`https://zolt-n-g-l-ppdl.vercel.app/**`. Authentication → Sign In /
Providers → „Allow new users to sign up" KI — ettől lesz „csak Zolinak": a
cím nyilvános, de csak felvett fiók lép be, és nyílt regisztrációval senki
nem nyithat korlátlan számú céget (a napi AI-plafon cégenként számol).

**Zoli fiókja — miért nem önregisztrációval:** a Supabase beépített
levélküldője CSAK a Supabase-csapat tagjainak kézbesít, óránként legfeljebb
2 levelet (a dokumentációjukban ellenőrizve) — Zoli megerősítő e-mailje nem
érkezne meg. Ezért a sorrend: (1) Vince a Cégadatok → Munkatársak alatt
meghívja Zoli e-mailjét — ELŐSZÖR ezt, különben Zoli első belépéskor üres
saját céget kap; (2) Supabase → Authentication → Users → Add user → Create
new user, „Auto Confirm User" bepipálva, a jelszót Vince választja; (3) Zoli
belép, a befejező oldalon "Csatlakozom: <cég>", és a demócégben dolgozik
munkatársként. A fiókot és a jelszót a tulajdonos hozza létre, nem az AI.
Hosszabb távon egyedi SMTP kell (pl. Resend), hogy az önregisztráció és a
meghívó-levél is működjön.
### 2.14 2026-09-10 — Zolinak: teljes hangos ajánlat, őszinte küldés, demóadatok

A felhasználói értékelés két legsúlyosabb pontja ("a hangos ajánlat hiányos",
"a Kiküldöm nem küld") és a demócég feltöltése.

- **Kerülettel arányos csomagtétel** (`0023_munkacsomag_kerulet.sql`,
  `lib/munkacsomag.ts`): a `munkacsomag_tetelek.alap` `terulet` (alap) vagy
  `kerulet`. A szegély a kerülettel arányos, ami NEM egyenes arány a területtel
  (50 m² → 30 fm, 800 m² → 115 fm); a becslés a mag `keruletBecsles`
  függvénye (négyzet alak, 5 fm-re kerekítve), ugyanaz, mint a prototípusban.
  Darabos egységnél (zsák, db, alkalom…) felfelé kerekít. Tesztek:
  `src/lib/munkacsomag.teszt.mts`, 10 eset. A csomag-űrlapon soronként
  „Mihez arányos?" választó.
- **Alapértelmezett csomag az AI-dobozban**: ha a mondat nem nevez meg
  csomagot, és pontosan egy m²-alapú csomag van, azzal számol, és ezt a
  feltételezés kimondja; ha több van, RÁKÉRDEZ (5. szabály); ha nincs, marad a
  régi közelítés. A kerület-becslés feltételezésként megjelenik az ajánlaton.
- **„Kiküldöm" helyett „Küldés az ügyfélnek" panel**
  (`ajanlatok/[id]/KuldesPanel.tsx`): 1. ügyfél-PDF, 2. e-mail a saját
  levelezőből előre kitöltve (`mailto:`; a kísérőlevél, ha van, különben alap
  szöveg) vagy szöveg másolása üzenethez, 3. kötelező pipa „Elküldtem az
  ügyfélnek", és csak utána „Kiküldöttnek jelölöm" — ez megy a jóváhagyási
  kapun. A pipát a szerver is ellenőrzi. A rendszer továbbra sem küld e-mailt
  (V2). Napló: „Kiküldöttnek jelölve"; a toast a 3 napos utánkövetést
  ígéri, ami a "Ma" oldalon már működik.
- **Érvényesség**: piszkozatnál az ügyfél-dokumentum és a levél is a mai
  naptól számított 30 napot mutatja — ugyanazt, amit a jelölés rögzít.
- **Demóadatok a „vince kft"-ben** (Zoli ennek a munkatársa): +7
  árlista-tétel (szegélykő, ágyazó homok, fugahomok, geotextília, gépi
  tömörítés, kiszállás, konténer); „Térkövezés" munkacsomag 10 tétellel, a
  `mag/anyagszukseglet.mjs` konstansaival (15 cm ágyazat ×1,25, 4 cm homok,
  5% vágás, 2 kg/m² fugahomok), két kerület-tétellel; +3 kitalált partner
  foglalt `.example` e-mail-címmel; a Kovács Építő e-mail-címe; 6
  nagyker-tétel a Tüzéptől; a munka címe és határideje; 3 jövőbeli
  naptár-esemény; 2 teendő. Az új partnereknél és a csomagnál „Demóadat"
  jelölés. A cégadatokhoz (adószám, bankszámla) nem nyúltunk: azt a
  tulajdonos töltse ki valódi adatokkal.
- **Ellenőrzés**: a tesztek zöldek, a build tiszta. ⚠ A panelt és a hangos
  ajánlatot bejelentkezve NEM kattintottuk végig — ehhez a felhasználó
  belépése kell. (Pótolva: lásd 2.15.)

### 2.15 2026-09-10 — Minden gomb végigpróbálva élesben, javítások, helyes demóadatok

Kérés: „próbálj végig minden gombot", „töltsük fel hasznos, helyes adatokkal".
Élesen, Vince fiókjával, telefonméretben (375 px), a Browser panelben; ahol a
panel rejtve volt, a kattintás JS-ből ment, és minden írást SQL-lel is
visszaellenőriztünk.

**Talált és javított hibák** (mind élesítve, commitok `47b2f3b`…`78fb5d9`):
- **Naptár: a hét-nézet SOHA nem mutatott eseményt.** A „következő hét" a
  vasárnapból visszaszámolt ugyanazon hétfő lett, a lekérdezés üres
  tartományt kapott, a „Következő hét" gomb helyben maradt. Új, tesztelt
  segéd: `hetTartomany()` (`lib/het.ts`, `het.teszt.mts` 14 eset),
  budapesti éjfél határokkal. A többnapos esemény minden érintett napon
  látszik („folytatás"); mentés után az esemény hetére vagy a munkához
  ugrik (eddig mindig a mai hétre); a munkaválasztóban „Partner — helyszín".
- **Visszavonhatatlan mellényúlások**: az inaktivált tétel/csomag, az
  archivált partner és a késznek jelölt teendő eddig sehol nem volt
  visszahozható (a csomag hibaüzenete mégis „aktiváld újra"-t kért). Most a
  lista alján „Inaktív… / Archivált… / Elvégzett" szakasz visszaállító
  gombbal, toasttal.
- **Végleges törlés és visszavonás megerősítéssel**
  (`components/ui/MegerositoGomb.tsx`): teendő, időpont, dokumentum, fotó,
  munkatárs- és könyvelő-meghívás.
- **Másolás**: tiltott vágólapnál csendben nem másolt — a régi
  vágólap-tartalom mehetett volna az ügyfélnek. `lib/vagolap.ts` tartalék,
  ha az sem megy, kijelölhető mező.
- **Telefonos menü**: 375 px-en a Naptár és a Teendők kilógott; a Több menü
  kilógott a képernyőből, és érintésre nem záródott.
- **AI-ajánlat**: a jóváhagyó lap feltételezései (csomag, becsült kerület)
  az ajánlaton is megmaradnak (`ajanlatok.feltetelezesek`) és látszanak; a
  jóváhagyó lap hibánál kiírja az okát (eddig csendben visszaállt); nettó
  sor. Partner-illesztés: két „Kovács" közül a mondat szavai döntenek
  („Kovács Építővel"); AI-ajánlatnál a beszállító nem jelölt.
- **Magyar kiírás**: mennyiség tizedesvesszővel, m²/m³ (jóváhagyó lap,
  ajánlat, ügyfél-PDF, anyaglista; `format.teszt.mts`); „2026. október
  10-ig"; „az AJ-…"; a munkaidő-jelzés az anyagot nem számolja; a teendő
  lejártsága budapesti nap szerint; a cím-mezőkön `autocomplete="off"` (a
  teendőcímekbe partnercímek kerültek a böngésző előzményeiből).
- Elfogadott ajánlaton „Munka megnyitása".

**Végigpróbálva, működik**: az AI-doboz mind a 6 mintamondata; jóváhagyó lap
✕ / Mégsem / Jóváhagyom; offline sor (Most elküldöm, Törlöm a sorból); az
ajánlat teljes életútja (kézi űrlap csomagból + sor hozzáadása/törlése,
szerkesztés, másolat a mai árakon, küldés-panel — pipa nélkül blokkol —,
elfogadás → munka + anyaglista, elutasítás, számla, fizetve); ügyfél-PDF
belső adat nélkül, nyomtatás; munka (mentés, állapotok, anyaglista-másolás,
fotó feltöltése és törlése a Storage-ból is, naptárba tétel); naptár (új,
szerkesztés, törlés, lapozás); teendők (felvétel, kész, visszanyitás,
törlés); árlista és csomag (új, szerkesztés, inaktiválás, visszakapcsolás);
nagyker-árfrissítés (elvetés, illetve „átvezetem, az árrésem marad":
Fugahomok 2000 → 2100 Ft, eladási 2400 → 2520 Ft); partner (új,
szerkesztés, archiválás, visszaállítás, keresés + törlő gomb); dokumentum
(rögzítés, törlés); cégadatok mentése; munkatárs meghívása és visszavonása
eldobható címmel (Zoli meghívása érintetlen); napfény mód, felolvasás;
mikrofon (a panel letiltja → helyes hibaüzenet).

**Szándékosan nem nyomtuk meg**: Kilépés (utána nem lehetne visszalépni),
logó feltöltése (a cég valódi arculata), könyvelő-meghívás (valódi e-mailt
küld), naptár „Új link kérése" (leállítaná a meglévő feliratkozást),
kísérőlevél (OpenAI-kulcs kell Vercelben; kulcs nélkül a napi összefoglaló
helyesen eltűnik).

**Demóadatok (vince kft), 2026-os árakkal**: 17 árlista-tétel a források
sávjain belül (qjob.hu, swterko.hu, Colas Északkő, joszaki.hu, daibau.hu);
két csomag rétegrenddel — Térkövezés (gyalogos: 15 cm zúzottkő 0/32, 4 cm
ágyazat, 6 cm térkő) és Kocsibeálló (30 cm zúzottkő két rétegben, 8 cm
térkő), a szegély a kerülethez arányos; nagyker a Tüzép beszerzési áraival;
a valódinak tűnő partner-e-mailek `.example`-re cserélve. Demó-történet: 8
ajánlat minden állapotban, 4 munka, 2 számla (egy nyitott → Kintlévőség), 5
jövőbeli esemény, köztük a Kovács-kivitelezés 09-21–23. A „TESZT … —
törölhető" sorokat a végén töröltük; az árfrissítés-javaslatok (a kapu
naplója) megmaradtak.

**Tanulságok**: (1) chainelt Bash-ben `cd webapp` után a `git add webapp/src`
elbukik — kétszer megtörtént; mindig `git -C <repó>`. (2) Rejtett Browser
panelen a kattintás és a képernyőkép időtúllép; a JS-kattintás megy, de az
időzítők lassúak — egy hívás egy lépés, az eredményt a következő hívás
olvassa. (3) Skálázott panelen a ref-kattintás mellé nyúlhat — nézd meg az
URL-t.

⚠ Nyitva: két lejárt, furcsa teendő („1112 Budapest, Fő út 5.",
„Telephely", 08-31-i kézi) valószínűleg böngésző-előzményből — a tulajdonos
zárja le, ha nem kell. A szerkesztés mentéskor minden tételt a mai
árlista-áron számol újra (piszkozatnál szándékos, de a felület nem jelzi).

### 2.16 2026-09-10 — Zolinak: szabolcsi adatok, hangos árajánlat

Zoli szabolcsi; neki az árajánlat-készítés és a hangvezérlés a legfontosabb.

**Szabolcsi demóadatok.** Minden partner, munka és esemény
Szabolcs-Szatmár-Bereg megyei címre került (Nyíregyháza, Kisvárda,
Mátészalka, Nyírtelek, Nyírbátor, Nyíregyháza-Oros; kitalált házszámok),
a Tüzép nyíregyházi körzetszámot kapott; új partner: Balogh Ferenc (Oros,
a becenév-próbához). Munkadíjak a régió árszintjén, az LBL-Kertépítés
(Szabolcs-Szatmár-Bereg) publikus árlistája alapján: tükörkészítés 1 800,
alapréteg rétegenként 1 400, ágyazóréteg 650, térkő lerakás 3 800 Ft/m²,
szegélykő rakás 3 000 Ft/fm. Zúzottkő 0/32: 11 500 Ft/m³, beszerzés
10 000 (Sajópetri, Nyéki Kavics 5 550 Ft/t 2026.02.01-től, ~1,5 t/m³ +
fuvar). Konténer 3–4 m³: 30 000 Ft (nyíregyházi ügyfél-visszajelzések:
28–30 ezer, qjob.hu). Bontás 4 000 Ft/m² — becslés (országosan 6–8 ezer,
sitt nélkül). Az anyagárak országosak maradtak. A két piszkozat (AJ-006,
AJ-007) az új árakon újraszámolva; a kiküldött/elfogadott ajánlatok az
eredeti áron maradtak, ahogy a valóságban is. Egy teljes rétegrendű
gyalogos felület 50 m²-en most ~20 500 Ft/m² nettó.

**Hangos árajánlat — a 0. rétegben**, mert élesben még nincs OpenAI-kulcs:
- szóval mondott számok ("nyolcvan négyzet" → 80, "kétszázötven",
  "tízkor") — csak mértékegység vagy időpont előtt, így az "egy
  ajánlatot" névelője nem lesz szám;
- "négyzet / négyzetes / nm" és a toldalékos alakok;
- rugalmas szórend: "Mennyibe kerülne 80 négyzet térkövezés Kovácséknak?",
  "Ajánlat Nagy Pistának 120 négyzet udvar";
- kimondott kerület: "36 méter szegéllyel" → a csomag kerület-tételei
  ezzel számolnak, nem becsléssel (a tő "szegel": a ly toldalékkal
  kettőződik — ez volt az első hiba a tesztben);
- becenevek: "Balogh Ferinek" → Balogh Ferenc, "Nagy Pistának" → Nagy
  István — csak tipp, a jóváhagyó lap kimondja;
- extrák a mondatból: "bontással", "két konténerrel", "kiszállással" →
  csak a csomagban nem szereplő, egyértelműen illeszkedő árlista-tétel,
  a feltételezésben kimondva (`lib/ajanlat-extrak.ts`);
- szabolcsi í-zés: a "kíszíts" is ige;
- ha a munka nem egyértelmű ("udvar": gyalogos vagy autós?), kérdez, a
  csomagok kulcsszavaival — nem számol minden m²-es tétellel.

**0024 `munkacsomagok.kulcsszavak`** (additív, nullable): vesszővel
elválasztott szavak ("bejáró" → Kocsibeálló), a csomag-űrlapon
szerkeszthető; az 1. réteg is a kulcsszavakkal kapja a csomagneveket.
**1. réteg**: `kerulet_fm` a sémában; "négyzet" és becenév-szabály az
utasításban.

**Ellenőrzés.** Tesztek: szandek +21 eset, ajanlat-extrak 7 (új),
munkacsomag +2, reteg1 +1 — mind a 7 csomag zöld, a build tiszta. Élesben
végigkattintva: a Balogh-mintamondat (becenév, kulcsszó, bontás mint
extra, szabolcsi árak — AJ-2026-009 létrejött, 4 feltételezéssel), a
Kovács-mintamondat (80 m², a mondatbeli 36 fm-es kerülettel), az "udvar"
visszakérdezés, a "hatvan négyzet bejáró két konténerrel" (kulcsszó +
2 db konténer), és a szabolcsi "Kíszíts ajánlatot Tóth Gábornak 30 négyzet
kocsibeállóra" (ugyanaz az ajánlat, mint a köznyelvi alakkal). ⚠ A mikrofont a Browser panel letiltja: a valódi
hangos próba Zoli telefonján jön. Ha a böngésző felismerője gyenge (zaj,
tájszólás), a felhős átírás a tartalék — ahhoz OpenAI-kulcs kell
Vercelben.
---

## 3. A sarkalatos szabályok

Ez a hét pont nem alkuképes. **Ha valamelyiktől el akarsz térni, kérdezz.**
Ahol „kikényszerítve" szerepel, ott már nem ígéret: kód őrzi.

| # | Szabály | Hol van kikényszerítve |
|---|---|---|
| 1 | **Jóváhagyási kapu az adatmodellben.** Külső hatású művelet állapotgépen megy át: `javasolt → jóváhagyott → végrehajtott` (mellékág: `kihagyott`, `elvetett`). Nincs `javasolt → végrehajtott` él. | `db/migraciok/0001_alap.sql` — trigger + ellenőrzés. Teszt bizonyítja. |
| 2 | **Minden AI-művelet naplózva**, bemenettel és kimenettel együtt, és a napló **nem írható át**. | `ai_naplo` tábla + trigger. Teszt bizonyítja. |
| 3 | **Multi-tenant izoláció adatbázis-szinten** (RLS), nem alkalmazáslogikában. | `force row level security` minden táblán. Teszt bizonyítja. |
| 4 | **Számlázást nem építünk**, integrálunk. | Döntés, lásd 6.4. |
| 5 | **Minden AI által kiolvasott adat mellett látszódjon a forrás**, és legyen egy koppintással javítható. Bizonytalanságnál kérdezzen, ne találgasson. | `szamlak.forras` kötelező, `kiolvasott_mezok` tábla. A telefonos prototípus meg is mutatja. |
| 6 | **AI Act 50. cikk** — a felületen jelezni kell, hogy AI-val beszél a felhasználó. | A telefonos prototípus fejlécében állandóan látszik. |
| 7 | **Jogi tartalomnál** a szóhasználat „kivonat és figyelemfelhívás", soha nem „elemzés" vagy „vélemény"; a felelősségkorlátozás magán a funkción. | Csak V1-ben lesz releváns (15. modul). |

### Két további szabály, ami a gyakorlatból jött

- **A modell megért, nem számol.** Az árkalkuláció determinisztikus kód
  (`mag/arkalkulacio.mjs`). A nyelvi modell csak a paramétereket tölti ki.
- **A „mit feltételeztem" lista ugyanabból a számításból származik**, mint az
  összeg — nem külön szöveg. Egy külön írt szöveg előbb-utóbb hazudna.

---

## 4. A repó térképe

```
CLAUDE.md                          minden munkamenet elején betöltődik — a szabályok
HANDOVER.md                        ez a fájl
README.md                          rövid belépő

mag/                               A TERMÉK MAGJA — saját, nem bekötendő
  arkalkulacio.mjs                 determinisztikus ajánlatszámítás
  arkalkulacio.teszt.mjs           12 teszt, köztük a demó végösszegének rögzítése
  fizetesi_hatarido.mjs            determinisztikus határidő a partner napszámából
  fizetesi_hatarido.teszt.mjs      6 teszt
  kintlevoseg.mjs                  nyitott/lejárt összesítés, partnerenkénti bontással
  kintlevoseg.teszt.mjs            6 teszt
  anyagszukseglet.mjs              a térkövezéshez kellő anyagok, a prototípuséval azonos konstansokkal
  anyagszukseglet.teszt.mjs        9 teszt
  eszkozok.mjs                     az AI-réteg eszközkészlete, zárt sémákkal + a kapu állapotgépe
  eszkozok.teszt.mjs               11 teszt

db/                                AZ ADATRÉTEG — fut és bizonyít
  migraciok/0001_alap.sql          12 tábla, RLS, az állapotgép triggere
  tesztek/sarkalatos_szabalyok.sql 22 állítás, közvetlen SQL-lel
  mintaadat/kohalo.sql             a prototípus adatai
  futtat.sh                        egy parancs: séma + tesztek
  README.md                        Supabase-telepítés, tervezési döntések

prototype/
  CEGEM-AI-telefon.html            A FŐ IRÁNY — telefon-első, önálló HTML
  telefon-artifact-body.html       ugyanaz Artifact-publikáláshoz (burok nélkül)
  CEGEM-AI-prototipus.html         asztali változat, mind a 16 modul
  artifact-body.html               ugyanaz Artifact-publikáláshoz
  fustproba.mjs                    129 ellenőrzés a telefonos prototípuson

webapp/                            A VALÓDI BACKEND — Next.js + Supabase, fut
  next.config.ts                   a `turbopack.root` a repó gyökeréig megy fel,
                                    mert a `mag/`-ból importál — lásd 9. fejezet
  src/lib/mag.ts                   az EGYETLEN hely, ami a `mag/`-ra relatív
                                    úttal hivatkozik, explicit típusokkal burkolva
  src/lib/ajanlat-szamitas.ts      a kézi ajánlatűrlap ÉS az AI-doboz közös,
                                    kanonikus tétel/összesítés-számítása
  src/lib/szandek.ts               szándékfelismerés (0. réteg, regex, tiszta függvény)
  src/components/AiBox.tsx         a szöveges AI-doboz (kliens)
  src/components/JovahagyoLap.tsx  a jóváhagyó lap (a prototípus `lap` mintája)
  src/components/ui/               megosztott gomb/kártya/jelvény-osztályok
  src/app/(vedett)/                bejelentkezés mögötti oldalak: „Ma", ajánlat,
                                    munka, partner, árlista, teendő, cégprofil

docs/
  termekvizio-2026-08-31.md        ÚJ TERMÉKVÍZIÓ — lásd 2.1. fejezet
  fejlesztoi-specifikacio.md       A FORRÁS — 14 fejezet, elfogadási kritériumokkal
  kiadas/                          abból generált Word + PDF, és a generátorok
  iranyvaltas.md                   a 2026-08-26-i irányváltás és indoklása
  demo-forgatokonyv.md             4 perces bemutató, kérdés-válaszokkal
  megvalosithatosagi-terv.html     a felmérés (nap- és költségbecslések)
  parancsok.md                     mindkét prototípus felismert parancsai
  screenshots/

spike/                             a 0. fázis mérőeszközei — nem termékkód
  nav/            NAV bejövő számla lekérdezés (1. kérdés)
  szamlaolvasas/  kiolvasási pontosság, a CSENDES HIBA mérése (2. kérdés)
  hang/           magyar hangfelismerés, szándékpontossággal (3. kérdés)
  parancs/        lépcsős parancsfelismerés költsége (4. kérdés)
  eredmenyek/     ide kerülnek a riportok és a döntési lap
```

**Valódi ügyféladat nem kerülhet a repóba** (számla, NAV-válasz, hangfelvétel,
`.env`) — a `spike/.gitignore` ezt kizárja.

---

## 5. Hogyan ellenőrzöd, hogy nem rontottál el semmit

```bash
node --test mag/*.teszt.mjs        # mag — 43 teszt
./db/futtat.sh                     # séma + sarkalatos szabályok — 22 állítás
node prototype/fustproba.mjs       # telefonos prototípus — 129 ellenőrzés
cd spike && node parancs/merd.mjs  # a 0. réteg lefedettsége és a költségbecslés
```

A füstpróbához Playwright kell (`npm i playwright && npx playwright install
chromium`); hálózat nélkül is lefut, mert a külső kéréseket lezárja.

**Ha az árlistát módosítod**, három helyen kell egyeznie: `mag/arkalkulacio.teszt.mjs`,
`prototype/CEGEM-AI-telefon.html`, `prototype/CEGEM-AI-prototipus.html`. A
füstpróba ellenőrzi, hogy a két prototípus ugyanazt a végösszeget adja
(**12 485 922 Ft** a 800 m²-es demóparancsra). Ha ez elmozdul, a demó két
különböző számot mondana — és a bizalom pont ezen múlik.

---

## 6. Az eddigi döntések és miért

### 6.1 Nem mind a 16 modult egyszerre

A teljes rendszer 350–500 fejlesztői nap. Az MVP a **13+14 modulra** épül
(ajánlatkészítés + árlista), mert ez a legmeggyőzőbb funkció egy kivitelezőnek,
és **nem függ egyetlen külső engedélytől sem**.

**MVP modulok: 1, 2, 3, 11, 12, 13, 14** — és **6 feltételesen** (csak ha az
1. spike zöld; különben V1). Így az MVP 85–105 nap a korábbi 110–140 helyett.

V1: 4, 5, 7, 8, 9, 15. V2: 10 (e-mail), 16 (ügynök), bank.

⚠ **A 10. modult nem szabad korábban elkezdeni:** a Gmail levélolvasás
„restricted scope", ami CASA biztonsági átvizsgálást igényel Google által
elfogadott auditorral, évente megismételve. Hónapok és több ezer dollár.

### 6.2 Lépcsős AI — a költséget a hívások száma dönti el

```
0. RÉTEG   determinisztikus mintaillesztés     0 Ft · azonnali · offline is
1. RÉTEG   olcsó modell, ZÁRT sémával          csak amit a 0. nem kezelt
2. RÉTEG   erős modell                         csak nyílt feladatra
```

Két szabály: **bizonytalanságnál a 0. réteg továbbad, nem találgat** (a kihagyás
olcsó, a téves felismerés kárt okoz), és **a modell megért, nem számol**.

Mért becslés: a parancsfelismerés lépcsősen ~10 Ft/hó/felhasználó, minden hívást
modellel ~150 Ft. A teljes AI-költség becslése **~250 Ft/hó/felhasználó** —
nagyságrenddel a felmérésben szereplő 2 000–6 000 Ft alatt. ⚠ **Ez felső becslés**,
mert a mérőkorpuszt és a felismerő mintáit ugyanaz írta; a valódi számot a
3. spike átiratai adják.

Amit figyelni kell, különben mégis elszalad: korlátlan beszélgetéshossz,
képernyőnyitásonként újragenerált napi összefoglaló, és számolás a modellben.

### 6.3 Mit ne építsünk meg

| Képesség | Döntés | Mivel |
|---|---|---|
| Számlakiállítás, NAV-adatszolgáltatás | bekötni | Számlázz.hu vagy Billingo |
| Beszédfelismerés | bekötni | böngésző + ElevenLabs/Deepgram tartalék |
| Belépés, tárolás, fájlok | bekötni | Supabase (EU-s régió) |
| Díjbekérő és számla | bekötni | Billingo API v3 |
| Naptár-szinkron | bekötni, de V1 | Google / Microsoft |
| Banki adatok | bekötni, de V2 | GoCardless / Salt Edge / Tink |
| **AI-réteg** | **saját** | ez a termék |
| **Jóváhagyási kapu + AI napló** | **saját** | ez a bizalom és a jogi védhetőség |
| **Árréses árlista** | **saját** | a számlázók terméklistája nem kezel árrést |
| **Helyszíni felület** | **saját** | ezt senki nem adja készen |

### 6.4 Az ajánlatot nem lehet kiszervezni — ellenőriztük

A Billingo API v3 létrehozható dokumentumtípusai: `invoice`, `proforma`,
`advance`, `draft`. **Árajánlat nincs köztük** — az csak a felületen létezik.
Ez inkább jó hír: az ajánlat úgyis a termék magja.

Amit viszont érdemes bekötni, az a folyamat második fele:

```
ajánlat (nálunk)  →  díjbekérő (proforma az API-n)  →  számla (create-from-proforma)
```

⚠ Ez a nyilvános API-leírásból származik, nem éles hívásból — **próbafiókkal
ellenőrizni kell**. A Számlázz.hu Számla Agentnél ugyanezt nem sikerült
ellenőrizni (a dokumentációs oldalukat a hálózat nem engedte lekérni).

### 6.5 Technológiai stack

Next.js / TypeScript **telepíthető PWA-ként** · Supabase (PostgreSQL + RLS,
EU-s régió) · lépcsős AI-réteg · HTML→PDF a dokumentumokhoz · Számlázz.hu vagy
Billingo API · beszédfelismerés bekötve.

---

## 7. Ami Vince dolga (fejlesztő nem tudja elvégezni)

| Tétel | Átfutás | Miért blokkol |
|---|---|---|
| **NAV technikai felhasználó** regisztrálása | 1–3 hét | Ez dönti el a 6. modul méretét. Ezt érdemes először elindítani. |
| **50–100 valódi bejövő számla** összegyűjtése | 1–2 nap | A kiolvasási pontosság mérése. A saját céged számlái legyenek — az adatfeldolgozói szerződés még nincs meg. |
| **Hangmérés** Chrome-ban, két környezetben | 20 perc | Eldönti, fő út-e a hang, és megadja a 0. réteg valódi lefedettségét is. |
| **Billingo próbafiók + API-kulcs** | 1 nap | A díjbekérő-lánc a prototípusban megvan, de szimulált. Ezzel élesíthető. |
| **A nagyker megnevezése és árlistája** | fél nap | Melyik tüzéptől vásárol a cég, milyen kondícióval — lásd 7.1. |
| **Valódi árlista** a demóhoz | fél nap | A demó nagyságrenddel meggyőzőbb lesz vele. |
| Supabase projekt EU-s régióban | 1 óra | A séma telepítéséhez. |
| Ügyvéd: adatkezelési tájékoztató, adatfeldolgozói szerződés, ÁSZF | hetek | Éles indulás előtt. |

### 7.1 A nagyker bekötése — mit tudunk ma

A prototípus árréses árlistája és árfrissítés-folyamata készen áll; ami hiányzik,
az az **adat**: melyik szállítótól vásárol a cég, és milyen kondícióval.

Szabolcs-Szatmár-Bereg megyében a kivitelezők jellemzően hálózatos tüzépekből
vásárolnak — Nyíregyháza környékén [Kovács Tüzép](https://tuzepweb.hu/) (Hufbau),
[Újház Farm-Ker](https://ujhazfarmker.hu/) és az [Újház Tüzép a Debreceni úton](https://www.buildox.hu/)
(Leier, Frühwald, Semmelrock, SW Maroskő térkő; három megyébe szállít),
[Rácz Tüzép](https://racztuzep.hu/) (Materix), [Borzsa Tüzép](https://borzsatuzep.109.hu/).
Gyártói oldalon a régióban **Leier, Frühwald, Semmelrock** a jellemző márka.

⚠ **Ezeknek nincs nyilvános API-juk.** Árlistájuk viszont van: webshop-ár, illetve
a szerződött partnernek e-mailben küldött XLS/PDF, egyedi kedvezménnyel. Ezért a
bekötés két lépcsős:

1. **Kézi betöltés** — a cég saját árlistája kerül be (fél nap). Innentől az
   árfrissítés-folyamat valódi adattal megy.
2. **Automatikus frissítés** — webshop-figyelés, vagy a beküldött árlista
   beolvasása ugyanazzal a technikával, mint a számlaolvasás. Csak akkor
   érdemes, ha az 1. lépcső bevált.

---

## 8. A következő fejlesztői lépések, sorrendben

Ezek egyike sem függ a spike-októl és a hangtól. **1., 4. és 5. pont elkészült**
— itt hagyva, hogy lássa a következő fejlesztő, mi történt és miért.

1. ✅ **A determinisztikus számítások a magban.** `mag/fizetesi_hatarido.mjs`
   (a határidő a partner napszámából), `mag/kintlevoseg.mjs`
   (nyitott/lejárt összesítés, partnerenkénti bontással) és
   `mag/anyagszukseglet.mjs` (a térkövezéshez szükséges anyagok, a
   telefonos prototípuséval megegyező konstansokkal) elkészült,
   tesztekkel — `node --test mag/*.teszt.mjs` → 43 teszt zöld.
   ⚠ Az `anyagszukseglet` szándékosan **nincs bekötve** a webapp
   ajánlatkészítésébe: az ott generikus (bármilyen árlistatételből épül),
   míg ez a számítás kifejezetten térkövezésre szabott — csak akkor van
   értelme rákötni, ha a webapp megkapja a munkák/nagyker modult, ahol
   a méret (m²) mezőként létezik. A fedezet és az árrés-tartó
   árfrissítés még csak a telefonos prototípusban van meg, ugyanígy
   át kell majd emelni.
   **2026-08-31-i frissítés:** a `kintlevoseg.mjs` (a „Ma" képernyő
   kintlévőség-doboza) és az `arkalkulacio.mjs` `osszesites`/`forintra`-ja
   (az `ajanlat-szamitas.ts` közös számításában) viszont **most már be
   vannak kötve** — lásd 2.1. fejezet.
2. **Ajánlat PDF-sablon.** A webapp `/ajanlatok/[id]/dokumentum` oldala
   megkapta a nyomtatható, cégfejléces előnézetet — böngésző-nyomtatással
   (`window.print()`), whitelist-alapú `@media print` szabállyal (csak a
   dokumentum mehet papírra, semmi más). Ami hiányzik: a cég logója, és egy
   szerveroldali PDF-export (a `docs/kiadas/md2pdf.mjs` Chromium-technikája
   ugyanerre a HTML-re ráépíthető, ha kell letölthető fájl is).
3. ✅ **Az AI-réteg eszközkészlete kódban.** `mag/eszkozok.mjs` — a
   specifikáció 6.2 fejezetének mind a 11 eszköze, zárt JSON-sémával és
   azzal a jelöléssel, hogy melyik igényel jóváhagyást. Ugyanott a
   jóváhagyási kapu állapotgépe (`allapotatmenetErvenyesE`) alkalmazás-
   oldalon megismételve — 11 teszt bizonyítja, hogy modellhívás nélkül is
   kimutatható, ha egy hívó megpróbálná kihagyni a kaput.
   A **webapp már ténylegesen ezen megy**: az ajánlat kiküldése
   (`ajanlatKikuldese`) egy `javasolt_muveletek` sort hoz létre és azt
   vezeti végig `javasolt → jóváhagyott → végrehajtott` állapotokon,
   mielőtt az ajánlat allapot mezője ténylegesen `kikuldve`-re vált — ez
   eddig hiányzott, a korábbi kód egyenesen írta át az állapotot.
4. ✅ **Next.js váz a séma fölé.** A `webapp/` mappában: Supabase Auth-tal
   (regisztráció + bejelentkezés + e-mail-megerősítés), és valódi CRUD-dal —
   cégprofil, partnerek, árlista, **ajánlatkészítés** (a szerver a saját
   árlistából olvas, sosem a kliens beküldött árából), teendők.
5. ✅ **Supabase telepítve.** `vince1111-source's Project`, `eu-central-1`,
   ingyenes csomag — az 0001–0003 migráció rajta fut, a biztonsági
   tanácsadó szerint tiszta. A kapcsolódási adatok mintája:
   `webapp/.env.local.example`.
6. **A séma bővítése a prototípus új fogalmaival.** A `munkak` (helyszín,
   állapot, fotó) tábla és egy dedikált `nagyker_arlista` (a beszállító
   katalógusa, elkülönítve a cég saját árlistájától) még nincs benne a
   sémában — a `termekek.beszerzesi_ar` viszont már az 0001 óta megvan.
   Ha hozzányúlsz, a `db/futtat.sh` tesztjeinek utána is zöldnek kell
   lenniük.
7. **Billingo élesítés** — a `dijbekero-kiallit` és `szamla-kiallit` ág ma
   szimulál. Próbafiókkal a `proforma` és a `create-from-proforma` hívás
   bekötendő, a jóváhagyási kapu és a napló változatlanul hagyásával.

### 8.1 Ami a valódi backendből még hiányzik a telefonos prototípushoz képest

A `webapp/` most a **belső irodai** oldalt fedi (cégprofil, partnerek,
árlista, ajánlat, teendő) — a helyszíni, terepi funkciók (számlafotó,
munkák + fotódokumentáció, nagyker árfrissítés, offline sor, hangvezérlés)
egyelőre csak a telefonos prototípusban élnek. Ha a webapp lesz az éles
termék, ezeket egyenként kell átültetni, ugyanazokkal a szabályokkal
(jóváhagyási kapu, forrásjelölés, kiadáskori ár-pillanatkép).

---

## 9. Buktatók — amibe ez a projekt már belefutott

Ezek valódi hibák voltak, nem elméleti kockázatok. Érdemes tudni róluk.

| Buktató | Mi történt |
|---|---|
| **Flex-oszlop zsugorítás** | A jóváhagyó lapon levágta a tétellista alját, így **a végösszeg egyáltalán nem látszott**. A füstpróba most külön ellenőrzi. |
| **Inline `<span>`-ek** | A címke, az érték és a forrás egy sorba folyt a kiolvasott mezőknél. Kétszer is előfordult, két külön helyen. `display:block` kell. |
| **Nem törhető tartalom a rácsban** | A chipsáv szétfeszítette az elrendezést 390 px-en. `grid-template-columns: minmax(0,1fr)` + `min-width:0`. |
| **`force row level security` hiánya** | Enélkül a tábla tulajdonosa mindent lát, és az izolációs teszt **hamis biztonságot adna**. |
| **Partnernév a parancsban** | A „Hogy állunk a BauMax-szal?" az általános összefoglalóra futott. A partnerspecifikus ágnak meg kell előznie az általánost. |
| **Zöld jelzés várakozó állapotra** | A „javasolt" címke zölden késznek olvasódott, pedig az ellenkezőjét jelenti. |
| **LibreOffice ebben a környezetben** | Egy sima `.txt`-t sem tud megnyitni. A PDF ezért Chromium nyomtatásából készül, nem a Wordből. |
| **iOS Safari + Web Speech API** | Támogatott 14.5 óta, de szeszélyes (a mikrofon nem mindig áll le). Tartalék kell mögé. |
| **iOS PWA + push** | Csak akkor megy, ha a felhasználó tényleg hozzáadta a kezdőképernyőhöz. Ezt végig kell vezetni rajta. |
| **`node --test mag/`** | Nem működik — a futtató nem ismeri fel a `*.teszt.mjs` mintát mappából. `node --test mag/*.teszt.mjs` kell. |
| **Fix indexek a szerkeszthető árlistán** | Az ajánlatkalkuláció `arlista[0]…[5]`-tel olvasott. Amint a felhasználó törölhetett tételt, az egész ajánlat `TypeError`-ral elszállt — és a csonka lista mentődött is. **Név szerint keress, ne index szerint**, és a hiányzó tételt nevezd néven a hibaüzenetben. |
| **A modell-módosítás ága eltérítette a teljes parancsokat** | Az „ajánlat módosítása" várakozás minden mennyiséget tartalmazó mondatot magának vett — így „készíts ajánlatot a Szabónak 300 m²-re" a **Kovács** ajánlatát írta át. A rövid-válasz ág csak akkor futhat, ha a mondat önmagában nem teljes parancs. |
| **A fotógomb elnyelte a saját kattintását** | A `<label>`-en ülő `preventDefault()` miatt a rejtett file input soha nem nyílt meg: telefonon a „Fotózd le" gomb **nem indított kamerát**. A demó-utat külön gombra kell tenni. |
| **Belső adat a nyomtatásban** | A `@media print` csak a felületi elemeket rejtette. A jóváhagyó lapon nyomott Cmd+P a **fedezetet** vitte papírra, dokumentumnak látszó formában. A print-szabálynak whitelistnek kell lennie, nem blacklistnek. |
| **Beégetett partnernév a naplóban** | Az ajánlat-jóváhagyás fixen „Kovács Építő Kft."-t írt a naplóba és az offline sorba. A napló **hitelessége** a 2. sarkalatos szabály — mindig a valódi rekordból írj. |
| **Zöld „rendben" negatív fedezetre** | A fedezet-sáv veszteségnél is zöld maradt. Ami veszteséges, az legyen piros, és mondja is ki. |
| **Napfény módban eltűnő jelölés** | A `*-soft` háttérszínek napfény módban mind fehérek, így a bizonytalan/javított mező jelölése láthatatlan lett. **Keret is kell, ne csak háttérszín.** |
| **A kiadott ajánlat újraszámolása** | A régi ajánlat megnyitása a **mai** árlistából számolt — árfrissítés után mást mutatott, mint amit az ügyfél kapott. A kiadott ajánlat a **kiadáskori árak pillanatképét** hordozza. |
| **Offline megkerülte a pénzügyi láncot** | A díjbekérő és a számla kiállítása nem nézte az `online()`-t: térerő nélkül is „kiállítva" lett, a napló pedig „végrehajtva". Minden külső hatású műveletnek **ugyanazon a sor-mintán** kell átmennie. |
| **Kiállított számla, ami sehol nem létezik** | A lánc kiállított egy számlát, de nem tette be a `szamlak` közé — nem jelent meg a kintlévőségben, a partnerlapon és az emlékeztetőkben sem. |
| **Egy koppintásra kiállított számla** | A díjbekérőnek volt jóváhagyó lapja, a számlának nem — mégis „jóváhagyva"-t naplózott. Ha a napló azt írja, jóváhagyva, kellett hozzá egy képernyő, ahol a felhasználó látta, mit hagy jóvá. |
| **Elavult háttérnézet** | A teljes képernyős lapon végzett módosítás után `rajzol()` nélkül a mögötte lévő lista és a Ma-képernyő a régi HTML maradt. |
| **Fotó, ami újratöltés után üres csempe** | A blob-URL halott újratöltés után, a rekord viszont megmaradt: „4 fotó" állt a listában, a negyedik üres. Vagy a képet is megőrzöd, vagy a rekordot se hagyd ott. |
| **Beégetett sorszám és dátum** | `DB-2026/0107`, `SZ-2026/0163`, „ma · 08. 25." — két művelet ugyanazt kapta. Számláló kell, és a fotónál valódi óraidő. |
| **Egyirányú állapotgép** | A munka `befejezve` állapotából nem volt visszaút, pedig egyetlen koppintással oda lehetett jutni. |
| **Turbopack nem old fel fájlt a projekt-root-on kívül** | A webapp `src/lib/mag.ts` a repó-gyökérbeli `mag/`-ból importál — ez a `turbopack.root`-tól függ (`next.config.ts`), és korábban `webapp/`-ra volt állítva. `Module not found` lett belőle, nem futásidejű hiba, hanem build-hiba. A root-nak a `mag/` ÉS a `webapp/` közös őséig kell felmennie. |
| **„use server" fájlból exportált segédfüggvény típusa szétlapul** | Az `ajanlatSzamitas`/`ajanlatMentese` eredetileg egy `"use server"` fájlban élt, pedig sosem hívta őket közvetlenül űrlap vagy kliens — a Next.js Action-típusfeldolgozása emiatt a hibaágak literál `hiba` mezőjét `string \| undefined`-dá lapította máshol, ahol ez már típushibát adott. A megoldás: csak a ténylegesen közvetlenül hívott (form action-ként vagy kliensből hívott) függvények legyenek `"use server"` fájlban; a belső, csak szerver-oldalról hívott segédlogika külön, sima `.ts` modulban éljen, explicit visszatérési típussal. |

---

## 10. Becslések és üzleti keret

| Ütem | Modulok | Nap | Nagyságrend (120–200 e Ft/nap) |
|---|---|---|---|
| MVP a 6. modul nélkül | 1, 2, 3, 11, 12, 13, 14 | 85–105 | 10–21 M Ft |
| MVP a 6. modullal | + 6 | 105–135 | 13–27 M Ft |
| V1 | 4, 5, 7, 8, 9, 15 | +85–125 | 10–25 M Ft |
| V2 | 10, 16, bank | +60–95 | 7–19 M Ft |

Plusz kb. 20% tesztelés és visszajelzés alapú átalakítás.

**Üzemeltetés:** a mért becslés ~250 Ft/hó/felhasználó AI-költség. Ha ez éles
adaton is tartható, a fenntartható előfizetés lejjebb vihető, mint a felmérésben
szereplő 10 000–20 000 Ft — vagy ugyanazon az áron lényegesen jobb fedezettel megy.
**Ezt a 2. spike után kell véglegesíteni.**

---

## 11. Nyitott kérdések

| Kérdés | Ki dönti el |
|---|---|
| Kinek mutatjuk be először a demót? | Vince — az első címzett Gál Zoltán |
| Számlázó: Számlázz.hu vagy **Billingo**? | A prototípus a Billingo folyamatára épül (`proforma` + `create-from-proforma`), mert az API-leírás alapján ez a lánc működik. Próbafiókkal véglegesítendő. |
| Melyik nagykertől vásárol a cég? | Zoli — ez dönti el, melyik árlistát töltjük be (lásd 7.1) |
| A hang fő út vagy kényelmi kiegészítő? | 3. spike (egyelőre félretéve) |
| Van-e valódi cég, amin élesben tesztelhető? | Vince |
| Saját fejlesztés vagy külsős kivitelezés? | üzleti döntés |
| Nemzetközi terv? | ha igen, a NAV-integráció országspecifikus adapter mögé kerüljön |

---

## 12. Jogi és megfelelőségi keret

| Terület | Állapot | Teendő |
|---|---|---|
| **AI Act 50. cikk** | hatályos 2026. augusztus 2. óta | A felületen jelezni, hogy AI-val beszél a felhasználó; az AI-tartalmat gépi olvasásra alkalmasan megjelölni. A prototípus ezt már mutatja. |
| AI Act magas kockázat | 2027 decemberéig kitolva | Egy vállalkozói asszisztens nem Annex III — nem érint. |
| **GDPR** | — | Adatfeldolgozói szerződés, alvállalkozói lista (benne az AI-szolgáltató), EU-s tárolás, export és törlés. Az AI-szolgáltatóval rögzíteni, hogy **nem használják tanításra**. |
| **Számlázás** | — | Amíg integrálunk, nem vagyunk számlázóprogram. |
| **Szerződéskivonat** (V1) | — | „Kivonat és figyelemfelhívás", nem „elemzés". Felelősségkorlátozás magán a funkción. |

---

## 13. Forrásjegyzék

- [NAV Online Számla dokumentációk](https://onlineszamla.nav.gov.hu/dokumentaciok)
- [NAV Online Számla GitHub](https://github.com/nav-gov-hu/Online-Invoice)
- [Számlázz.hu Számla Agent API](https://www.szamlazz.hu/szamla-agent-api)
- [Billingo API](https://www.billingo.hu/szolgaltatasok/api)
- [Google restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
- [Open Banking Hungary](https://www.openbankingtracker.com/country/hungary)

---

*A nap- és költségbecslések nagyságrendi tájékoztatásra szolgálnak, nem
árajánlatok. A szabályozási hivatkozások 2026. augusztusi állapotot tükröznek; a
NAV séma, a Google-hitelesítési folyamat és az AI Act végrehajtási szabályai
változhatnak. Jogi megfelelőség kérdésében ügyvédi és könyvelői egyeztetés
szükséges.*
