# Irányváltás — 2026. augusztus 26.

Négy új kikötés érkezett, és mindegyik változtat valamin:

1. **Építőipari dolgozók használják** — nem irodában ülő ügyintézők.
2. **Webapp kell, nem natív alkalmazás.**
3. **Nem építünk mindent nulláról** — amit be lehet kötni, azt bekötjük.
4. **Az AI felhasználónkénti költsége maradjon alacsony.**

Ez a dokumentum azt írja le, mi következik ezekből. Ahol javaslok valamit, ott
az indok is ott van — és ahol még mérni kell, ott azt jelzem.

---

## 1. A felhasználó kikerült a helyszínre

Eddig a célszemély a vállalkozó volt, ahogy este az irodában átnézi a dolgokat.
Ha viszont az építőipari dolgozó a felhasználó, akkor a használat körülménye:
**telefon, egy kéz, napfény, por, kesztyű, gyenge térerő, zaj.**

Ebből következik, és ez a jelenlegi prototípusban még nincs benne:

| Mit | Miért |
|---|---|
| Telefon-első felület, nem kicsinyített asztali | A prototípus asztali elrendezésű; a mobil nézet ma másodlagos. Meg kell fordítani. |
| Egykezes elérés, nagy célfelületek (min. 48 px) | Kesztyűben és mozgás közben a pontos koppintás nem működik. |
| Erős kontraszt, nagy alapbetűméret | Napfényben a halvány szürke olvashatatlan. |
| Nyomva-tartós mikrofongomb, nem folyamatos figyelés | Zajban a folyamatos hallgatás félreért, és eszi az akkut. |
| Offline váz, sorba állított műveletek | Alagsorban, betonpincében nincs net. Amit lehet, később szinkronizál. |
| Kevés képernyő, sok hang | Aki dolgozik, nem menüzik. |

**Javaslat:** az MVP felülete telefonra készüljön, és az asztali nézet legyen a
származtatott. Ez nem több munka, csak fordított sorrend — de utólag átfordítani
drága.

## 2. Webapp: telepíthető PWA

A webapp döntés jó, és nem mond ellent a hangvezérlésnek. Amit tudni kell róla:

- **Telepíthető a kezdőképernyőre**, app store nélkül — ez a kis cégeknél előny,
  mert nincs telepítési súrlódás, és a frissítés azonnali.
- **Kamera és mikrofon elérhető** a böngészőből, tehát a számlafotózás és a
  hangvezérlés is működik.
- **Az iOS korlátoz**: push értesítés csak akkor megy, ha a felhasználó tényleg
  hozzáadta a kezdőképernyőhöz. Ha az emlékeztető fontos funkció lesz, a
  telepítés lépését végig kell vezetni a felhasználón, nem elég felkínálni.
- **Natív burokra csak akkor van szükség**, ha később háttérben futó rögzítés
  vagy mélyebb rendszerintegráció kell. Az MVP-hez nem.

## 3. Hang: bekötjük, nem építjük

Saját beszédfelismerést senki nem ír. A kérdés csak az, melyiket kötjük be — és
a válasz: **kettőt, lépcsősen.**

| Lépcső | Mi | Ár | Mikor |
|---|---|---|---|
| 1. | A böngésző beépített felismerése (Web Speech API) | **ingyenes** | ez az alapeset |
| 2. | Felhőszolgáltató (ElevenLabs Scribe vagy Deepgram) | kb. 0,22–0,46 USD / óra | ha az 1. nem elérhető vagy gyenge |

A böngészőbe épített felismerés Chrome-ban és — 14.5 óta — iOS Safariban is
működik, tehát a felhasználók nagy részét ingyen lefedi. Az iOS-es változat
viszont ismert szeszélyekkel jár (a mikrofon nem mindig áll le magától), ezért
tartalék kell mögé.

Mindkét felhőszolgáltató támogat magyart; a Deepgram kifejezetten említi, hogy
a magyar toldalékolást kezeli. Hogy melyik a jobb **a te zajodban**, azt a
3. spike méri meg — a mérőeszköz kész, ugyanazokat a felvételeket küldi
mindkettőnek.

**Költség:** havi 30 perc beszéd felhasználónként (napi ~20 parancs × 6 mp) a
drágább, valós idejű árszabással is **kb. 40 Ft/hó**. Ha a böngésző viszi a
felismerések nagy részét, ennek a töredéke. A hang nem költségkérdés.

## 4. AI: nem az a kérdés, melyik modell — hanem hány hívás

Ez a legfontosabb változás. A költséget nem a modellválasztás dönti el, hanem
az, hogy **hány kérést indítunk el egyáltalán.**

Ezért készült egy negyedik spike (`spike/parancs/`), lépcsős felismeréssel:

```
0. RÉTEG   determinisztikus mintaillesztés     0 Ft · azonnali · offline is megy
1. RÉTEG   olcsó modell, zárt sémával          ~0,5 Ft / hívás
2. RÉTEG   erős modell, csak nyílt feladatra   a hívások néhány százaléka
```

A 68 mondatos, valósághű korpuszon a 0. réteg a parancsok nagy részét kezeli,
és a maradék megy csak modellhez. **Fontos: ez felső becslés**, mert a korpuszt
és a mintákat ugyanaz írta — a valódi számot a 3. spike hangfelvételeiből
származó tényleges átiratok adják meg.

### Becsült havi AI-költség felhasználónként

| Tétel | Feltevés | Becslés |
|---|---|---|
| Parancsfelismerés | havi 300 parancs, lépcsősen | ~10 Ft |
| Beszédfelismerés | havi 30 perc, részben ingyenes | ~40 Ft |
| Bejövő számla kiolvasása | havi 30 számla, olcsó modell | ~60 Ft |
| Ajánlatkészítés | havi 20 ajánlat, közepes modell | ~120 Ft |
| Napi összefoglaló | havi 20 alkalom, olcsó modell | ~20 Ft |
| **Összesen** | | **~250 Ft / hó / felhasználó** |

Ez nagyságrenddel kevesebb, mint a felmérésben szereplő 2 000–6 000 Ft. A
különbség nem trükk: az eredeti becslés azt feltételezte, hogy minden
interakció erős modellt hív. **A számot a 2. spike hitelesíti** — a
számlakiolvasás valódi tokenhasználata ott derül ki.

### Mi viszi el mégis a pénzt, ha nem figyelünk

Nem a modellválasztás, hanem ez a három:

1. **Korlátlan beszélgetéshossz.** Ha minden korábbi üzenet visszamegy minden
   hívásba, a költség lineárisan nő a nap folyamán. Kell egy kontextus-plafon.
2. **Újraszámolt összefoglaló.** Ha a napi összefoglaló minden képernyő-
   megnyitáskor újragenerálódik, az naponta tízszer fizetendő ugyanazért.
   Naponta egyszer készüljön el, és tárolódjon.
3. **Számolás a modellben.** Az árkalkulációt determinisztikus kód végzi.
   Ez egyszerre olcsóbb, gyorsabb, és védhetőbb: az ajánlat mögött a te
   árlistád áll, nem egy nyelvi modell.

**Árazási következmény:** ha a valós költség 250–600 Ft körül marad, a
fenntartható előfizetés is lejjebb vihető, mint a felmérésben szereplő
10 000–20 000 Ft — vagy ugyanazon az áron lényegesen jobb fedezettel megy.
Ezt a 2. spike után érdemes véglegesíteni.

## 5. Mit ne építsünk meg

| Képesség | Döntés | Mivel | Megjegyzés |
|---|---|---|---|
| Számlakiállítás, NAV-adatszolgáltatás | **bekötni** | Számlázz.hu Számla Agent vagy Billingo | Már eldöntött. Saját számlázó jogszabályi teher. |
| Beszédfelismerés | **bekötni** | böngésző + ElevenLabs/Deepgram | Lásd fentebb. |
| Belépés, jogosultság, adattárolás, fájlok | **bekötni** | Supabase | Sorszintű izolációval, EU-s régióban. |
| Ajánlat kiállítása | **saját** | — | Az API nem tud árajánlatot — lásd az 5.1 pontot. |
| Díjbekérő és számla | **bekötni** | Billingo API v3 | Az ajánlat elfogadása után ide megy át a folyamat. |
| Naptár-szinkron | **bekötni, de V1** | Google / Microsoft | Az MVP-ben elég a belső feladatlista. |
| Banki adatok | **bekötni, de V2** | GoCardless / Salt Edge / Tink | Szerződés és havidíj, 1–3 hónap átfutás. |
| PDF-előállítás | **saját, de triviális** | HTML sablon → nyomtatás | Így az arculat sablonszerkeszthető marad. |
| **Az AI-réteg** | **saját** | — | Ez a termék. |
| **A jóváhagyási kapu és az AI napló** | **saját** | — | Ez a bizalom, és ez a jogi védhetőség. |
| **Árlista árréssel** | **saját** | — | A számlázók terméklistája nem kezel árrést és ügyfélárat. |
| **A helyszíni felület** | **saját** | — | Ezt senki nem adja készen. |

### 5.1 Az ajánlatot nem lehet kiszervezni — utánanéztünk

Nyitott kérdés volt, hogy a számlázó API-ja tud-e árajánlatot. **Nem tud.**

A Billingo API v3-ban a létrehozható dokumentumtípusok: `invoice`, `proforma`
(díjbekérő), `advance` (előlegszámla) és `draft`. **Árajánlat nincs köztük** —
az a felületen létező funkció (magasabb csomagtól), de az API-n nem érhető el.
A Számlázz.hu Számla Agentnél ugyanezt nem tudtam ellenőrizni, mert a
dokumentációs oldalaikat a hálózat nem engedte lekérni; ott a díjbekérőre
vonatkozó GYIK létezik, az árajánlatra nem találtam ilyet.

Ez jó hír, nem rossz: **az ajánlat úgyis a termék magja.** Az árréses árlista,
a determinisztikus kalkuláció és az „amit feltételeztem" sáv nem is lenne
kiszervezhető, mert a számlázók terméklistája nem kezel árrést és ügyfélárat.

Amit viszont érdemes bekötni, az a folyamat **második fele**:

```
ajánlat (nálunk: AI + saját árlista + saját PDF)
      │  az ügyfél elfogadja
      ▼
díjbekérő  →  Billingo API:  POST /documents  (type: proforma)
      │  az ügyfél fizet
      ▼
számla     →  Billingo API:  POST /documents/{id}/create-from-proforma
```

Így a NAV-adatszolgáltatás végig a számlázó felelőssége marad, mi pedig csak
azt írjuk meg, ami tényleg a miénk. **Ellenőrizni kell próbafiókkal**, mert ez
a nyilvános API-leírásból származik, nem éles hívásból.

A tanulság: **a megkülönböztetés négy dologban van** — az AI-réteg, a
jóváhagyási kapu, az árréses árlista és a terepre szabott felület. Minden más
bekötendő, nem megírandó.

## 6. Javasolt scope-változás

A jelenlegi MVP nyolc modul, 110–140 nap. Javaslat: **a bejövő számla modul
legyen feltételes.**

| Modul | Eddig | Javaslat |
|---|---|---|
| 1 · AI-főképernyő, hang | MVP | MVP — de telefon-első, lépcsős felismeréssel |
| 2 · Cégprofil | MVP | MVP |
| 3 · Partnerek | MVP | MVP |
| 13 · Ajánlatkészítés | MVP | MVP — ez a mag |
| 14 · Árlista | MVP | MVP — ez a mag |
| 11 · Feladatok | MVP | MVP |
| 12 · Vezetői összefoglaló | MVP | MVP, de egyszerűsítve: napi egy generálás |
| 6 · Bejövő számlák | MVP | **feltételes** — ha az 1. spike zöld, olcsó és marad; ha nem, csússzon V1-be |

Így az MVP nagyságrendileg **85–105 nap** a mai 110–140 helyett, és a
megmaradó rész az, ami közvetlenül pénzt hoz a felhasználónak: gyorsabban ad
ajánlatot, és nem felejt el semmit.

## 7. Ami még nyitott

| Kérdés | Hogyan dől el |
|---|---|
| Elég jó a böngésző hangfelismerése terepen? | 3. spike, két környezetben |
| Mennyi a számlakiolvasás valódi költsége? | 2. spike, valódi számlákon |
| ~~Engedi a Billingo API az ajánlat létrehozását?~~ | **Megvan: nem.** Lásd 5.1. A díjbekérő–számla lánc viszont megy. |
| A Számlázz.hu Agent tud-e díjbekérőt? | dokumentáció (a hálózat most nem engedte lekérni) |
| Mekkora a 0. réteg valódi lefedettsége? | a 3. spike átiratait átengedni a 4. spike mérésén |
| Hol a végleges ár? | a 2. spike után, a tényleges költséggel |

---

*A becslések nagyságrendi tájékoztatásra szolgálnak. Az árak a 2026. augusztusi
listaárak; az árfolyam és a szolgáltatói díjszabás változhat. A jogi
megfelelőség kérdéseiben ügyvédi és könyvelői egyeztetés szükséges.*
