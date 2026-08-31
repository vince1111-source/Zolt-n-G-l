# CÉGEM.AI — projektátadás

**Frissítve:** 2026. augusztus 31. · **Tulajdonos:** Vince
**Ág:** `claude/projekt-folytatasa-p0titv` · **Repó:** `vince1111-source/Zolt-n-G-l`

> Ez a dokumentum önmagában elegendő ahhoz, hogy a projektet egy friss Claude Code
> munkamenet folytatni tudja. Nem feltételez semmit korábbi beszélgetésből.

---

## 0. Gyorsindítás

```bash
# 1. Nézd meg, mi van kész, és hogy tényleg működik-e
node --test mag/*.teszt.mjs        # 12 teszt — az árkalkuláció
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
| **Árkalkuláció** determinisztikus kódban | `mag/` | `node --test mag/*.teszt.mjs` → 12 teszt zöld |
| **Telefon-első prototípus** | `prototype/CEGEM-AI-telefon.html` | `node prototype/fustproba.mjs` → 99 ellenőrzés zöld |
| Asztali prototípus (mind a 16 modul) | `prototype/CEGEM-AI-prototipus.html` | kézzel átnézve |
| **Fejlesztői specifikáció** | `docs/fejlesztoi-specifikacio.md` + Word/PDF | — |
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

### Ami nem indult el

Next.js alkalmazásváz, Supabase projekt, bármilyen külső integráció élesben.

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
  fustproba.mjs                    99 ellenőrzés a telefonos prototípuson

docs/
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
node --test mag/*.teszt.mjs        # árkalkuláció — 12 teszt
./db/futtat.sh                     # séma + sarkalatos szabályok — 22 állítás
node prototype/fustproba.mjs       # telefonos prototípus — 99 ellenőrzés
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
| **Billingo/Számlázz.hu próbafiók** | 1 nap | A díjbekérő-lánc ellenőrzése. |
| **Valódi árlista** a demóhoz | fél nap | A demó nagyságrenddel meggyőzőbb lesz vele. |
| Supabase projekt EU-s régióban | 1 óra | A séma telepítéséhez. |
| Ügyvéd: adatkezelési tájékoztató, adatfeldolgozói szerződés, ÁSZF | hetek | Éles indulás előtt. |

---

## 8. A következő fejlesztői lépések, sorrendben

Ezek egyike sem függ a spike-októl és a hangtól.

1. **A többi determinisztikus számítás a magba.** Fizetési határidő a partner
   adatlapjából, kintlévőség-összesítés, anyagszükséglet. Ugyanaz a szabály:
   amit ki lehet számolni, azt ne a modell találja ki. Mintát a
   `mag/arkalkulacio.mjs` ad, tesztekkel együtt.
2. **Ajánlat PDF-sablon.** HTML→nyomtatás, a cég logójával. A technika megvan:
   `docs/kiadas/md2pdf.mjs` ugyanezt csinálja Chromiummal.
3. **Az AI-réteg eszközkészlete kódban**, zárt sémákkal, a jóváhagyási kapuhoz
   kötve. Modellhívás nélkül is tesztelhető, hogy a kapu nem kerülhető meg.
   Az eszközlista a specifikáció 6.2 fejezetében van.
4. **Next.js váz** a séma fölé: belépés, cégprofil, partner- és árlista-CRUD.
5. **Supabase telepítés** — a `db/README.md` két beállítást ír le, ami kell hozzá.

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
| Kinek mutatjuk be először a demót? | Vince — ez dönti el, mit érdemes csiszolni |
| Számlázó: Számlázz.hu vagy Billingo? | próbafiók + díjszabás |
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
