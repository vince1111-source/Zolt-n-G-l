# Kiadásra kész dokumentumok

A `docs/fejlesztoi-specifikacio.md` a forrás. Az itteni Word- és PDF-változat
abból generálódik — **a markdownt szerkeszd, ne ezeket.**

| Fájl | Mire jó |
|---|---|
| `CEGEM-AI-fejlesztoi-specifikacio.docx` | Word — ezt lehet átküldeni fejlesztőnek árajánlatkéréshez |
| `CEGEM-AI-fejlesztoi-specifikacio.pdf` | Olvasásra, nyomtatásra |

## Újragenerálás

```bash
npm i docx playwright && npx playwright install chromium

node docs/kiadas/md2docx.cjs docs/fejlesztoi-specifikacio.md \
     docs/kiadas/CEGEM-AI-fejlesztoi-specifikacio.docx

node docs/kiadas/md2pdf.mjs docs/fejlesztoi-specifikacio.md \
     docs/kiadas/CEGEM-AI-fejlesztoi-specifikacio.pdf
```

Ha a Chromium máshol van: `CHROME=/utvonal/chrome node docs/kiadas/md2pdf.mjs …`

## Miért két külön átalakító

A Word-változat a `docx` npm könyvtárral készül, mert így lesz benne valódi
tartalomjegyzék-mező és szerkeszthető táblázat. A PDF viszont **nem a Word-ből**
készül, hanem közvetlenül a markdownból, Chromium nyomtatásán keresztül — a
LibreOffice ebben a környezetben nem indul, és a böngészős nyomtatás amúgy is
kiszámíthatóbb tördelést ad.

A két átalakító ugyanazt a markdown-részhalmazt kezeli: címsorok, bekezdések,
táblázatok, felsorolások, számozott listák, kódblokkok, idézetek, vízszintes
vonal. Ha a specifikációba ezeken kívül kerül valami, mindkettőt bővíteni kell.
