# Cég AI / Építőipari Adminisztrációs Platform – Claude fejlesztési handover

**Dátum:** 2026-08-31  
**Dokumentum típusa:** termékvízió + UX/UI irány + funkcionális specifikáció + fejlesztési handover  
**Cél:** ezt a dokumentumot Claude kapja meg a termék fejlesztésének folytatásához.

---

# 0. Röviden: mit építünk?

Egy **mobilközpontú, nagyon egyszerűen használható adminisztrációs és operációs rendszert építünk kis építőipari/kivitelező vállalkozásoknak és szakembereknek**.

A célcsoport például:

- burkoló,
- festő,
- kőműves,
- térkövező,
- generálkivitelező,
- villanyszerelő,
- víz-gáz-fűtés szerelő,
- asztalos,
- ács,
- tetőfedő,
- kisebb építőipari csapat,
- 1–10/20 fős szakipari vállalkozás.

A felhasználó alapvetően **nem akar szoftverrel foglalkozni**.

Nem akar:

- táblázatokat kezelni,
- számolgatni,
- bonyolult CRM-et tanulni,
- 15 menüpont között navigálni,
- külön Word/PDF/Excel fájlokat gyártani,
- a könyvelőnek folyamatosan dokumentumokat küldözgetni,
- fejben tartani a határidőket.

A terméknek ezért nem „ERP-érzetet” kell adnia.

A termék fő ígérete:

> **Reggel megnyitod, és tudod, mi a dolgod. A rendszer pedig segít megcsinálni.**

---

# 1. A legfontosabb termékprobléma

A Zolival történt beszélgetés egyik legfontosabb tanulsága:

> Jelenleg kevés funkciónk van, és a meglévő kevés funkció sem működik még elég jól, illetve nem áll össze egy teljes napi workflow-vá.

Ezért **nem az a cél, hogy még több random funkciót tegyünk bele**.

A cél:

## Egyetlen összefüggő munkafolyamat

**Érdeklődő**
→ **Árajánlat**
→ **Anyag + beszerzés**
→ **Kalkuláció**
→ **Kiküldés**
→ **Follow-up**
→ **Elfogadás**
→ **Munka**
→ **Naptár**
→ **Munkavégzés**
→ **Dokumentáció**
→ **Számlázás / fizetés**
→ **Könyvelő**
→ **Lezárás**

Minden adat egyszer kerüljön be.

A következő lépés automatikusan örökölje az előző lépés adatait.

---

# 2. A termék UX-alapelve

## „Simple for people who hate admin.”

Ez nagyon fontos.

Nem tech-savvy felhasználóknak készül.

A felhasználónak nem kell tudnia:

- mi az ERP,
- mi az API,
- mi az adatmodell,
- mi az automatizáció,
- hogyan kell egy kalkulációs táblát felépíteni.

A rendszernek ezt kell helyette megoldania.

### UX szabályok

- kevés gomb,
- nagy, egyértelmű CTA-k,
- egyszerű szövegek,
- kevés menüpont,
- vizuális hierarchia,
- nagy touch targetek,
- mobil-first,
- minél kevesebb gépelés,
- előre kitöltött adatok,
- automatikus számítás,
- automatikus státuszok,
- automatikus emlékeztetők,
- „következő lépés” jellegű UX,
- természetes nyelvű AI-input.

---

# 3. Inspiráció – milyen irányba nézzünk?

A termék UX-éhez érdemes megvizsgálni több, már működő field-service / contractor termék megoldásait.

## Workslip

A hangsúly nagyon egyszerű: mobilról kezelhető munka, ütemezés, számlázás, digitális aláírás és gyors ajánlatkészítés. Kifejezetten terepen dolgozó szakemberekre pozicionálják. citeturn0search2

## Fieldkit

Erős példa arra, hogyan lehet egy komplex vállalkozási workflow-t egyszerű nyelven kommunikálni: jobs, customers, estimates, invoices, mind egy helyen. A „simple by design” irány különösen releváns számunkra. citeturn0search7

## Tofu

Jó példa a workflow-szemléletre: job létrehozása → időpont → szolgáltatás/anyag → ajánlat/számla. Különösen fontos gondolat, hogy az összes információ egy munka köré szerveződjön. citeturn0search10

## Housecall Pro / Jobber

A mobilos field-service irányban jó benchmark az, hogy a technikus telefonjáról elérhető legyen a napi schedule, ügyféladat, job, fotó, checklist, ajánlat, számla és fizetés. Az ajánlatkészítést price bookkal és sablonokkal is támogatják. citeturn0search1turn0search16

## Buildertrend

A komplexebb építőipari irányban érdekes benchmark a daily log, schedule, tasks, files és mobilos projektinformáció. Ebből azt érdemes átvenni, hogy minden projektnek legyen egy központi „igazságforrása”, de a mi UX-ünk legyen sokkal egyszerűbb. citeturn0search6

## Estimation Builder / SiteAnchor

Az árajánlat és kalkuláció szempontjából fontos benchmark a reusable item catalog, template, quantity-based pricing és az, hogy az elfogadott estimate közvetlenül továbbvihető a munkába/project budgetbe. citeturn0search14turn0search15

### Mit NE másoljunk?

A komplex construction management rendszerek túlzott enterprise-érzetét.

A mi célunk:

> **a komplexitást a backendben tartsuk, ne a felhasználó előtt.**

---

# 4. UI – jelenlegi probléma

A jelenlegi zöld-szürke vizuális irány **nem megfelelő**.

Nem elég:

- munkásbarát,
- egyszerű,
- modern,
- letisztult,
- ösztönösen érthető.

A modern alapgondolatot meg akarjuk tartani, de a vizuális rendszert újra kell gondolni.

## Új UI cél

A rendszer nézzen ki úgy, mint egy:

- modern mobilapp,
- nagyon jó consumer app,
- egyszerű pénzügyi / productivity app,
- field-service app,

és ne úgy, mint egy:

- könyvelőprogram,
- vállalatirányítási rendszer,
- régi adminisztrációs webapp.

---

# 5. Új vizuális irány

## Fontos

**Ne legyen túl sok szín.**

A fő hangsúly:

- világos,
- tiszta,
- magas kontraszt,
- nagy kártyák,
- erős tipográfia,
- egyszerű ikonok,
- egyértelmű CTA,
- kevés vizuális zaj.

A „zöld-szürke” jelenlegi dominanciáját el kell engedni.

Lehet egy modern accent color, de ne legyen az egész felület zöld.

## Vizuális hierarchia

A képernyőn mindig legyen egyértelmű:

1. **Mi van most?**
2. **Mi a fontos?**
3. **Mit kell megcsinálnom?**
4. **Mit tudok most egy gombnyomással elintézni?**

---

# 6. A főképernyő – „Ma”

Ez legyen a rendszer legfontosabb képernyője.

A munkás reggel belép.

Ne menüt lásson.

Hanem:

## Jó reggelt, Zoli!

### Ma

**08:00 – Térkövezés**  
Budaörs · 8:00–16:00

**14:00 – Felmérés**  
XI. kerület

### Neked kell még

**3 árajánlat**

**2 utánkövetés**

**1 számla lejárt**

**2 dokumentum hiányzik**

---

## Pénz

**640 000 Ft kintlévőség**

[ Megnézem ]

---

## Következő munka

**Térkövezés – Budaörs**

[ Megnyitom ]

---

A felület ne információs dashboardnak érződjön.

Hanem személyes asszisztensnek.

---

# 7. Navigáció

A navigáció legyen nagyon egyszerű.

Például:

**Ma | Munkák | Ajánlatok | Naptár | Több**

Vagy mobilon:

**Home / Jobs / Quotes / Calendar / More**

A felhasználó ne kapjon 15 külön modult.

A komplex funkciók kerüljenek:

- kontextuális menükbe,
- „More”-ba,
- projektoldalba,
- AI-asszisztensbe.

---

# 8. Az írásos AI box

Ez most különösen fontos.

Mivel jelenleg nincs hangfeldolgozás, az írásos AI-input legyen **kurvára jó**.

Ne egyszerű chatbot legyen.

Legyen egy nagy, jól használható input:

> **„Mit szeretnél elintézni?”**

Példák placeholderként:

- „Írj egy ajánlatot 40 m² falfestésre.”
- „Holnap 8-kor mennem kell Budaörsre.”
- „Küldj emlékeztetőt Péternek az ajánlatról.”
- „Ehhez a munkához kell 160 m² térkő.”
- „Írd meg a teljesítési igazolást.”

Az AI a szöveget **strukturált műveletté alakítsa**.

Példa:

> „Holnap 8-kor megyek Budaörsre térkövezni.”

→ új munka  
→ helyszín: Budaörs  
→ időpont: holnap 08:00  
→ munkatípus: térkövezés

A felhasználó ezt még jóváhagyja.

---

# 9. AI nem csak chat legyen

Az AI célja ne az legyen, hogy „beszélgessünk az AI-jal”.

Az AI legyen **interface a rendszerhez**.

Például:

> „Készíts egy ajánlatot Józsinak 80 m² térkövezésre.”

Az AI:

1. felismeri az ügyfelet,
2. felismeri a munkát,
3. javasolja az anyagokat,
4. betölti az árakat,
5. kiszámolja a mennyiségeket,
6. kiszámolja az időt,
7. elkészíti az ajánlatot,
8. előkészíti az e-mailt.

A user csak ellenőriz.

---

# 10. Árajánlatkészítő

Ez legyen a core feature.

A user:

**+ Új ajánlat**

→ ügyfél  
→ munka  
→ mennyiség  
→ anyag  
→ munkadíj  
→ idő  
→ költségek  
→ árrés  
→ kész ajánlat.

---

# 11. Nagyker / beszállítói böngésző

Ez az egyik új, fontos irány.

A rendszerben legyen egy **anyag- és beszállítói katalógus**.

A felhasználó böngészhet:

- térkő,
- beton,
- sóder,
- cement,
- festék,
- glett,
- csempe,
- ragasztó,
- szigetelés,
- faanyag,
- csavarok,
- gépek,
- egyéb építőanyagok.

---

# 12. „Mire van szükségem ehhez a munkához?”

A még jobb UX nem az, hogy:

> „Keress rá a térkőre.”

Hanem:

> **„Burkolás”**

→ a rendszer felajánlja a tipikus anyagokat.

Például:

### Burkolás – tipikus anyaglista

☑ csempe / burkolat  
☑ ragasztó  
☑ fuga  
☑ alapozó  
☑ szintező rendszer  
☑ szilikon  
☑ élvédő  
☑ segédanyagok

A user kiválasztja, mire van szüksége.

---

# 13. Assemblies / munkacsomagok

Ez nagyon fontos fejlesztési irány.

A felhasználó ne mindig egyesével építse fel az ajánlatot.

Legyenek **munkacsomagok**.

Például:

### „40 m² fürdőszoba burkolás”

Tartalmazhat:

- burkolat,
- ragasztó,
- fuga,
- alapozó,
- segédanyag,
- munkadíj,
- becsült munkaidő.

A user csak:

**40 m²**

és a rendszer skálázza a tételeket.

Ez az egyik olyan funkció, amitől a felhasználó azt érzi:

> „Bazdmeg, ez tényleg kiszámolja helyettem.”

---

# 14. Területi beszállítók

A user megadhatja:

**Saját környék**

vagy használhat helyalapú keresést.

A rendszer:

- környékbeli beszállítókat,
- nagykereskedőket,
- építőanyag-telepeket

mutathat.

A user kiválasztja:

**„Én innen vásárolok.”**

Ettől kezdve az adott beszállítóhoz tartozó árlista kerülhet előtérbe.

---

# 15. Beszerzési ár és ajánlati ár

Fontos különválasztani:

### Belső

**Beszerzési ár: 6 200 Ft/m²**

### Külső

**Ügyfélnek ajánlott ár: 8 500 Ft/m²**

A rendszer számolja:

- önköltség,
- munkadíj,
- egyéb költség,
- markup,
- fedezet,
- végső ajánlati ár.

---

# 16. Árak adatforrása

Első körben ne akarjunk minden nagykereskedőt automatikusan integrálni.

## V1

Saját árlista.

- manuális termékfelvétel,
- CSV,
- Excel-import.

## V2

Közös katalógus.

## V3

Beszállítói feed/API/integráció.

Az automatikus webes árkaparás ne legyen az alaparchitektúra.

Az árak lehetnek:

- partnerenként eltérők,
- mennyiségfüggők,
- nettó/bruttó eltérők,
- kedvezményesek,
- szállításfüggők.

Minden árnál legyen forrás és dátum.

---

# 17. Munkaidő-kalkuláció

Az ajánlatkészítő kapjon **időtervezőt** is.

Példa:

A felhasználó tudja:

> 10 m² falfestés = kb. 30 perc / réteg.

Beír:

**40 m²**

A rendszer:

40 / 10 × 30 perc = 120 perc / réteg.

3 réteg:

**360 perc = 6 óra**

Ez bekerülhet az ajánlatba és a munkatervezésbe.

---

# 18. Munkaidő-adatbázis

Legyenek alapvető munkatípusok:

- festés,
- glettelés,
- burkolás,
- vakolás,
- térkövezés,
- betonozás,
- bontás,
- szerelés,
- szigetelés stb.

A vállalkozó később **saját normaidőket** tudjon megadni.

Például:

> „Én 10 m²-t 45 perc alatt festek le.”

A rendszer ezt tanulhatja / használhatja.

---

# 19. Idő → naptár

Az ajánlat elkészítésekor a rendszer már tudja:

**Becsült munkaidő: 2 nap + 4 óra**

Elfogadás után:

**„Szeretnéd beilleszteni a naptárba?”**

→ igen

A rendszer megmutatja a szabad időablakokat.

---

# 20. Naptár-optimalizálás

Ez különösen fontos az építőipari célcsoportnál.

A naptár ne csak egy Google Calendar-klón legyen.

A rendszernek figyelembe kell vennie:

- munkaidőt,
- munka hosszát,
- helyszínt,
- utazási időt,
- munkások elérhetőségét,
- szükséges anyagok meglétét,
- előző munka várható befejezését.

Példa:

**Munka A:** XI. kerület, 3 óra  
**Munka B:** Budaörs, 6 óra

A rendszer ne rakja egymás után őket irreális utazási idővel.

---

# 21. Naptár „intelligens javaslat”

Elfogadott ajánlat után:

> **„Ez a munka kb. 7 órát vesz igénybe. A következő szabad időablakod: szerda 09:00–16:00.”**

[ Beillesztem ]

Később:

> „Ha ezt péntekre teszed, 35 perc extra utazást jelent.”

Ez már valódi AI/optimalizálási érték.

---

# 22. Automatikus workflow

Az ajánlat ne dokumentum legyen.

Az ajánlat **egy workflow kezdete**.

### Példa

Ajánlat elfogadva.

Automatikusan:

- projekt létrejön,
- naptárjavaslat készül,
- anyaglista létrejön,
- beszerzési lista létrejön,
- munkás feladat létrejön,
- dokumentumlista létrejön,
- későbbi számlázás előkészül.

---

# 23. Építőipari adminisztrációs funkciók

A fő kérdés:

> **Milyen adminisztrációt csinál még egy építőipari munkás/kivitelező?**

A rendszer fokozatosan támogathatja:

### Ajánlat

- ajánlatkészítés,
- módosítás,
- utánkövetés,
- elfogadás.

### Munka

- munkalap,
- napi jelentés,
- munkaidő,
- anyagfelhasználás,
- fotódokumentáció.

### Dokumentáció

- teljesítési igazolás,
- munkalap,
- átadás-átvételi jegyzőkönyv,
- megrendelő,
- szerződés,
- számla/bizonylat,
- garanciális dokumentumok,
- egyéb projektpapírok.

### Pénzügy

- kintlévőség,
- fizetési határidő,
- fizetési emlékeztető,
- költség,
- beszerzés.

### Könyvelés

- dokumentumok,
- hiányzó papírok,
- havi csomag,
- export.

---

# 24. Teljesítési igazolás

Legyen egyszerű:

**+ Teljesítési igazolás**

A rendszer előtölti:

- ügyfél,
- projekt,
- cím,
- dátum,
- munka,
- összeg.

A user ellenőriz.

→ PDF

→ aláírás / küldés

Ez egy tipikus „nem akarom megcsinálni, de muszáj” adminisztráció.

Pont ezért értékes.

---

# 25. Dokumentumkezelés

Minden munkához legyen:

## Dokumentumok

- ajánlat
- szerződés
- teljesítési igazolás
- számla
- fotók
- munkajelentés
- beszerzési dokumentumok
- egyéb

A usernek ne kelljen mappastruktúrát építenie.

A rendszer automatikusan rendezze.

---

# 26. Fotódokumentáció

A munkás a telefonjáról:

**Fotó hozzáadása**

→ kép

→ opcionális megjegyzés

→ automatikusan a projekthez kerül.

Később AI felismerheti:

- munkafázist,
- dokumentumot,
- problémát,
- előtte/utána állapotot.

---

# 27. Könyvelői mód – üzleti jelentőség

A könyvelői funkció nem mellékes.

A terméket egy könyvelőcég segítségével / csatornáján is lehet értékesíteni.

A könyvelő problémája:

> Nem éri el az ügyfelet, nem kapja meg időben a megfelelő papírokat, majd minden hónapban újra elkéri őket.

A rendszer erre adjon megoldást.

---

# 28. Könyvelői hozzáférés – két lehetséges modell

## A. Külön könyvelői UI

A könyvelő saját nézetet kap.

Előnye:

- professzionális,
- jól skálázható,
- több ügyfél kezelhető,
- könyvelői workflow építhető rá.

Hátránya:

- több fejlesztés,
- új UX,
- új jogosultsági réteg.

## B. Meglévő UI + könyvelői role

A könyvelő ugyanazt az alkalmazást használja, de más jogosultságokkal.

Előnye:

- sokkal gyorsabb MVP,
- kevesebb frontend munka,
- ugyanaz az adatmodell.

Hátránya:

- a könyvelői élmény kevésbé specializált.

---

# 29. Javaslat a könyvelői MVP-re

**Első körben ne építsünk teljesen külön könyvelői alkalmazást.**

Építsünk:

### RBAC + könyvelői dashboard

A könyvelő:

- saját accounttal belép,
- hozzá van rendelve cégekhez,
- csak a hozzá rendelt cégeket látja,
- könyveléshez szükséges dokumentumokat látja,
- tud szűrni,
- tud letölteni,
- tud exportálni,
- látja a hiányzó dokumentumokat.

Ez backend oldalon ugyanazt az adatmodellt használja.

Később erre ráépíthető egy teljes könyvelői workspace.

---

# 30. Könyvelő meghívása

Cégadmin:

**Beállítások → Könyvelő hozzáadása**

→ e-mail

→ jogosultság

→ melyik cég/projekt

→ meghívó.

A könyvelő saját accounttal lép be.

**Soha ne legyen közös jelszó.**

---

# 31. Könyvelői dashboard

Példa:

## Ügyfelek

**Kovács Építő Kft.**
- 3 dokumentum hiányzik
- 24 új dokumentum
- 2 ellenőrzésre vár

**Nagy Burkoló Bt.**
- minden rendben

**XY Generál Kft.**
- 7 hiányzó dokumentum

---

# 32. „A könyvelőd ezt kéri tőled”

A vállalkozó saját dashboardján:

> **A könyvelőd 3 dokumentumot kér.**

1. Júliusi számla
2. Teljesítési igazolás
3. Munkás dokumentum

[ Feltöltöm ]

Ez sokkal jobb, mint e-mailben / Messengerben elküldözgetni.

---

# 33. Könyvelői jogosultság

A könyvelő **többet láthat, mint egy munkás**, de nem mindent.

Például:

- számlák: igen
- könyvelési dokumentumok: igen
- saját munkás belső jegyzete: csak ha szükséges
- teljes cégadat: szerepkörtől függ
- adminisztrációs beállítások: nem
- felhasználók törlése: nem
- rendszerbeállítások: nem

A hozzáférés:

**Company → Project → Role → Permission**

alapú legyen.

---

# 34. GDPR / privacy by design

A jogosultság ne „könyvelő = mindent lát” legyen.

Alapelv:

> **Csak a feladat ellátásához szükséges adatot kapja meg.**

Szükséges:

- szerepkör alapú hozzáférés,
- cégenkénti jogosultság,
- projektalapú jogosultság,
- dokumentumtípus-alapú jogosultság,
- audit log,
- letöltések naplózása,
- exportok naplózása,
- hozzáférés visszavonása,
- adatmegőrzési szabályok,
- AI-hozzáférések kontrollja.

A konkrét jogalapokat, adatkezelő/adatfeldolgozó szerepeket, adatmegőrzést és dokumentációt GDPR-ban jártas jogi/adatvédelmi szakértővel kell véglegesíteni.

---

# 35. AI jogosultság

Az AI nem kerülheti meg a jogosultsági rendszert.

Ha a munkás nem láthat egy dokumentumot, az AI sem foglalhatja össze neki.

Ha a könyvelő láthat egy számlát, akkor az AI kérésre elemezheti azt, amennyiben erre a jogosultság és adatkezelési cél kiterjed.

A jogosultságot backend oldalon kell kikényszeríteni.

**Nem elég promptban megmondani az AI-nak, hogy „ne mutasd meg”.**

---

# 36. AI funkciók

## Első kör

### AI szöveges asszisztens

- ajánlat előkészítése,
- e-mail írás,
- teljesítési igazolás,
- munkajelentés,
- dokumentum összefoglalása,
- follow-up üzenet.

### Dokumentum AI

- OCR,
- dokumentumtípus felismerés,
- adatkinyerés,
- projekt-hozzárendelés,
- hiányzó mezők.

### Munkajelentés AI

Szabad szöveg → strukturált jelentés.

---

# 37. Későbbi AI

- ajánlat automatikus összeállítása,
- anyaglista javaslat,
- munkaidő-becslés,
- naptár-optimalizálás,
- költségfigyelés,
- kintlévőség prioritás,
- könyvelői dokumentumellenőrzés,
- projektösszefoglaló,
- problémás dokumentumok felismerése.

---

# 38. AI + adatbázis

A rendszerbe érdemes strukturált adatbázist építeni:

### Customers

- ügyfelek

### Suppliers

- beszállítók

### Materials

- anyagok

### PriceLists

- árlisták

### Assemblies

- tipikus munkacsomagok

### LaborRates

- munkadíjak

### TimeNorms

- normaidők

### Jobs

- munkák

### Quotes

- ajánlatok

### Projects

- projektek

### Documents

- dokumentumok

### Tasks

- feladatok

### CalendarEvents

- naptár

### Payments

- fizetések

### AccountingRequests

- könyvelő által kért dokumentumok

---

# 39. Munkacsomag / assembly adatmodell

Példa:

## „40 m² falfestés”

### Anyag

- festék: 12 liter
- alapozó: 5 liter
- takarófólia: 1 csomag

### Munka

- 1 fő
- 6 óra

### Egyéb

- kiszállás
- eszközköltség

A mennyiség változásával a rendszer skáláz.

---

# 40. Projektadatbázis

Egy projekt legyen az összes kapcsolódó információ központja.

## Projekt

- ügyfél
- cím
- kapcsolattartó
- ajánlat
- munkák
- naptár
- anyagok
- beszerzések
- dokumentumok
- fotók
- munkások
- munkajelentések
- pénzügy
- számlák
- fizetések
- könyvelői dokumentumok

---

# 41. „Egy adat egyszer”

Nagyon fontos fejlesztési szabály:

Ha a user egyszer beírja:

**160 m² térkő**

akkor ezt ne kelljen újra beírnia:

- ajánlatba,
- anyaglistába,
- beszerzésbe,
- projektbe,
- munkalapba,
- számlába.

Az adat végigfolyik a workflow-n.

---

# 42. További hasznos építőipari adminisztráció

A következő funkciókat érdemes backlogban tartani:

## Kötelezően megfontolandó

- teljesítési igazolás
- átadás-átvételi dokumentum
- munkalap
- napi munkajelentés
- fotódokumentáció
- anyagfelhasználás
- hibajegyzék / punch list
- garanciális ügy
- változtatási igény / change order
- pluszmunka dokumentálása
- ügyféljóváhagyás
- digitális aláírás
- fizetési emlékeztető
- dokumentumcsomag
- könyvelői export.

---

# 43. Offline működés

Építkezésen gyakran rossz a mobilinternet.

Hosszabb távon ezért fontos:

- naptár megtekintése offline,
- projektadatok offline,
- munkajelentés offline,
- fotók offline,
- későbbi sync.

Ez nem feltétlenül P0, de az építőipari terméknél stratégiailag fontos.

---

# 44. A termék „wow” pillanatai

A cél, hogy egyszerű funkciók is meglepően okosnak érződjenek.

## Wow #1

„40 m² falfestés”

→ automatikus anyag + idő + ár.

## Wow #2

„Holnap megyek Péterhez.”

→ naptárbejegyzés készül.

## Wow #3

„Készíts ajánlatot ebből.”

→ ajánlat draft.

## Wow #4

„Ez a munka kb. 7 órás.”

→ naptárban megtalálja a megfelelő időablakot.

## Wow #5

„A könyvelőd ezt a 3 papírt kéri.”

→ feltöltés egy helyen.

## Wow #6

„Ezt az ajánlatot 4 napja nem válaszolták meg.”

→ follow-up draft.

## Wow #7

Elfogadott ajánlat

→ projekt + naptár + anyaglista automatikusan.

---

# 45. Amitől nem szabad enterprise software-ré válni

Kerüljük:

- túl sok dashboard,
- túl sok táblázat,
- 10-féle státusz,
- bonyolult beállítás,
- túl sok modal,
- túl sok kötelező mező,
- technikai nyelv,
- üres dashboardok,
- adminisztráció az adminisztráció kedvéért.

---

# 46. P0 – elsődleges fejlesztési prioritás

## UI / UX

- teljes UI redesign
- zöld-szürke dominancia elhagyása
- modern mobil-first rendszer
- egyszerű navigáció
- „Ma” kezdőképernyő
- nagy, egyértelmű CTA-k
- jobb tipográfia
- kevesebb vizuális zaj

## Core workflow

- ügyfél
- ajánlat
- kalkuláció
- e-mail
- follow-up
- elfogadás
- munka
- naptár

## AI

- nagyon jó szöveges input box
- természetes nyelv → strukturált művelet
- ajánlat draft
- e-mail draft

---

# 47. P1 – árajánlat + anyag

- beszállítók
- anyagkatalógus
- saját árlista
- CSV/Excel import
- munkacsomagok
- anyagkalkuláció
- munkadíj
- markup
- fedezet
- normaidő
- munkaidő-kalkuláció

---

# 48. P1 – operáció

- elfogadott ajánlat → projekt
- projekt → naptár
- naptár-optimalizálás
- munkás hozzárendelés
- munkajelentés
- fotók
- dokumentumok
- teljesítési igazolás
- kintlévőség
- fizetési emlékeztető

---

# 49. P1 – könyvelő

- könyvelő szerepkör
- könyvelő meghívás
- company-level access
- dokumentumtár
- hiányzó dokumentum workflow
- könyvelői dashboard
- letöltés
- export
- audit log

**Első körben ne külön könyvelői appot építsünk.**

A meglévő UI-ra épített role-based view legyen az MVP.

---

# 50. P2 – AI

- dokumentum OCR
- dokumentum-osztályozás
- automatikus adatkinyerés
- ajánlat AI
- munkajelentés AI
- időbecslés AI
- naptár AI
- könyvelői dokumentumellenőrzés
- intelligens follow-up

---

# 51. P3 – beszállítói ökoszisztéma

- közös beszállítói katalógus
- területi keresés
- partneri árlisták
- API-k
- árfrissítés
- saját kedvezményes árak
- alternatív termékek
- ár-összehasonlítás

---

# 52. Reális fejlesztési becslés

A pontos idő a jelenlegi kódbázis állapotától függ.

Nagyságrendileg:

### UI/UX újratervezés
**1–3 hét**

### Core workflow
**3–5 hét**

### Anyag/beszállító/kalkuláció
**3–5 hét**

### Munkavégzés + dokumentáció
**2–4 hét**

### Könyvelői role/dashboard
**2–4 hét**

### AI alapok
**3–6 hét**

### Haladó beszállítói integrációk
**folyamatos / partnerfüggő**

Fókuszált fejlesztéssel **3–5 hónap alatt elérhető egy komoly pilot/MVP**, ha nem próbáljuk egyszerre teljes ERP-vé alakítani.

---

# 53. MVP definíció

Az MVP akkor jó, ha egy valódi burkoló/festő/kivitelező:

1. belép reggel,
2. látja a mai munkáit,
3. látja a határidőket,
4. létrehoz egy ajánlatot,
5. kiválasztja az anyagokat,
6. a rendszer számol,
7. elküldi az ajánlatot,
8. a rendszer követi,
9. elfogadás után munkát csinál belőle,
10. a naptárba kerül,
11. elvégzi a munkát,
12. telefonról leadja a jelentést,
13. feltölti a dokumentumokat,
14. a könyvelő hozzáfér,
15. a könyvelőnek nem kell telefonálnia érte.

Ha ezt végig tudja csinálni, már van valódi termékünk.

---

# 54. Pilot

Első körben ideális:

- 3–5 valódi kivitelező,
- 1 könyvelőiroda,
- különböző szakmákból.

Például:

- burkoló,
- festő,
- generálkivitelező,
- villanyszerelő,
- egyéb szakipar.

Mérendő:

- ajánlat elkészítési idő,
- elküldött ajánlatok száma,
- határidőre elkészített ajánlatok,
- follow-up arány,
- dokumentumhiány,
- könyvelői adminisztrációs idő,
- napi apphasználat,
- manuális adminisztrációval töltött idő.

---

# 55. Fontos termékfilozófia

Nem az a cél, hogy:

> „A legtöbb funkcióval rendelkező építőipari rendszer legyünk.”

Hanem:

> **„Mi legyünk az a rendszer, amit a munkás tényleg használ.”**

A rendszernek a háttérben lehet nagyon komplex:

- adatbázis,
- AI,
- automatizáció,
- kalkuláció,
- jogosultság,
- dokumentumkezelés,
- optimalizálás.

De a felhasználó előtt ez legyen:

**egyszerű.**

---

# 56. Claude számára fejlesztési utasítás

A fejlesztés folytatásakor ne csak új funkciókat adj hozzá.

Először:

## 1. Auditáld a jelenlegi rendszert

Nézd meg:

- jelenlegi UI,
- komponensek,
- route-ok,
- adatmodell,
- meglévő funkciók,
- jelenlegi AI flow,
- auth,
- jogosultság,
- mobilnézet,
- hibák.

## 2. Térképezd fel

Mi működik?

Mi nem működik?

Mi duplikált?

Mi hiányzik?

Mi rossz UX?

## 3. Ne törj össze működő funkciót

A redesign legyen fokozatos és kontrollált.

## 4. Először a core loopot építsd meg

**Quote → Material → Calculation → Send → Follow-up → Accepted → Job → Calendar**

## 5. Utána a könyvelői workflow-t

**Documents → Missing documents → Accountant → Export**

## 6. Ezután az AI-t mélyítsd

Az AI ne chatbot legyen.

Az AI legyen:

> **a rendszer természetes nyelvű kezelőfelülete.**

---

# 57. Végső termékvízió

A felhasználó reggel megnyitja a telefont.

Nem lát 40 menüpontot.

Ezt látja:

> **Jó reggelt!**
>
> Ma 2 munkád van.
>
> 3 ajánlatot kell elkészítened.
>
> 1 ügyfélnek válaszolnod kell.
>
> 2 számla lejárt.
>
> A könyvelőd 3 dokumentumot vár.

Majd beírja:

> **„Készíts ajánlatot 40 m² falfestésre.”**

A rendszer:

- kiszámolja az anyagot,
- kiszámolja az időt,
- javasolja az árat,
- elkészíti az ajánlatot,
- előkészíti az e-mailt.

Az ügyfél elfogadja.

A rendszer:

- projektet készít,
- naptárba javasolja,
- kiszámolja a szükséges anyagot,
- feladatot készít.

A munkás elvégzi.

Telefonról:

- fotó,
- munkajelentés,
- teljesítési igazolás.

A rendszer rendezi.

A könyvelő belép.

Látja, ami neki kell.

Nem telefonál.

Nem Messengerben kérdez.

Nem keres 40 e-mailben.

---

# 58. A termék egy mondatban

> **Egy egyszerű, AI-val támogatott digitális munkatárs kis építőipari vállalkozóknak, amely az ajánlattól a munkán át a könyvelőig elintézi és összeköti az adminisztrációt.**

---

# 59. Rövid fejlesztési prioritási sorrend

**1. UI/UX redesign**  
↓  
**2. „Ma” dashboard**  
↓  
**3. Brutálisan jó szöveges AI box**  
↓  
**4. Árajánlat workflow**  
↓  
**5. Anyag + beszállító + kalkuláció**  
↓  
**6. Munkaidő-kalkuláció**  
↓  
**7. Ajánlat → naptár → munka**  
↓  
**8. Munkajelentés + dokumentáció**  
↓  
**9. Könyvelői role + dokumentumworkflow**  
↓  
**10. AI automatizációk**  
↓  
**11. Beszállítói adatbázis / integrációk**  
↓  
**12. Intelligens naptár-optimalizálás**

---

# 60. Egyetlen mondat, amit minden fejlesztési döntésnél szem előtt kell tartani

> **A munkásnak ne a szoftvert kelljen megtanulnia – a szoftvernek kell megtanulnia, hogyan dolgozik a munkás.**
