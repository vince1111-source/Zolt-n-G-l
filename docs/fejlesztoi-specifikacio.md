# CÉGEM.AI — fejlesztői specifikáció

**Verzió:** 1.0 · 2026. augusztus 26.
**Készült:** a megvalósíthatósági felmérés, a két prototípus és a 0. fázis mérőeszközei alapján.

---

## 1. Hogyan olvasd ezt a dokumentumot

Ez a dokumentum arra készült, hogy egy fejlesztő vagy fejlesztőcsapat **árajánlatot tudjon adni**, majd meg tudja építeni a rendszert anélkül, hogy minden részletet kérdeznie kellene. Három dolog tartozik hozzá:

| Anyag | Mire jó |
|---|---|
| Ez a specifikáció | Követelmények, adatmodell, elfogadási kritériumok |
| `prototype/CEGEM-AI-telefon.html` | A **fő irány**: telefon-első, kattintható működő demó |
| `prototype/CEGEM-AI-prototipus.html` | Az asztali változat, mind a 16 modullal — a teljes vízió |

A prototípusok önálló HTML fájlok, nincs bennük build és függőség: böngészőben megnyithatók. **A vitás kérdéseket a prototípus dönti el**, nem a szöveg: ha a leírás és a demó eltér, a demó a mérvadó, és a szöveget kell javítani.

### Jelölések

- **KÖTELEZŐ** — ettől eltérni csak írásos egyeztetés után szabad.
- *Javasolt* — a döntés a fejlesztőé, de az indoklás itt van.
- ⚠ — olyan pont, ahol a projekt korábban már hibázott vagy kockázatot azonosított.

---

## 2. Mi ez a termék

Magyar nyelvű AI vállalkozói asszisztens kisvállalkozásoknak. Központi működési elv:

> **„Mondd el, mit intézzek el helyettem."**

A vállalkozó ne menüt tanuljon, hanem természetes magyar nyelven — lehetőleg beszéddel — mondja meg, mit szeretne. A rendszer ismeri a cég adatait, partnereit, árait, számláit és határidőit, és a napi adminisztratív munkát előkészíti vagy jóváhagyás után elvégzi.

### 2.1 A célfelhasználó

**Első célcsoport: térkövező / kivitelező kisvállalkozás.** Nem irodai ügyintéző — **helyszínen dolgozó ember**.

A használat valós körülménye, és ez a felület minden döntését meghatározza:

| Körülmény | Következmény |
|---|---|
| Telefon, egy kéz | Egykezes elérés, hüvelykujjal elérhető fő műveletek |
| Kesztyű | Minimum **56 px** célfelület (nem 44) |
| Tűző nap | Erős kontraszt, nagy alapbetűméret, külön napfény üzemmód |
| Por, nedves kéz | Nincs finom gesztus, nincs csak-húzásos művelet |
| Építkezési zaj | Nyomva tartós mikrofon, nem folyamatos figyelés |
| Gyenge térerő | Offline váz, sorba állított műveletek |
| Nincs ideje menüzni | Kevés képernyő, egy képernyő = egy döntés |

⚠ **A felület telefonra készül, és az asztali nézet a származtatott.** Fordítva utólag drága.

### 2.2 Amivel nem versenyzünk

A magyar piacon a részfunkciókra van szereplő (Számlázz.hu, Billingo, MiniCRM, Kulcs-Soft). **A megkülönböztetés kizárólag az AI-réteg**: hogy egyetlen asszisztens fogja össze a napi információt, és természetes magyar nyelven vezérelhető. A terméket **nem szabad CRM-ként vagy számlázóként pozicionálni.**

---

## 3. Sarkalatos követelmények

Ez a hét pont nem alkuképes. Mindegyik mögött vagy jogi kötelezettség, vagy olyan termékdöntés áll, ami nélkül a termék nem védhető.

### 3.1 A jóváhagyási kapu az adatmodell része, nem a felületé — KÖTELEZŐ

Minden külső hatású művelet (e-mail, ajánlatkiküldés, fizetési felszólítás, utalási javaslat) állapotgépen megy át:

```
javasolt ──► jóváhagyott ──► végrehajtott
    │
    ├──► kihagyott      (a felhasználó most nem kéri)
    └──► elvetett       (a felhasználó elutasította)
```

Ez **az első adatmigrációba kerül**, nem utólag. Ha a kapu csak a felületen van, egy hibás API-hívás vagy egy háttérfolyamat megkerüli — és akkor a termék alapígérete sérül.

**Elfogadási kritérium:** nincs olyan kódút, amelyen külső hatású művelet `végrehajtott` állapotba kerülhet anélkül, hogy előtte `jóváhagyott` lett volna, és a jóváhagyáshoz tartozik felhasználó-azonosító és időbélyeg.

### 3.2 Minden AI-művelet naplózott és visszajátszható — KÖTELEZŐ

Rögzíteni kell: **mit látott a modell** (bemenet), **mit javasolt** (kimenet), **mit hagyott jóvá a felhasználó**, és **mikor**. Modellnév és verzió is.

Enélkül egy rossz ajánlatnál vagy hibás számlapárosításnál a termék nem védhető, és az AI Act átláthatósági követelménye sem teljesíthető.

**Elfogadási kritérium:** a felületen elérhető „AI napló" nézetből bármelyik AI-művelet visszakereshető, és látszik, mi volt a bemenete.

### 3.3 Multi-tenant izoláció adatbázis-szinten — KÖTELEZŐ

PostgreSQL **sorszintű biztonsággal (RLS)**, nem alkalmazáslogikában. Minden tenant-hoz tartozó táblán kötelező RLS-szabály.

**Elfogadási kritérium:** egy tenant tokenjével a másik tenant sora közvetlen SQL-lel sem érhető el.

### 3.4 Számlázást nem építünk, integrálunk — KÖTELEZŐ

Saját számlázóprogramnak meg kell felelnie a 23/2014. (VI. 30.) NGM rendeletnek, adóhatósági ellenőrzési adatszolgáltatással. Ehelyett Számlázz.hu Számla Agent vagy Billingo API — így a NAV-adatszolgáltatás az ő felelősségük.

### 3.5 Minden AI által kiolvasott adat mellett látszódjon a forrás — KÖTELEZŐ

Honnan jött az érték („a számla fejlécéből"), és legyen **egy koppintással javítható**. Bizonytalanság esetén az AI **kérdezzen, ne találgasson**.

Ez nem díszítés: a célközönség adóügyekben hibázni nem szeret, és a „biztos vagyok benne / ellenőrizd" megkülönböztetés önmagában termékelőny.

### 3.6 AI Act 50. cikk — KÖTELEZŐ

2026. augusztus 2. óta hatályos. A felületen egyértelműen jelezni kell, hogy a felhasználó AI-val beszél, és az AI által generált tartalmat gépi olvasásra alkalmas módon meg kell jelölni.

### 3.7 Jogi tartalomnál a szóhasználat kötött — KÖTELEZŐ

A szerződéskivonat funkciónál (V1) következetesen **„kivonat és figyelemfelhívás"**, soha nem „elemzés" vagy „vélemény". A felelősségkorlátozás **magán a funkción** jelenjen meg, ne csak az ÁSZF-ben. A jogi tanácsadás Magyarországon szabályozott tevékenység.

---

## 4. Hatókör

### 4.1 MVP — az „ajánlatgyár"

| # | Modul | Becslés (nap) |
|---|---|---|
| — | Alapplatform (multi-tenant, belépés, jogosultság, audit, dizájnrendszer) | 60–90 |
| 2 | Cégprofil és beállítások | 15–20 |
| 3 | Partnerek | 10–15 |
| 14 | Árlista árréssel | 10–15 |
| 13 | **Ajánlatkészítés** — a mag | 25–35 |
| 1 | AI-főképernyő, parancssáv, hang | 15–25 |
| 11 | Feladatok, határidők | 15–25 |
| 12 | Napi összefoglaló | 15–20 |
| 6 | Bejövő számlák — **feltételes** | 20–30 |
| — | Megfelelőség (GDPR, AI Act, export/törlés) | 20–30 |

**A 6. modul feltételes:** csak akkor marad az MVP-ben, ha a NAV `queryInvoiceDigest` INBOUND lekérdezés működik (0. fázis, 1. spike). Ha nem, V1-be csúszik.

Az alapplatform becslése benne foglaltatik az összesben; MVP-szinten a fenti tételek **85–105 fejlesztői nap** a 6. modul nélkül, **105–135 nap** vele.

### 4.2 V1

Modulok: 4 (partnerelőzmények), 5 (pénzügyi áttekintő), 7 (kimenő számlák), 8 (dokumentumfelismerés), 9 (partnerközpont), 15 (szerződéskivonat). Itt indul a banki aggregátorral és a Google-lel az engedélyeztetés.

### 4.3 V2

Modulok: 10 (e-mail-kezelés), 16 („Csináld meg helyettem" végigvezetés), banki adatkapcsolat.

⚠ **A 10. modult nem szabad korábban elkezdeni:** a Gmail levélolvasás „restricted scope", ami márkaellenőrzést és **CASA biztonsági átvizsgálást** igényel Google által elfogadott auditorral, évente megismételve. Ez hónapokat vesz igénybe és több ezer dollár.

### 4.4 Amit a rendszer szándékosan NEM csinál

- Nem állít ki számlát saját motorral.
- Nem ad jogi tanácsot.
- Nem hajt végre pénzügyi vagy kommunikációs műveletet jóváhagyás nélkül.
- Nem számol nyelvi modellel — az árkalkuláció determinisztikus kód.
- Nem tárol banki hitelesítő adatot.

---

## 5. Architektúra

### 5.1 Technológiai döntések

| Réteg | Döntés | Indok |
|---|---|---|
| Alkalmazás | **Next.js / TypeScript, telepíthető PWA** | Egy kódbázis; a kamera és a mikrofon böngészőből elérhető; nincs app store-súrlódás, a frissítés azonnali. |
| Adatbázis | **PostgreSQL RLS-sel (Supabase), EU-s régió** | A cégenkénti elkülönítés adatbázis-szinten garantált. GDPR-adatrezidencia. |
| Fájltárolás | Supabase Storage, EU | Számlafotók, logók, PDF-ek. |
| AI | **Lépcsős réteg** — lásd 6. fejezet | A költséget a hívások száma dönti el, nem a modellválasztás. |
| Beszédfelismerés | Böngésző (Web Speech API) + felhőszolgáltató tartalék | Lásd 9.2. |
| PDF | HTML-sablon → nyomtatás (Playwright vagy Gotenberg) | Az arculat sablonszerkeszthető marad. |
| Számlázás | Számlázz.hu Számla Agent vagy Billingo API | Lásd 9.1. |

### 5.2 PWA-követelmények

- Telepíthető (manifest, ikonok, `display: standalone`).
- Service worker: az alkalmazásváz és az utolsó ismert adatok offline is betöltődnek.
- ⚠ **iOS:** push értesítés csak akkor működik, ha a felhasználó ténylegesen hozzáadta a kezdőképernyőhöz. Ha az emlékeztető fontos funkció, a telepítés lépését **végig kell vezetni** a felhasználón, nem elég felkínálni.
- Offline sor: a jóváhagyott, de el nem küldött műveletek megmaradnak, a felületen látszik a darabszámuk, és kapcsolat visszatértekor automatikusan elmennek.

---

## 6. Az AI-réteg

Ez a projekt szíve. **Ne „chatbotot" építs, ami mellékesen elér adatokat — építs eszközkészletet, és az asszisztens ezeket hívja.**

### 6.1 Lépcsős felismerés — KÖTELEZŐ

```
beszéd / szöveg
      │
      ▼
  0. RÉTEG   determinisztikus mintaillesztés      0 Ft · azonnali · offline is
      │      a gyakori parancsok nagy része
      ├─ felismerte, minden adat megvan ─────────► művelet indul
      ▼  nem ismerte fel, vagy hiányzik egy adat
  1. RÉTEG   olcsó modell, ZÁRT sémával           ~0,5 Ft / hívás
      │      csak szándék + paraméterek
      ├─ megvan ─────────────────────────────────► művelet indul
      └─ hiányzik valami ────────────────────────► visszakérdez
  2. RÉTEG   erős modell, csak nyílt feladatra    a hívások néhány százaléka
             zavaros beszédből ajánlat, dokumentumkivonat
```

Két szabály tartja együtt:

1. **Bizonytalanság esetén a 0. réteg továbbad, nem találgat.** A kihagyás olcsó, a téves felismerés kárt okoz.
2. **A modell megért, nem számol.** Az árkalkuláció determinisztikus kód.

A referencia-megvalósítás és a mérőeszköz: `spike/parancs/`. Új parancsot **először a 0. rétegbe** kell felvenni.

### 6.2 Eszközkészlet

Az asszisztens ezeket az eszközöket hívja. A `→ JÓVÁHAGYÁS` jelöléssel ellátottak csak a 3.1 szerinti kapun keresztül futhatnak le.

```
partner_kereses(nev | adoszam)
partner_adatlap(partner_id)
szamla_lista(irany, statusz, partner_id?, hatarido_elott?)
arlista_lekerdezes(kereses?)
ajanlat_keszites(partner_id, tetelek[], kedvezmeny?)     → javasolt állapot
ajanlat_kikuldes(ajanlat_id)                              → JÓVÁHAGYÁS
feladat_letrehozas(cim, hatarido, partner_id?)
emlekezteto_tervezet(partner_id, szamla_id)               → javasolt állapot
emlekezteto_kuldes(tervezet_id)                           → JÓVÁHAGYÁS
dokumentum_kiolvasas(fajl_id)                             → megerősítést kér
napi_osszefoglalo()
```

A V2-es „Csináld meg helyettem" üzemmód **ebből a készletből épül**: összegyűjtés → priorizálás → tételenként javaslat → jóváhagyási kapu → végrehajtás → naplózás. Nem külön rendszer.

### 6.3 Költségkorlátok — KÖTELEZŐ

A felhasználónkénti AI-költség célértéke **1 000 Ft/hó alatt**. Ehhez három szabály:

1. **Kontextus-plafon.** A beszélgetés nem nőhet korlátlanul; a modellhez küldött előzmény felső határa konfigurálható legyen.
2. **A napi összefoglaló naponta egyszer generálódik és tárolódik.** Nem képernyő-megnyitásonként.
3. **Gyorsítótárazás** a rendszerpromptra és az eszközleírásokra.

**Elfogadási kritérium:** a rendszer felhasználónként és naponta összesíti a token- és hangfelismerési költséget, és ez az adat lekérdezhető. Enélkül az árazás nem tartható.

---

## 7. Adatmodell

Magyar, ékezet nélküli mezőnevek. Minden tenant-hoz tartozó táblán **kötelező RLS**.

### 7.1 Táblák

**`cegek`** — a tenant.
`id`, `nev`, `adoszam`, `cim`, `bankszamla`, `logo_url`, `email`, `telefon`, `letrehozva`

**`felhasznalok`** — belépés, Supabase Auth-hoz kötve.
`id`, `ceg_id`, `nev`, `email`, `szerep` (`tulajdonos` | `munkatars`), `letrehozva`

**`partnerek`**
`id`, `ceg_id`, `nev`, `adoszam`, `cim`, `kapcsolattarto`, `email`, `telefon`, `fizetesi_hatarido_nap`, `kedvezmeny_szazalek`, `szallito` (bool), `megjegyzes`, `letrehozva`

**`termekek`** — az árlista. ⚠ A számlázók terméklistája nem kezel árrést és ügyfélárat, ezért ez saját.
`id`, `ceg_id`, `nev`, `cikkszam`, `mertekegyseg`, `beszerzesi_ar`, `eladasi_ar`, `afa_kulcs`, `kategoria` (`munkadij` | `anyag` | `szolgaltatas`), `aktiv`

**`ajanlatok`**
`id`, `ceg_id`, `partner_id`, `sorszam`, `kelt`, `ervenyes_ig`, `netto`, `afa`, `brutto`, `kedvezmeny_szazalek`, `allapot` (`piszkozat` | `kikuldve` | `elfogadva` | `elutasitva` | `lejart`), `feltetelezesek` (jsonb), `letrehozva`

A `feltetelezesek` mező tárolja az „Amit feltételeztem" sáv tartalmát — ez része az ajánlatnak, nem csak megjelenítés.

**`ajanlat_tetelek`**
`id`, `ajanlat_id`, `termek_id`, `megnevezes`, `mennyiseg`, `mertekegyseg`, `egysegar`, `netto`, `sorrend`

**`szamlak`**
`id`, `ceg_id`, `partner_id`, `irany` (`kimeno` | `bejovo`), `sorszam`, `kelt`, `teljesites`, `fizetesi_hatarido`, `netto`, `afa`, `brutto`, `penznem`, `allapot` (`nyitott` | `fizetve` | `sztornozott`), `forras` (`nav` | `foto` | `kezi` | `szamlazo_api`), `kulso_azonosito`, `fajl_id`

A `forras` mező a 3.5 szabály miatt kötelező: a felületen látszania kell, honnan tudjuk a számlát.

**`dokumentumok`**
`id`, `ceg_id`, `tipus`, `fajl_url`, `eredeti_nev`, `feltoltve`, `feltoltotte_id`

**`kiolvasott_mezok`** — a megerősítő folyamat alapja.
`id`, `dokumentum_id`, `mezo_nev`, `ertek`, `forras_leiras`, `biztos` (bool), `javitva` (bool), `javitott_ertek`, `javitotta_id`, `javitva_ekkor`

**`feladatok`**
`id`, `ceg_id`, `partner_id?`, `cim`, `leiras`, `hatarido`, `surgos` (bool), `allapot` (`nyitott` | `kesz` | `torolve`), `forras` (`kezi` | `hang` | `ai_javaslat`), `letrehozva`

**`javasolt_muveletek`** — a jóváhagyási kapu. Ez a 3.1 szabály megvalósítása.
`id`, `ceg_id`, `tipus` (`ajanlat_kikuldes` | `emlekezteto` | `email` | `utalasi_javaslat`), `hivatkozott_id`, `hivatkozott_tabla`, `javaslat` (jsonb), `allapot` (`javasolt` | `jovahagyott` | `vegrehajtott` | `kihagyott` | `elvetett`), `javasolva`, `jovahagyta_id`, `jovahagyva`, `vegrehajtva`, `hiba_uzenet`

**`ai_naplo`** — a 3.2 szabály megvalósítása.
`id`, `ceg_id`, `felhasznalo_id`, `muvelet`, `reteg` (0 | 1 | 2), `modell`, `bemenet` (jsonb), `kimenet` (jsonb), `token_be`, `token_ki`, `koltseg_ft`, `javasolt_muvelet_id?`, `ido`

A `reteg`, `token_be`, `token_ki` és `koltseg_ft` mezők együtt adják a 6.3 szerinti költségkövetést.

### 7.2 Az első migráció

⚠ **A `javasolt_muveletek` és az `ai_naplo` tábla az első migrációba kerül**, a `cegek` és `felhasznalok` mellé. Utólag betolni azt jelenti, hogy addig minden kód megkerüli őket.

### 7.3 RLS-minta

Minden `ceg_id` oszlopot tartalmazó táblán:

```sql
alter table partnerek enable row level security;

create policy partnerek_tenant on partnerek
  using (ceg_id = (auth.jwt() ->> 'ceg_id')::uuid);
```

**Elfogadási kritérium:** automatizált teszt, amely két tenant adatával fut, és bizonyítja, hogy egyik sem látja a másikét — közvetlen adatbázis-lekérdezéssel is.

---

## 8. Modulonkénti követelmények

Minden modulnál: mit csinál, felhasználói történetek, és **elfogadási kritériumok** — ezek alapján lehet átvenni a munkát.

### 8.1 · 1. modul — AI-főképernyő és parancssáv

**Cél:** a felhasználó ne menüben keresse a funkciót, hanem mondja meg, mit szeretne.

**Felhasználói történetek**
- Kimondom, hogy „mutasd a lejárt számláimat", és látom őket.
- Beírom ugyanezt, és ugyanaz történik.
- Ha félreért, látom, mit értett, és tudom javítani.
- Ha hiányzik egy adat, visszakérdez egy szóval megválaszolható kérdéssel.

**Elfogadási kritériumok**
1. A mikrofon **nyomva tartásra** figyel, elengedésre leáll. Nincs folyamatos figyelés.
2. A felismert szöveg megjelenik a válasz felett („ezt hallottam").
3. A szöveges bevitel mindig elérhető, a hang nélkül is minden funkció használható.
4. A válasz mellett látszik, melyik réteg felelt (0/1/2) — legalább fejlesztői módban.
5. Ismeretlen parancsnál a rendszer felsorolja, mit tud, nem hallgat.

### 8.2 · 2. modul — Cégprofil

**Cél:** minden AI-hívás és minden dokumentum a cég saját adataival dolgozzon.

**Elfogadási kritériumok**
1. Cégadatok, logó, bankszámla, alapértelmezett fizetési határidő szerkeszthető.
2. A logó megjelenik a generált ajánlat PDF-en.
3. Az ajánlat- és levélsablon szövege szerkeszthető.
4. Új cég regisztrálásakor a rendszer önálló, üres, izolált környezetet hoz létre.

### 8.3 · 3. modul — Partnerek

**Elfogadási kritériumok**
1. Partner felvitele, szerkesztése, keresése névre és adószámra.
2. *Javasolt:* adószám alapján cégadat-kitöltés a NAV `queryTaxpayer` hívásával — ez a technikai felhasználóval amúgy is elérhető.
3. Partnerenként megjelenik a nyitott számlák összege és a legrégebbi lejárt tétel.
4. Partner nem törölhető, ha van hozzá dokumentum; archiválható.

### 8.4 · 14. modul — Árlista

**Cél:** ez az ajánlatkészítés alapja. Unalmas modul, de nélküle a 13. nem működik.

**Elfogadási kritériumok**
1. Tétel: megnevezés, cikkszám, mértékegység, **beszerzési ár, eladási ár**, áfakulcs, kategória.
2. A felület megmutatja az **árrést** tételenként (eladási − beszerzési).
3. Tömeges importálás CSV-ből.
4. Az árváltozás nem írja felül a már kiadott ajánlatok tételeit — az ajánlat a kiadáskori árat őrzi.

### 8.5 · 13. modul — Ajánlatkészítés (a mag)

**Cél:** természetes nyelvű bemenetből tételes, logózott ajánlat, jóváhagyás után kiküldve.

**Folyamat**
```
„Készíts ajánlatot a Kovács Kft-nek 800 négyzetméter térkövezésre"
   → partner + mennyiség + változat kinyerése
   → DETERMINISZTIKUS kalkuláció az árlistából
   → „Amit feltételeztem" sáv
   → jóváhagyás
   → PDF + kiküldés + automatikus utánkövetési feladat
```

**Elfogadási kritériumok**
1. ⚠ **A kalkuláció determinisztikus kód**, nem modellhívás. A modell csak a paramétereket tölti ki.
2. Az ajánlat felett kötelezően megjelenik a **„Amit feltételeztem — ellenőrizd"** sáv, felsorolva minden feltevést (felület, szegélyhossz, ráhagyás, mit nem tartalmaz, alkalmazott kedvezmény).
3. Az ajánlat kiküldése a jóváhagyási kapun megy át (3.1).
4. Kiküldés után a rendszer **automatikusan utánkövetési feladatot hoz létre**.
5. A PDF tartalmazza a cég logóját, adatait, a tételeket, a nettó/áfa/bruttó bontást és az érvényességi időt.
6. Ugyanaz a bemenet ugyanazt az összeget adja — az ajánlat reprodukálható.
7. Az ajánlat módosítható kiküldés előtt, és a módosítás naplózódik.

### 8.6 · 11. modul — Feladatok és határidők

**Elfogadási kritériumok**
1. Feladat rögzítése hangból, természetes időmegjelöléssel („jövő kedden", „holnap reggel", „pénteken").
2. A felismert időpont visszaigazolódik a felhasználónak, mielőtt véglegesítjük.
3. Feladat köthető partnerhez és dokumentumhoz.
4. Emlékeztető értesítés — ⚠ iOS-en csak telepített PWA-ban működik, lásd 5.2.
5. Külső naptár-szinkron **nem** az MVP része (+10–15 nap V1-ben).

### 8.7 · 12. modul — Napi összefoglaló

**Elfogadási kritériumok**
1. Naponta **egyszer** generálódik és tárolódik (6.3).
2. Tartalmazza: lejárt követelés összegét és darabszámát, a nap teendőit, a válaszra váró ajánlatokat.
3. A „Mi a helyzet a cégemben?" parancs a tárolt összefoglalót adja vissza, nem generál újat.

### 8.8 · 6. modul — Bejövő számlák (feltételes)

**Cél:** a bejövő számla adatai emberi gépelés nélkül kerüljenek be.

Két forrás, ebben a sorrendben:

1. **NAV `queryInvoiceDigest` INBOUND** — ha működik, ez az elsődleges. Fotózás nélkül, automatikusan.
2. **Fotó / PDF feltöltés** — látásalapú kiolvasás megerősítő folyamattal.

**Elfogadási kritériumok**
1. Minden kiolvasott mező mellett látszik, **honnan** jött (3.5).
2. A bizonytalan mezők vizuálisan elkülönülnek, és a lap tetején összefoglalva is megjelennek.
3. Minden mező **egy koppintással javítható**, a javítás naplózódik (`kiolvasott_mezok.javitva`).
4. A számla csak a felhasználó jóváhagyása után kerül a fizetendők közé.
5. A partnerpárosítás javaslat, nem automatizmus: ha nem egyértelmű, a rendszer kérdez.

⚠ **A nehéz rész nem a kiolvasás, hanem a megerősítő folyamat és a partnerpárosítás.** A becslés nagyobbik fele erre megy el.

---

## 9. Integrációk

### 9.1 Számlázás

**Az árajánlat nálunk marad** — a Billingo API v3 létrehozható dokumentumtípusai `invoice`, `proforma`, `advance`, `draft`; árajánlat nincs köztük. A számlázóhoz a folyamat második fele megy át:

```
ajánlat (nálunk)  →  díjbekérő (proforma az API-n)  →  számla (create-from-proforma)
```

**Teendő a fejlesztés elején:** próbafiókkal ellenőrizni mindkét szolgáltatónál (Számlázz.hu, Billingo) a díjbekérő létrehozását és a számlává alakítást, majd dönteni. Az API-minőség és a díjszabás dönt, nem a márka.

### 9.2 Beszédfelismerés

Kétlépcsős:

| Lépcső | Mi | Költség | Mikor |
|---|---|---|---|
| 1. | Böngésző (Web Speech API, `hu-HU`) | ingyenes | alapeset |
| 2. | ElevenLabs Scribe vagy Deepgram | ~0,22–0,46 USD/óra | ha az 1. nem elérhető vagy gyenge |

⚠ A Web Speech API iOS Safariban 14.5 óta elérhető, de **ismert szeszélyekkel** (a mikrofon nem mindig áll le magától). Tartalék kell mögé.

A választást a 0. fázis 3. spike-ja dönti el, valós zajban mérve. **A fő mérőszám a szándékpontosság**, nem a szóhibaarány.

### 9.3 NAV Online Számla

Csak **lekérdezésre**, nem beküldésre. Ügyfelenként külön technikai felhasználó kell — ezt a beléptetési folyamatba is bele kell tervezni.

Aláírás: `requestSignature = SHA3-512(requestId + UTC időbélyeg YYYYMMDDhhmmss + aláírókulcs)`, nagybetűs hexadecimálisan. Referencia-megvalósítás: `spike/nav/nav-lekerdezes.mjs`.

⚠ A v3 séma évente változik → állandó karbantartási tétel. A NAV-integráció **országspecifikus adapter mögé** kerüljön, ne épüljön bele mélyen az adatmodellbe.

---

## 10. Felületi követelmények

### 10.1 Telefon-első — KÖTELEZŐ

1. Az elsődleges tervezési szélesség **390 px**; az asztali nézet a származtatott.
2. Minimum célfelület **56 px** (kesztyű).
3. Alap betűméret legalább 17 px.
4. **Napfény üzemmód**: külön kapcsoló, tiszta fekete-fehér, vastagabb keretek, árnyék nélkül.
5. Világos és sötét téma, tokenszinten — egyik sem lehet csak média-lekérdezésben definiálva.
6. Nincs vízszintes görgetés semmilyen képernyőn.
7. A fő művelet (mikrofon) hüvelykujjal elérhető helyen, a képernyő alján.

### 10.2 Egy képernyő = egy döntés

Jóváhagyást kérő művelet **teljes képernyős lapon** jelenjen meg, a döntési gombokkal a lap alján. A megerősítő gomb teljes szélességű, és **kimondja, mi fog történni** („Jóváhagyom és kiküldöm"), nem „OK".

### 10.3 Offline

1. A hálózat állapota mindig látszik.
2. Offline állapotban a művelet elkészül, csak a kiküldés vár; a felhasználó látja, hány dolog áll sorban.
3. Kapcsolat visszatértekor a sor automatikusan ürül, és erről visszajelzés érkezik.

### 10.4 AI Act-jelzés

A felület tetején állandóan látható, hogy a válaszokat AI állítja elő, és hogy külső művelet csak jóváhagyás után történik.

---

## 11. Nem funkcionális követelmények

| Terület | Követelmény |
|---|---|
| Válaszidő | A 0. réteg által kezelt parancs **300 ms-on belül** válaszol. Modellhívásnál folyamatjelzés kötelező. |
| Rendelkezésre állás | Munkanapokon 7–19 óra között 99%. |
| Adatrezidencia | Minden személyes adat EU-ban tárolódik. |
| Adatfeldolgozás | Az AI-szolgáltatóval szerződésben rögzítve, hogy az adatokat **nem használják tanításra**. |
| GDPR | Adatexport és -törlés funkció cégenként. Adatfeldolgozói szerződés, alvállalkozói lista (benne az AI-szolgáltató). |
| Naplózás | Minden AI-művelet és minden jóváhagyás naplózva, legalább 5 évig visszakereshetően. |
| Biztonság | Jelszó-szabályok, kétlépcsős azonosítás legalább a tulajdonosi szerepnek. A NAV- és számlázó-kulcsok titkosítva tárolva. |
| Költségkövetés | Felhasználónkénti napi AI- és ASR-költség lekérdezhető (6.3). |

---

## 12. Átadás és elfogadás

A munka akkor tekinthető átadottnak, ha:

1. Minden 8. fejezetbeli elfogadási kritérium teljesül és bemutatható.
2. A 3. fejezet hét sarkalatos követelménye ellenőrizhetően teljesül, ezen belül:
   - kétbérlős izolációs teszt zöld (3.3),
   - nincs kódút a jóváhagyási kapu megkerülésére (3.1),
   - az AI napló bármely műveletnél visszajátszható (3.2).
3. A telefonos füstpróba lefut hiba nélkül (`prototype/fustproba.mjs` mintájára a valódi alkalmazásra).
4. Van futtatható telepítési leírás, és a rendszer üres adatbázisról feláll.
5. Az adatkezelési tájékoztató, az adatfeldolgozói szerződés és az ÁSZF elkészült (ügyvédi közreműködéssel).

---

## 13. Nyitott kérdések

| Kérdés | Ki dönti el | Mikorra |
|---|---|---|
| Működik a NAV INBOUND lekérdezés? | 0. fázis, 1. spike | a fejlesztés indulása előtt |
| Milyen pontos a magyar számlaolvasás? | 0. fázis, 2. spike | a fejlesztés indulása előtt |
| A hang fő út vagy kiegészítő? | 0. fázis, 3. spike | a fejlesztés indulása előtt |
| Számlázó: Számlázz.hu vagy Billingo? | próbafiók + díjszabás | az MVP első hónapjában |
| Előfizetési ár | a mért üzemeltetési költség után | az MVP végére |
| Nemzetközi terv? | üzleti döntés | befolyásolja a NAV-adapter tervezését |

---

## 14. Becslés összefoglalva

| Ütem | Modulok | Nap | Nagyságrend (120–200 e Ft/nap) |
|---|---|---|---|
| MVP a 6. modul nélkül | 1, 2, 3, 11, 12, 13, 14 | 85–105 | 10–21 M Ft |
| MVP a 6. modullal | + 6 | 105–135 | 13–27 M Ft |
| V1 | 4, 5, 7, 8, 9, 15 | +85–125 | 10–25 M Ft |
| V2 | 10, 16, bank | +60–95 | 7–19 M Ft |

Plusz kb. 20% tesztelés és visszajelzés alapú átalakítás.

---

*A nap- és költségbecslések nagyságrendi tájékoztatásra szolgálnak, nem árajánlatok. A szabályozási hivatkozások 2026. augusztusi állapotot tükröznek; a NAV séma, a Google-hitelesítési folyamat és az AI Act végrehajtási szabályai változhatnak. Jogi megfelelőség kérdésében ügyvédi és könyvelői egyeztetés szükséges.*
