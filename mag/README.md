# A termék magja

Ami itt van, az **nem bekötendő, hanem sajátunk** — és ezért van külön, tesztelt
kódban, nem a demó HTML-jébe ágyazva.

```
mag/
  arkalkulacio.mjs        az ajánlat determinisztikus számítása
  arkalkulacio.teszt.mjs  12 teszt, köztük a demó végösszegének rögzítése
```

## Futtatás

```bash
node --test mag/*.teszt.mjs
```

Nincs függősége: sima Node 20+, a beépített tesztfuttatóval.

## Miért determinisztikus

A specifikáció kötelezővé teszi: **a modell megért, nem számol.** A nyelvi
modell csak a paramétereket tölti ki — kinek, mennyire, milyen anyagból —,
az összeget ez a modul adja. Három okból:

1. **Olcsóbb.** Nem kell hozzá modellhívás.
2. **Kiszámítható.** Ugyanaz a bemenet mindig ugyanazt az összeget adja; erre
   külön teszt van.
3. **Védhető.** A kiadott ajánlat mögött az ügyfél árlistája áll, nem egy
   nyelvi modell. Ha vita van, meg lehet mutatni, miből jött a szám.

## Két döntés, ami nem nyilvánvaló

**A „mit feltételeztem" lista ugyanabból a számításból származik**, mint az
összeg — nem külön szöveg. Ezért nem tud eltérni attól, ami ténylegesen
történt: ha 115 fm szegéllyel számoltunk, akkor a sárga sávban is 115 fm áll.
Egy külön írt szöveg előbb-utóbb hazudna.

**Az ajánlat tételei a kiadáskori egységárat őrzik.** Az árlista módosítása nem
írhatja át egy már kiadott ajánlat összegét — erre is van teszt. Ugyanez a
szabály az adatbázisban is szerepel (`ajanlat_tetelek.egysegar`).

## A demó végösszege

Az első teszt rögzíti, hogy 800 m² + 3% törzsvevői kedvezmény = **12 485 922 Ft
bruttó**. Ez a szám szerepel mindkét prototípusban. Ha elmozdul, a demó és a
termék két különböző összeget mondana ugyanarra a parancsra — és a bizalom pont
ezen múlik.

Ha az árlista tényleg változik, a tesztet is frissíteni kell, és **ugyanazzal a
mozdulattal a két prototípust is** (`prototype/CEGEM-AI-telefon.html` és
`prototype/CEGEM-AI-prototipus.html`).

## Ami még ide fog kerülni

A specifikáció 6.2 szerinti eszközkészlet többi determinisztikus darabja:
határidő-számítás (fizetési határidő a partner adatlapjából), kintlévőség-
összesítés, anyagszükséglet. Mindegyikre ugyanaz a szabály áll: **amit ki lehet
számolni, azt ne a modell találja ki.**
