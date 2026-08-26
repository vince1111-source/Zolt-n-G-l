# CÉGEM.AI — projektátadás

**Készült:** 2026. augusztus 25. · Claude (Cowork) munkamenet
**Tulajdonos:** Vince
**Cél:** ez a dokumentum önmagában elegendő ahhoz, hogy a projektet Claude Code módban folytatni lehessen. Nem feltételez semmit a korábbi beszélgetésből.

---

## 0. Gyorsindítás Claude Code-ban

```bash
cd cegem-ai
# nézd meg a prototípust (a mikrofonhoz Chrome kell)
open prototype/CEGEM-AI-prototipus.html      # macOS
xdg-open prototype/CEGEM-AI-prototipus.html  # Linux
```

Az első mondat, amivel Claude Code-ot érdemes indítani:

> Olvasd el a HANDOVER.md-t és a CLAUDE.md-t. A `prototype/CEGEM-AI-prototipus.html` a jelenlegi állapot. [ide jön a következő feladat]

Ami már készen van, és amit **nem kell újra elvégezni**: piackutatás, jogi felmérés, modulonkénti becslés, ütemterv, technológiai döntések, működő kattintható prototípus. Mind ebben a mappában van.

---

## 1. Mi ez a projekt

Magyar nyelvű AI vállalkozói asszisztens kis- és középvállalkozásoknak. Központi működési elv:

> **„Mondd el, mit intézzek el helyettem.”**

A vállalkozó ne menüt tanuljon, hanem természetes magyar nyelven — lehetőleg beszéddel — mondja meg, mit szeretne. A rendszer ismeri a cég adatait, partnereit, árait, számláit és határidőit, és a napi adminisztratív munkát előkészíti vagy jóváhagyás után elvégzi.

**Kritikus biztonsági alapelv, ami az egész architektúrát meghatározza:** pénzügyi, kommunikációs vagy más külső hatású műveletet az AI soha nem hajt végre automatikusan. Megmutatja, mit készül tenni, és egyértelmű jóváhagyást kér.

### Az eredeti 16 modul

| # | Modul | Lényege |
|---|---|---|
| 1 | AI főképernyő és hangvezérlés | Beszéd vagy szöveg, nincs menürendszer |
| 2 | Személyre szabott céges AI | Cégenként elkülönített környezet: alapadatok, logó, bankszámla, sablonok |
| 3 | Partner- és ügyféladatbázis | Adatlap partnerenként, minden hozzá tartozó dokumentummal |
| 4 | Intelligens partnerelőzmények | Az AI értelmezi a kapcsolatot, nem csak tárolja |
| 5 | Pénzügyi áttekintő | Bejövő, kimenő, esedékes, lejárt, várható |
| 6 | Bejövő számlák kezelése | Fotó/feltöltés → adatkiolvasás → partnerhez rendelés |
| 7 | Kimenő számlák és kintlévőségek | Határidőfigyelés, emlékeztető, felszólítás |
| 8 | Intelligens dokumentumfelismerés | Típusfelismerés, adatkiolvasás, határidőfigyelés |
| 9 | Partnerközpont | Egy adatlapon minden: számlák, ajánlatok, levelek, feladatok |
| 10 | Intelligens e-mail-kezelés | Beérkező levelek osztályozása, választervezet jóváhagyással |
| 11 | Feladatok, határidők, naptár | Hangutasításból is, dokumentumból felismert határidőkkel |
| 12 | AI vezetői asszisztens | „Mi a helyzet a cégemben?” — reggeli és esti összefoglaló |
| 13 | Intelligens árajánlat-készítés | Szóban mondott ajánlatból logózott PDF, saját árakkal |
| 14 | Termék-, szolgáltatás- és árlista | Az ajánlatkészítés alapja |
| 15 | Szerződés- és dokumentumelemzés | „Mi a lényeg?”, „Van benne kötbér?” — jogi disclaimerrel |
| 16 | „Csináld meg helyettem” AI-üzemmód | Teendők összegyűjtése, priorizálása, végigvezetés jóváhagyással |

---

## 2. Amit már eldöntöttünk (és miért)

Ezek nem javaslatok, hanem a felmérés alapján meghozott döntések. Ha valamelyiktől el akarsz térni, tudd, mit adsz fel.

### 2.1 Ne mind a 16 modult egyszerre

A teljes rendszer **350–500 fejlesztői nap**, két fejlesztővel 9–12 hónap, mielőtt egyetlen fizető ügyfél lenne. Az MVP ehelyett 110–140 nap.

### 2.2 Az MVP az „ajánlatgyár”, nem az általános asszisztens

**MVP modulok: 1, 2, 3, 6, 11, 12, 13, 14.** A mag a 13+14 (ajánlatkészítés + árlista). Indok:

- Ez a legmeggyőzőbb, azonnal érthető funkció egy kivitelezőnek.
- **Nem függ egyetlen külső engedélytől sem** — se NAV, se Google, se bank.
- A többi modul (pénzügy, e-mail, ügynök) mind hosszabb átfutású függőségre épül.

### 2.3 Egy szakma, nem „a vállalkozók”

Első célcsoport: **térkövező / kivitelező kisvállalkozás**. A prototípus mintaadatai is ezek. Az általánosítás ráér — egy szűk, konkrét terméket sokkal könnyebb eladni és validálni.

### 2.4 Számlázást ne építs, integrálj

Saját számlázóprogramnak meg kell felelnie a **23/2014. (VI. 30.) NGM rendeletnek**, adóhatósági ellenőrzési adatszolgáltatással. Ehelyett: **Számlázz.hu Számla Agent API** vagy **Billingo API** — a NAV-adatszolgáltatás így az ő felelősségük marad.

### 2.5 Két architekturális döntés, amit az elején kell meghozni

**a) Minden AI-művelet naplózott és visszajátszható.** Mit látott a modell, mit javasolt, mit hagyott jóvá a felhasználó, mikor. Enélkül egy rossz ajánlatnál vagy hibás számlapárosításnál nem védhető a termék, és az AI Act átláthatósági követelménye sem teljesíthető. A prototípusban ez az „AI napló” nézet.

**b) A jóváhagyási kapu az adatmodell része, nem a felületé.** Minden külső hatású művelet állapotgépen megy át:

```
javasolt → jóváhagyott → végrehajtott
         ↘ kihagyott / elvetett
```

Így a 16. modul biztonsági alapelvét a rendszer kényszeríti ki, nem a jó szándék. Ezt **az első adatmigrációban** hozd létre, ne utólag told be.

---

## 3. A négy valódi szűk keresztmetszet

Egyik sem kódolási probléma. Mindegyik naptári időt eszik, és nem gyorsítható több fejlesztővel. **Ezeket indítsd el a lehető legkorábban, párhuzamosan a fejlesztéssel.**

| Akadály | Átfutás | Mit kell tenni |
|---|---|---|
| **Gmail-hozzáférés** (10. modul) | hetek–hónapok | A levélolvasás „restricted scope”. Márkaellenőrzés, majd **CASA biztonsági átvizsgálás** Google által elfogadott auditorral, **évente megismételve**. Több ezer dollár. A Microsoft 365 / Graph oldal lényegesen egyszerűbb — érdemes azzal kezdeni. |
| **NAV technikai felhasználó** | 1–3 hét | Nem ügyfélkapu: külön regisztráció, aláírókulcs + cserekulcs, SHA-512 aláírás, 5 percig élő token a `/tokenExchange` végponton. A v3 séma évente változik → állandó karbantartás. **Ügyfelenként külön technikai felhasználó kell** — ezt a beléptetési (onboarding) folyamatba is bele kell tervezni. |
| **Banki adatok** (5., 7. modul) | 1–3 hónap | A „ki tartozik nekünk” csak a beérkezett utalások ismeretében pontos. PSD2 alatt AISP-engedély kell, vagy licencelt aggregátor: **GoCardless (ex-Nordigen), Salt Edge, Tink**. A magyar bankok többsége elérhető. Szerződés + havidíj. |
| **Magyar hang és számlaolvasás** | 1–2 hét | A hangvezérlés a demó lelke, de a magyar ASR cégnevekkel, összegekkel, építkezési zajban nem magától értetődő. A magyar számlaformátumok kiolvasási pontosságát **50–100 valódi számlán meg kell mérni**. Ez a legolcsóbb kockázatcsökkentés az egész projektben. |

### Egy technikai nyeremény, amit ki kell használni

A NAV Online Számla API nem csak beküldésre való. A **`queryInvoiceDigest` hívás `INBOUND` iránnyal** elvileg lekérdezi azokat a számlákat, amiket **a te adószámodra** állítottak ki. Ha ez a gyakorlatban is működik a cég saját technikai felhasználójával, akkor a **6. modul jelentős része megoldható fotózás nélkül, automatikusan**.

**Ezt az első héten kell kipróbálni**, mert az egész bejövő-számla ág scope-ját eldönti. A prototípusban ezt már feltételeztük: a pénzügyi nézetben a bejövő számlák „NAV lekérdezés” forrásjelöléssel szerepelnek.

---

## 4. Modulonkénti munkabecslés

Tapasztalt fejlesztő becsült munkanapjai, front-end + back-end + teszt együtt.

| # | Modul | Nap | Ütem | Megjegyzés |
|---|---|---|---|---|
| — | **Alapplatform** | 60–90 | MVP | Multi-tenant DB sorszintű izolációval, belépés, jogosultságok, audit napló, előfizetés-kezelés, üzemeltetés, dizájnrendszer. Nincs az eredeti listán, de nélküle semmi sincs. |
| 2 | Céges AI | 15–20 | MVP | Cégprofil, sablonok, logó. Egyszerű, de mindent érint. |
| 3 | Partnerek | 10–15 | MVP | Érdemes NAV adószám-ellenőrzéssel kiegészíteni (adószámból cégadat). |
| 14 | Árlista | 10–15 | MVP | Unalmas, de a 13. enélkül nem működik. |
| 13 | Ajánlatkészítés | 25–35 | MVP | **A legmeggyőzőbb demó.** Nem függ külső engedélytől. |
| 1 | AI-főképernyő | 15–25 | MVP | Szövegesen 8–10 nap; a hangvezérlés külön tétel. |
| 6 | Bejövő számlák | 20–30 | MVP | A nyers kiolvasás LLM-mel ma jó; a nehéz rész a **megerősítő folyamat** és a partnerpárosítás. |
| 11 | Feladatok, határidők | 15–25 | MVP | Külső naptár-szinkron (Google/MS) külön 10–15 nap. |
| 12 | Vezetői összefoglaló | 15–20 | MVP | Az MVP-ben egyszerű reggeli összegzés. |
| 7 | Kimenő számlák | 20–30 | V1 | Számlázó API + határidőfigyelés + emlékeztető. |
| 5 | Pénzügyi áttekintő | 15–25 | V1 | Nagyrészt a 6+7 adataiból. Bank nélkül nem teljesen pontos. |
| 9 | Partnerközpont | 10–15 | V1 | Olcsó modul, nagy érzékelt érték. |
| 4 | Partnerelőzmények | 8–12 | V1 | A 9-re ültetett AI-összegzés. |
| 8 | Dokumentumfelismerés | 15–25 | V1 | A 6. kiterjesztése minden dokumentumtípusra. |
| 15 | Szerződéselemzés | 15–20 | V1 | Technikailag a legkönnyebb AI-funkció; a munka nagyja a jogi keretezés. |
| 10 | E-mail-kezelés | 30–45 | V2 | A kód 30–45 nap, de a Gmail-engedély hónapokat is jelenthet. |
| 16 | „Csináld meg helyettem” | 30–50 | V2 | Csak akkor építhető, ha minden alatta lévő modul stabil. |
| — | **Megfelelőség** | 20–30 | MVP | GDPR, adatkezelési tájékoztató, adatfeldolgozói szerződés, AI Act 50. cikk, adatexport/törlés. |
| | **Összesen** | **350–500** | | + kb. 20% tesztelés és visszajelzés alapú átalakítás |

**Költség-nagyságrend** (magyar fejlesztői napidíj kb. 120–200 e Ft/nap, nem árajánlat):

- Teljes rendszer külsős kivitelezésben: **45–100 M Ft**
- MVP (110–140 nap): **14–28 M Ft**

---

## 5. Ütemterv

### 0. fázis — Spike (1–2 hét) ← **ITT TARTUNK, EZ A KÖVETKEZŐ**

Három kérdés eldöntése **kód írása előtt**:

1. Működik-e a NAV `queryInvoiceDigest` INBOUND lekérdezés saját technikai felhasználóval?
2. Mennyire pontos a magyar számlaolvasás 50–100 valódi számlán?
3. Használható-e a magyar hangfelismerés a célközönség valós körülményei között?

Kimenet: eldől, mekkora az MVP.

### 1. fázis — MVP (3–4 hónap)

Az „ajánlatgyár”: cégprofil, partnerek, árlista, természetes nyelvű ajánlatkészítés logózott PDF-fel, bejövő számla fotózása, feladatok és határidők, reggeli összefoglaló. Szövegvezérlés biztosan, hang ha a spike zöld.
**Modulok: 1 · 2 · 3 · 6 · 11 · 12 · 13 · 14**

### 2. fázis — V1 (+4–5 hónap)

A pénzügyi kör bezárása: számlázó-integráció, kintlévőségek, fizetési emlékeztetők, partnerközpont előzményekkel, dokumentum- és szerződéselemzés. **Itt kezdődik párhuzamosan a banki aggregátorral és a Google-lel az engedélyeztetés.**
**Modulok: 4 · 5 · 7 · 8 · 9 · 15**

### 3. fázis — V2 (+3–4 hónap)

E-mail-integráció és a „Csináld meg helyettem” üzemmód.
**Modulok: 10 · 16 · banki adatkapcsolat**

---

## 6. Technológiai stack

| Réteg | Döntés | Indok |
|---|---|---|
| Adatbázis | **PostgreSQL sorszintű biztonsággal (RLS)**, Supabase, EU-s régió | A cégenkénti elkülönítés (2. modul) adatbázis-szinten garantált, nem alkalmazáslogikában. GDPR-adatrezidencia. |
| Alkalmazás | **Next.js / TypeScript** | Egy kódbázis webre és telepíthető formában. Hangrögzítés miatt PWA vagy vékony natív burok. |
| AI-réteg | **Claude, eszközhívással (tool use)** | Minden modul egy-egy jól definiált eszköz, az asszisztens ezeket hívja. Ez teszi a 16. modult megvalósíthatóvá: nem külön AI, hanem **ugyanaz az eszközkészlet hosszabb láncban**. |
| Számlázás | Számlázz.hu Számla Agent vagy Billingo API | Lásd 2.4. |
| Dokumentumkiolvasás | Elsődlegesen **látásalapú LLM strukturált kimenettel**, tartalék OCR rossz fotókra | 2026-ban a nyers kiolvasás LLM-mel jobb, mint a klasszikus OCR magyar számlákon. |
| PDF | **HTML-sablon → nyomtatás** (Playwright/Gotenberg) | A cég arculata így sablonszerkeszthető marad. |
| Beszédfelismerés | Mérés után dönteni: Web Speech API (ingyenes, Chrome), ElevenLabs Scribe, Deepgram, Speechmatics | Magyar pontosság a döntő, nem az ár. |

### Az AI-réteg felépítése (ez a projekt szíve)

Ne „chatbotot” építs, ami mellékesen elér adatokat. Építs **eszközkészletet**, és az asszisztens ezeket hívja:

```
tools:
  partner_kereses(nev|adoszam)
  partner_adatlap(partner_id)
  szamla_lista(irany, statusz, partner_id?, hatarido_elott?)
  arlista_lekerdezes(kereses?)
  ajanlat_keszites(partner_id, tetelek[], kedvezmeny?)   → javasolt állapot
  ajanlat_kikuldes(ajanlat_id)                            → JÓVÁHAGYÁS KELL
  feladat_letrehozas(cim, hatarido, partner_id?)
  email_tervezet(cimzett, targy, szoveg)                  → javasolt állapot
  email_kuldes(tervezet_id)                               → JÓVÁHAGYÁS KELL
  dokumentum_kiolvasas(fajl_id)                           → megerősítést kér
  napi_osszefoglalo()
```

A 16. modul (`„Intézd el a mai sürgős dolgaimat”`) ebből a készletből épül: összegyűjtés → priorizálás → tételenként javaslat → jóváhagyási kapu → végrehajtás → naplózás. **Nem külön rendszer.**

---

## 7. Jogi és megfelelőségi keret

| Terület | Állapot 2026. augusztusban | Teendő |
|---|---|---|
| **AI Act 50. cikk** | **Már hatályos** (2026. augusztus 2-tól) | A felületen egyértelműen jelezni kell, hogy a felhasználó AI-val beszél. Az AI által generált tartalmat gépi olvasásra alkalmas módon meg kell jelölni. Nem blokkoló, de kötelező háttérmunka. |
| AI Act magas kockázat | A Digital Omnibus **2027 decemberéig kitolta** | Egy vállalkozói asszisztens nem tartozik ide (nem Annex III). Nem érint. |
| **GDPR** | — | Az ügyfeleid partneradatai felett **adatfeldolgozó** vagy: adatfeldolgozói szerződés, alvállalkozói lista (benne az AI-szolgáltató), EU-s tárolás, törlési és exportálási funkció. Az AI-szolgáltatóval **rögzíteni kell, hogy az adatokat nem használják tanításra**. |
| **Számlázás** | — | Amíg integrálsz, nem vagy számlázóprogram. Saját kibocsátásnál jogszabályi megfelelés + NAV-bejelentés kell. |
| **Szerződéselemzés** (15.) | — | A jogi tanácsadás Magyarországon szabályozott tevékenység. A megfogalmazás legyen következetesen **„kivonat és figyelemfelhívás”**, ne „elemzés” vagy „vélemény”. A felelősségkorlátozás jelenjen meg **magán a funkción**, ne csak az ÁSZF-ben. |

---

## 8. Üzleti keret

### Üzemeltetési költség felhasználónként

Aktív használat mellett az AI-hívások + beszédfelismerés + dokumentumkiolvasás együtt reálisan **2 000–6 000 Ft/hó/felhasználó**.

→ A fenntartható előfizetés nagyságrendileg **10 000–20 000 Ft/hó/felhasználó**. **Ezt a kalkulációt az árazás előtt kell elvégezni, nem után.**

### Verseny

A magyar piacon a részfunkciókra van szereplő: Számlázz.hu, Billingo, KBOSS, MiniCRM, Kulcs-Soft, Octopus. **A megkülönböztetés kizárólag az AI-réteg** — hogy egyetlen asszisztens fogja össze a napi információt, és természetes magyar nyelven vezérelhető. Ne CRM-ként, ne számlázóként pozicionáld.

### Amit érdemes átgondolni

- **Mit ígér a hangvezérlés.** Ha az első benyomás a hang, akkor a hangnak kell a legjobban működnie. Ha a spike azt mutatja, hogy magyarul zajban gyenge → a szöveges parancssáv legyen a fő út, a hang kényelmi kiegészítő. **Előre eldönteni olcsóbb, mint utólag.**
- **Bizalom mint funkció.** A célközönség adóügyekben hibázni nem szeret. Minden kiolvasott adat mellett látszódjon, honnan jött, és legyen egy kattintással javítható. A „biztos vagyok benne / ellenőrizd” megkülönböztetés önmagában termékelőny. A prototípusban ez az ajánlat feletti sárga **„Amit feltételeztem — ellenőrizd”** sáv.

---

## 9. A prototípus

**Fájl:** `prototype/CEGEM-AI-prototipus.html` — egyetlen önálló HTML fájl, nincs build, nincs függőség.
**Artifact-változat:** `prototype/artifact-body.html` — ugyanaz `<!doctype>/<head>/<body>` burok nélkül (a Claude Artifact publikálás így várja).

**Élő linkek:**
- Prototípus: https://claude.ai/code/artifact/111a40b5-b3cd-4a22-a748-c6d247f3d96d
- Megvalósítási terv: https://claude.ai/code/artifact/979f5767-3a9b-405f-9f0b-0aae6fafdc0d

### Mit tud

| Modul | Prototípusban |
|---|---|
| 1 | Hangvezérelt parancssáv (Web Speech API, `hu-HU`) + hangos válasz (`speechSynthesis`), minden képernyő alján. Szöveges bevitel mindig működik. |
| 2 | Kőháló Kft. cégprofil, logó az ajánlat PDF-en |
| 3, 9 | Partnerlista + partnerközpont adatlap teljes előzménnyel |
| 4 | AI-összefoglaló a partner adatlapján (forgalom, tartozás, következő teendő) |
| 5, 7 | Pénzügyi nézet: kimenő/bejövő, lejárt/esedékes, forrásjelöléssel |
| 6 | Szimulált: a bejövő számlák „NAV lekérdezés” és „fotó feltöltés” forrással szerepelnek |
| 11 | Feladatlista, hangutasításból is („Jövő kedden emlékeztess…”) |
| 12 | Reggeli vezetői összefoglaló, „Mi a helyzet a cégemben?” |
| 13 | **Teljes ajánlatgyár**: természetes nyelvű bemenet → kalkuláció → logózott A4 → jóváhagyás → kiküldés + automatikus utánkövetési feladat |
| 14 | 11 tételes árlista árréssel |
| 15 | Szimulált szerződéskivonat jogi disclaimerrel |
| 16 | **Teljes végigvezetés**: ügyek összegyűjtése, priorizálás, tételenkénti jóváhagyási kapu, `1/4` léptetés |
| — | **AI napló** — minden lépés naplózva (mit látott, mit javasolt, mi lett vele) |

### Mi szimulált (fontos!)

- **Az „AI” egy determinisztikus magyar szándékfelismerő**, nem LLM. Az artifact-környezetben nincs modellhívás. A parancsfelismerés `norm()` + regex párokkal működik a `handle()` függvényben. Demóra tökéletes (kiszámítható), termékbe nem elég.
- **Semmi nem kerül kiküldésre**, semmi nem tárolódik. Az oldal újratöltése visszaállít mindent.
- Az adatok kitaláltak (`partnerek`, `arlista`, `szamlak`, `ajanlatok`, `feladatok` tömbök a `<script>` elején).

### Mikrofon

Beágyazott nézetben (artifact iframe) a böngésző jellemzően **letiltja a mikrofont** — a kód ezt elkapja és magyar üzenetet ír ki. Közvetlenül Chrome-ban megnyitva működik. Firefox/Safari nem támogatja a `webkitSpeechRecognition`-t.

### Kód-térkép (`prototype/CEGEM-AI-prototipus.html`)

```
<style>          CSS-tokenek, világos + sötét téma (data-theme + prefers-color-scheme)
<script>
  TODAY, Ft(), dstr(), D(), days()      segédek (a demó dátuma fixen 2026-08-25)
  CO, partnerek, arlista, szamlak,      mintaadatok
  ajanlatok, feladatok, naplo
  lejartKi(), nyitottKi(), nyitottBe()  származtatott lekérdezések
  NAV[], renderNav(), go(), render()    nézetváltás
  vHome, vPartnerek, vPartner,          nézetek (HTML-t adnak vissza)
  vPenzugy, vAjanlatok, vQuoteDoc,
  vArlista, vFeladatok, vNaplo
  say(), speak(), micBtn listener       asszisztens ki/bemenet
  findPartner(), buildQuote()           üzleti logika
  gate(), pending                       JÓVÁHAGYÁSI KAPU
  buildAgentQueue(), showAgentStep()    16. modul végigvezetés
  handle(text, fromVoice)               ← A SZÁNDÉKFELISMERŐ. Itt bővíts parancsot.
  CHIPS[]                               a példaparancsok a sáv alatt
</script>
```

**Új parancs hozzáadása:** tegyél egy `if(/minta/.test(t)){ ... }` ágat a `handle()`-be a fallback elé, és vedd fel a `CHIPS` tömbbe.

### Tesztelve

Playwright headless Chromiummal: mind a 9 példaparancs, a teljes 4 lépéses jóváhagyási folyamat, AI napló, ajánlatgenerálás (12 485 922 Ft bruttó, 6 tétel), világos és sötét téma, 390 px mobil nézet, vízszintes túlcsordulás. **Nem találtunk hibát.** Képernyőképek: `docs/screenshots/`.

---

## 10. Következő lépések — konkrétan, sorrendben

### A) Spike-ok (ezek a legfontosabbak, kód előtt)

- [ ] **NAV technikai felhasználó regisztrálása** egy saját teszt-adószámra, majd `queryInvoiceDigest` INBOUND próba. Kimenet: működik-e, milyen jogosultsággal, milyen adatmélységgel.
- [ ] **50–100 valódi magyar bejövő számla összegyűjtése** (fotó és PDF vegyesen, köztük rossz minőségűek), és a kiolvasási pontosság mérése. Mérőszám: mezőnkénti pontosság (kiállító, számlaszám, összeg, dátumok, adószám), és hogy mikor kell megerősítést kérni.
- [ ] **Magyar hangfelismerés mérése** valós körülmények között: cégnevek, összegek („nyolcszáz négyzetméter”), építkezési háttérzaj. Legalább 3 szolgáltató összehasonlítása.

### B) Termékdöntések (a spike eredménye után)

- [ ] Hang fő út marad, vagy kényelmi kiegészítő lesz?
- [ ] Számlázó partner: Számlázz.hu vagy Billingo? (API-minőség és díjszabás alapján)
- [ ] Árazás véglegesítése az üzemeltetési költség kalkulációja után.

### C) MVP fejlesztés indítása

- [ ] Supabase projekt EU-s régióban, séma sorszintű biztonsággal (`cegek`, `felhasznalok`, `partnerek`, `termekek`, `ajanlatok`, `ajanlat_tetelek`, `szamlak`, `feladatok`, `dokumentumok`, `ai_naplo`, `javasolt_muveletek`)
- [ ] **A `javasolt_muveletek` állapotgép az első migrációba kerüljön** (lásd 2.5/b)
- [ ] Next.js váz, belépés, cégprofil
- [ ] Partner + árlista CRUD (a prototípus adatszerkezete átvehető)
- [ ] Claude eszközkészlet (lásd 6. fejezet) + parancssáv
- [ ] Ajánlatkészítés → HTML sablon → PDF
- [ ] Számlafotó feltöltés + kiolvasás + megerősítő folyamat
- [ ] AI napló nézet

### D) Párhuzamosan, mert hosszú az átfutás

- [ ] Microsoft 365 / Graph OAuth regisztráció (egyszerűbb, mint a Google — ezzel kezdd)
- [ ] Google Cloud projekt + márkaellenőrzés elindítása
- [ ] Banki aggregátor árajánlatok bekérése (GoCardless, Salt Edge, Tink)
- [ ] Adatkezelési tájékoztató + adatfeldolgozói szerződés + ÁSZF ügyvéddel

### E) Ha fejlesztőktől kérsz árajánlatot

Készüljön **Word + PDF fejlesztői specifikáció**: címlap, tartalomjegyzék, modulonkénti követelmények, adatmodell, képernyőtervek, MVP-fejezet, elfogadási kritériumok. Ez a dokumentum + a prototípus együtt már majdnem elég hozzá.

> **Ajánlott sorrend:** előbb prototípus (kész), aztán specifikáció. A prototípus után írt specifikáció kevesebb félreértést tartalmaz, és a fejlesztők is szűkebb sávban áraznak, ha van mit megnézniük.

---

## 11. Nyitott kérdések

1. Ki lesz a felelős fejlesztő/csapat? Az integrációs fiókok (NAV, Google, bank, számlázó) **a te cégadataidra szólnak** — ezeket AI nem tudja elintézni.
2. Van-e már cég, amin az MVP-t élesben lehet tesztelni? (Egy valódi térkövező vállalkozás, aki hajlandó a saját számláit betölteni, többet ér, mint három hónap tervezés.)
3. Saját fejlesztés vagy külsős kivitelezés? A becslések mindkettőre érvényesek, de a felelősség eloszlása más.
4. Nemzetközi terv: a leírás említi. Ha ez cél, a **NAV-integráció ne épüljön be mélyen az adatmodellbe** — legyen országspecifikus adapter mögé rejtve.

---

## 12. Forrásjegyzék

- [NAV Online Számla dokumentációk](https://onlineszamla.nav.gov.hu/dokumentaciok)
- [NAV Online Számla GitHub (nav-gov-hu/Online-Invoice)](https://github.com/nav-gov-hu/Online-Invoice)
- [NAV integrációs fejlesztői útmutató 2026](https://www.dfieldsolutions.hu/blog/nav-online-szamla-integracio-2026)
- [Számlázz.hu Számla Agent API](https://www.szamlazz.hu/szamla-agent-api)
- [Billingo API](https://www.billingo.hu/szolgaltatasok/api)
- [Google restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
- [AI Act — 2026. augusztusi kötelezettségek](https://www.digitalapplied.com/blog/eu-ai-act-august-2026-transparency-obligations-agency-checklist)
- [Open Banking Hungary](https://www.openbankingtracker.com/country/hungary)

---

*A nap- és költségbecslések nagyságrendi tájékoztatásra szolgálnak, nem árajánlatok. A szabályozási hivatkozások 2026. augusztusi állapotot tükröznek; a NAV séma, a Google-hitelesítési folyamat és az AI Act végrehajtási szabályai változhatnak. Jogi megfelelőség kérdésében ügyvédi és könyvelői egyeztetés szükséges.*
