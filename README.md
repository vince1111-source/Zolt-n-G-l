# CÉGEM.AI

Magyar nyelvű AI vállalkozói asszisztens kisvállalkozásoknak.

> **„Mondd el, mit intézzek el helyettem.”**

A vállalkozó ne menüt tanuljon, hanem természetes magyar nyelven mondja meg, mit
szeretne. A rendszer ismeri a cég adatait, partnereit, árait, számláit és
határidőit, és a napi adminisztrációt előkészíti — **külső hatású műveletet
pedig soha nem hajt végre jóváhagyás nélkül.**

Első célcsoport: térkövező / kivitelező kisvállalkozás.

## Hol tartunk

**0. fázis — spike.** A kattintható prototípus kész, a három spike-kérdés
mérőeszközei elkészültek; a mérések Vince adataira és hozzáféréseire várnak.
MVP-fejlesztés csak a válaszok után indul, mert azok megváltoztatják a scope-ot.

## Mi hol van

| Útvonal | Mi ez |
|---|---|
| [`HANDOVER.md`](HANDOVER.md) | **Kezdd ezzel.** Teljes projektátadás: döntések, becslések, ütemterv, jogi keret. |
| [`CLAUDE.md`](CLAUDE.md) | Projektutasítások Claude Code-nak: nyelv, sarkalatos szabályok, scope. |
| [`spike/`](spike/) | A 0. fázis mérőeszközei — NAV-lekérdezés, számlaolvasás-pontosság, hangfelismerés. |
| [`prototype/CEGEM-AI-telefon.html`](prototype/CEGEM-AI-telefon.html) | **A fő irány**: telefon-első prototípus. Nyisd meg telefonon, Chrome-ban. |
| [`prototype/CEGEM-AI-prototipus.html`](prototype/CEGEM-AI-prototipus.html) | Az asztali változat, mind a 16 modullal. |
| [`docs/fejlesztoi-specifikacio.md`](docs/fejlesztoi-specifikacio.md) | Fejlesztői specifikáció — Word és PDF a `docs/kiadas/` mappában. |
| [`docs/iranyvaltas.md`](docs/iranyvaltas.md) | A 2026-08-26-i irányváltás: telefon-első, PWA, lépcsős AI, mit ne építsünk. |
| [`docs/demo-forgatokonyv.md`](docs/demo-forgatokonyv.md) | 4 perces bemutató forgatókönyv, kérdés-válaszokkal. |
| [`docs/megvalosithatosagi-terv.html`](docs/megvalosithatosagi-terv.html) | Megvalósíthatósági felmérés: modulonkénti becslés, szűk keresztmetszetek. |
| [`docs/parancsok.md`](docs/parancsok.md) | A prototípusok felismert parancsai. |

## A prototípus megnyitása

```bash
xdg-open prototype/CEGEM-AI-telefon.html   # Linux
open prototype/CEGEM-AI-telefon.html       # macOS
```

**Telefonon nézd**, és Chrome-ban — beágyazva a böngésző letiltja a mikrofont. A prototípus
semmit nem küld ki és nem tárol; az „AI” benne determinisztikus magyar
szándékfelismerő, nem nyelvi modell.

## A következő lépés

```bash
cd spike && cat README.md
```

Három mérés, három döntés. A leghosszabb átfutású a NAV technikai felhasználó
regisztrációja — azt érdemes ma elindítani.
