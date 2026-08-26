# 3. spike — magyar hangfelismerés

**A kérdés:** használható-e a magyar beszédfelismerés a célközönség valós
körülményei között — cégnevekkel, összegekkel, építkezési háttérzajban?

**Miért fontos előre eldönteni:** a hangvezérlés a demó lelke. Ha az első
benyomás a hang, akkor a hangnak kell a legjobban működnie. Ha magyarul zajban
gyenge, akkor a szöveges parancssáv legyen a fő út, a hang pedig kényelmi
kiegészítő. Ezt előre eldönteni sokkal olcsóbb, mint utólag.

## Amit a mérés valójában mér

Nem a szóhibaarányt (WER) tekintjük fő mérőszámnak, hanem azt, hogy **a helyes
művelet indul-e el**. A mérőlap a prototípus `handle()` függvényének mintáit
használja, tehát pontosan azt méri, amit a felhasználó tapasztalna:

| Mérőszám | Mit jelent |
|---|---|
| szóhiba (WER) | mennyire tér el szó szerint az elhangzottól |
| **szándék eltalálva** | a rendszer a helyes műveletet indítaná-e — **ez dönt** |
| kulcsadat eltalálva | a cégnév és a mennyiség átment-e (800 m², „Kovács Építő”) |
| zajszint | dBFS csúcs a felvétel alatt, hogy a körülmény is dokumentált legyen |

## 1. lépés — mérés a böngészőben

```bash
# Chrome-mal, közvetlenül megnyitva (nem beágyazva)
google-chrome spike/hang/hang-teszt.html      # Linux
open -a "Google Chrome" spike/hang/hang-teszt.html   # macOS
```

- Írd be a „Környezet” mezőbe, hol mérsz (`iroda, csendes` / `autó, motor jár` /
  `építkezés, sarokcsiszoló`). Ez bekerül a riportba.
- Mondd fel a mondatokat egyenként. A felismerés magától leáll, ha elhallgatsz.
- **Ugyanazt a mondatsort vedd fel legalább két környezetben** — a csendes iroda
  önmagában semmit nem bizonyít.
- A végén: „Eredmény mentése (JSON)” → tedd a `hang/eredmeny/` mappába.
  „Felvételek letöltése” → ezekkel megy tovább a 2. lépés.

## 2. lépés — a többi szolgáltató

A böngészőbe épített Web Speech API ingyenes, de nem feltétlenül a legjobb magyarul.
Küldd át ugyanazokat a `.webm` felvételeket legalább két másik szolgáltatónak
(ElevenLabs Scribe, Deepgram, Speechmatics — konzolon vagy API-n), és másold be
az átiratokat:

```bash
cp spike/hang/atiratok-sablon.csv spike/hang/atiratok.csv
# id;szolgaltato;hallott  — az id a mérőlap sorazonosítója (pl. 1.0)

cd spike && node hang/wer.mjs
```

Kimenet: `eredmenyek/hang-riport.md`, szolgáltatónkénti összehasonlítással és
mondatonkénti bontással.

## A döntés

| Szándékpontosság | Termékdöntés |
|---|---|
| 95% fölött | A hang lehet a fő út. |
| 85–95% | A hang kényelmi kiegészítő; a szöveges parancssáv a fő út. Kimondott parancs után mindig látszódjon, mit értett a rendszer. |
| 85% alatt | A hang demófunkció marad, nem épül rá ígéret. |

## Mit tegyél, ha bővül a prototípus

A mérőlapon a `szandekFelismeres()` függvény a prototípus `handle()` mintáinak
másolata, és ugyanez szerepel a `wer.mjs`-ben is. Ha a prototípusban új parancsot
veszel fel, mindhárom helyen bővítsd — különben a mérés nem azt mutatja, amit a
felhasználó tapasztal.

## Korlátok

- A Web Speech API csak Chrome-ban (és Chromium-alapú böngészőkben) működik;
  Firefox és Safari nem támogatja.
- Beágyazott nézetben a böngésző letiltja a mikrofont — a lapot közvetlenül kell megnyitni.
- A hangfelvétel a gépeden marad; a lap semmit nem küld ki és nem tárol tartósan.
