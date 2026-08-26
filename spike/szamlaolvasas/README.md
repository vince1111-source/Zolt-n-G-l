# 2. spike — magyar számlaolvasás pontossága

**A kérdés:** mennyire pontosan olvas ki egy látásalapú modell valódi magyar
bejövő számlákat, és — ami ennél is fontosabb — **megbízhatóan jelzi-e, ha
bizonytalan**?

**Miért ez a legolcsóbb kockázatcsökkentés:** a célközönség adóügyekben hibázni
nem szeret. Egy rossz összeg, amit a rendszer magabiztosan mutat, többet árt,
mint tíz visszakérdezés. A mérés a „biztos vagyok benne / ellenőrizd” elválasztás
minőségét méri, nem csak a nyers pontosságot.

## Előkészület — ezt neked kell összeszedni

**50–100 valódi bejövő számla**, ahogy a valóságban érkeznek:

- PDF és fotó vegyesen (a fotók a jellemzőbbek),
- legyen köztük **rossz minőségű**: ferde, gyűrött, árnyékos, villanófényes,
- több szállítótól, több számlázóprogramból,
- legyen köztük kézzel írt kiegészítés, bélyegző, több oldalas.

Tedd őket a `szamlak/` mappába. **Ez a mappa git-ignorált**, a számlák nem kerülnek
be a repóba — de azért a saját géped is legyen olyan hely, ahol ez rendben van.

## Futtatás

```bash
cd spike
npm install
export ANTHROPIC_API_KEY=...

# 1. kiolvasás
node szamlaolvasas/kiolvas.mjs

# 2. töltsd ki az igazságot (Excelben is megnyitható, pontosvesszős, UTF-8)
cp szamlaolvasas/igazsag-sablon.csv szamlaolvasas/igazsag.csv

# 3. kiértékelés
node szamlaolvasas/ertekel.mjs
```

Az `igazsag.csv`-be soronként azt írd, ami a számlán **tényleg** szerepel.
Amit üresen hagysz, azt a mérés kihagyja — nem kell minden mezőt kitöltened,
de a pénzügyieket (összegek, számlaszám, adószám, határidő) érdemes.
A `minoseg` oszlop szabad szöveg (`jo` / `gyenge` / `nagyon rossz`); ez alapján
a riport külön is bontja az eredményt.

## Modellek összehasonlítása

Ugyanaz a számlahalmaz több modellel is lefuttatható. A `_futas.json` minden
futásnál kiírja a számlánkénti költséget, ez megy át az üzemeltetési kalkulációba.

```bash
node szamlaolvasas/kiolvas.mjs --modell claude-opus-5
mv szamlaolvasas/kimenet szamlaolvasas/kimenet-opus5

node szamlaolvasas/kiolvas.mjs --modell claude-haiku-4-5
```

Ha az olcsóbb modell csendes hibája nem rosszabb, az közvetlenül az árazásba
számít bele — a HANDOVER 8. fejezete szerint a havi üzemeltetési költség
2 000–6 000 Ft/felhasználó, és a számlakiolvasás ennek jelentős tétele.

## Amit a riport ad

`eredmenyek/szamlaolvasas-riport.md`, három számmal a tetején:

1. **mezőszintű pontosság** — mennyi jön ki jól magától,
2. **hibátlan számla aránya** — mennyi megy át javítás nélkül,
3. **csendes hiba** — rossz érték, amit a modell nem jelölt be. **Ez a döntő.**

A riport végén a küszöbök is ott vannak, amelyek mentén a 6. modul scope-ja
eldől. A csendes hiba az egyetlen szám, ami termékkockázat: minden más csak
kényelmi kérdés.

## Az összehasonlítás szabályai

Hogy ne mérjünk formázási különbséget hibának:

- **Név:** ékezet és cégforma (Kft., Zrt., „Korlátolt Felelősségű Társaság”)
  nélkül hasonlít, és a részleges egyezést is elfogadja.
- **Adószám:** a 8 jegyű törzsszám számít.
- **Dátum:** `2026.08.10.`, `2026-08-10`, `10/08/2026` mind ugyanaz.
- **Összeg:** szóköz, pont, vessző és pénznem nélkül, két tizedesig.
- **Pénznem:** `Ft` és `HUF` ugyanaz.

Ha valamelyik szabály a te adataidon rosszul dönt, az `ertekel.mjs` `norm()`
függvényében egy helyen javítható.
