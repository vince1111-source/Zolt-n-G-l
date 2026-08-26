# 0. fázis — spike

Három kérdés, amit **kód írása előtt** el kell dönteni, mert a válaszuk
megváltoztatja az MVP méretét. Ez a mappa a mérőeszközöket tartalmazza; a
válaszokhoz a te adataid és a te fiókjaid kellenek — ezeket AI nem tudja
elintézni helyetted.

| # | Kérdés | Eszköz | Mi kell hozzá | Átfutás |
|---|---|---|---|---|
| 1 | Lekérdezhetők-e a bejövő számlák a NAV-tól? | [`nav/`](nav/) | NAV technikai felhasználó | 1–3 hét (regisztráció) |
| 2 | Milyen pontos a magyar számlaolvasás? | [`szamlaolvasas/`](szamlaolvasas/) | 50–100 valódi számla + Anthropic API kulcs | 1–2 nap |
| 3 | Használható-e a magyar hangfelismerés? | [`hang/`](hang/) | Chrome, mikrofon, 20 perc | fél nap |
| 4 | Mennyibe kerül havonta a parancsfelismerés? | [`parancs/`](parancs/) | a 0. réteg már mérve; az 1. réteghez API kulcs | kész / 1 óra |

**Kezdd az 1-essel**, mert annak a regisztrációs átfutása a leghosszabb — indítsd
el ma, és amíg fut, csináld meg a 2-est és a 3-ast.

## Gyorsindítás

```bash
cd spike
npm install                    # csak a 2. spike-hoz kell (@anthropic-ai/sdk)

# 3. spike — ehhez semmi nem kell, most azonnal csinálható
google-chrome hang/hang-teszt.html

# 4. spike — a 0. réteg mérése API kulcs nélkül is lefut
node parancs/merd.mjs

# 1. spike
cp nav/pelda.env .env && $EDITOR .env
set -a && . ./.env && set +a
node nav/nav-lekerdezes.mjs --muvelet kapcsolat

# 2. spike
export ANTHROPIC_API_KEY=...
# tedd a számlákat a szamlaolvasas/szamlak/ mappába
node szamlaolvasas/kiolvas.mjs
cp szamlaolvasas/igazsag-sablon.csv szamlaolvasas/igazsag.csv   # töltsd ki
node szamlaolvasas/ertekel.mjs
```

Node 20 vagy újabb kell. Az 1. és 3. spike-nak nincs függősége.

## Adatvédelem

**Valódi ügyféladat nem kerül a repóba.** A `.gitignore` kizárja a számlákat, a
kiolvasási eredményeket, a NAV-válaszokat, a hangfelvételeket és a `.env` fájlt.
A `eredmenyek/` mappába csak összesített mérőszámok kerülnek, egyedi adat nem —
ellenőrizd, mielőtt commitolsz.

A számlakiolvasás az Anthropic API-nak küldi a számlaképeket. Éles termékben ezt
az adatfeldolgozói szerződésben és az adatkezelési tájékoztatóban is szerepeltetni
kell, és rögzíteni kell, hogy az adatokat nem használják tanításra (HANDOVER 7.).
A spike-hoz a saját céged számláit használd, ne ügyfélét.

## Amikor megvannak a válaszok

Másold le az `eredmenyek/EREDMENY-SABLON.md` fájlt, töltsd ki, és ez alapján
frissítsd a `HANDOVER.md` 5. fejezetét. Ezután indulhat az MVP —
a scope-ot a három válasz együtt határozza meg:

| Ha… | Akkor az MVP… |
|---|---|
| a NAV ad tételszintű adatot | kisebb: a 6. modul nagyrészt lekérdezés, nem kiolvasás |
| a NAV csak összesítőt ad, de a kiolvasás pontos | változatlan: fejadat NAV-ból, tétel fotóból |
| a NAV semmit nem ad, és a kiolvasás sem pontos | nagyobb: erős megerősítő folyamat kell, vagy a 6. modul V1-be csúszik |
| a hangfelismerés 85% alatt szór | a hangvezérlés kényelmi funkció lesz, nem az első benyomás |

## Amit ez a mappa nem tartalmaz

Ez nem termékkód, és nem is válik azzá. A szkriptek egyszeri mérésre készültek:
nincs bennük hibatűrő XML-parser, adatbázis, jogosultságkezelés vagy tesztkészlet.
Az MVP kódja külön indul, a `HANDOVER.md` 10/C pontja szerint.
