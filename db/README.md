# Adatbázis

Ez a séma a fejlesztői specifikáció 7. fejezetének megvalósítása. Nem vázlat:
lefut, és a sarkalatos szabályokat **bizonyítja is**.

```
db/
  migraciok/0001_alap.sql            a séma, RLS-sel és az állapotgéppel
  tesztek/sarkalatos_szabalyok.sql   a bizonyítás — 22 állítás
  mintaadat/kohalo.sql               a prototípus adatai, hogy a demó és a DB egyezzen
  futtat.sh                          egy parancs: séma + tesztek
```

## Futtatás helyben

Kell hozzá PostgreSQL 14 vagy újabb.

```bash
./db/futtat.sh              # friss adatbázis, migráció, tesztek
./db/futtat.sh --mintaadat  # ugyanaz, plusz a Kőháló Kft. mintaadatai
```

A tesztek tranzakcióban futnak és a végén visszagörgetnek, tehát a mintaadat
mellett is bármikor lefuttathatók.

## Mit bizonyítanak a tesztek

Nem azt, hogy a felület betartja a szabályokat, hanem hogy **az adatbázis
kikényszeríti** őket — közvetlen SQL-lel, minden alkalmazáslogikát megkerülve.

| Szabály | Amit a teszt megpróbál | Eredmény |
|---|---|---|
| 3.3 Multi-tenant izoláció | a másik cég sorát olvasni, azonosító szerint is | nem látszik |
| | idegen cég nevében beszúrni | elutasítva |
| | a másik cég sorát törölni | nulla sort érint |
| | cégazonosító nélkül lekérdezni | semmit nem lát |
| 3.1 Jóváhagyási kapu | eleve `vegrehajtott` állapotban létrehozni | elutasítva |
| | `javasolt` → `vegrehajtott` átugrás | elutasítva |
| | jóváhagyás ember és időpont nélkül | elutasítva |
| | `kihagyott` → `vegrehajtott` | elutasítva |
| | a szabályos út végigvitele | működik |
| 3.2 AI napló | naplóbejegyzést átírni | elutasítva |
| | naplóbejegyzést törölni | elutasítva |
| 3.5 Forrásjelölés | számlát forrás megjelölése nélkül rögzíteni | elutasítva |

## Az állapotgép

```
javasolt ──► jovahagyott ──► vegrehajtott
    │              │
    ├──► kihagyott └──► elvetett
    └──► elvetett
```

Ami hiányzik belőle, az a lényeg: **nincs `javasolt → vegrehajtott` él.**
Ezt trigger őrzi, nem konvenció. Emellett ellenőrzés írja elő, hogy jóváhagyott
állapothoz mindig tartozzon ember (`jovahagyta_id`) és időpont (`jovahagyva`).

## Supabase-re telepítés

A migráció úgy készült, hogy Supabase-en és helyben is fusson, de **két dolgot
be kell állítani**:

### 1. A `ceg_id` kerüljön bele a JWT-be

Az `aktualis_ceg()` függvény először a `request.jwt.claims` értékből olvassa a
`ceg_id`-t, és csak utána esik vissza az `app.ceg_id` munkamenet-beállításra.
Supabase-en ehhez **custom access token hook** kell, ami a bejelentkezett
felhasználó cégazonosítóját beleteszi a tokenbe.

Amíg ez nincs beállítva, a függvény NULL-t ad — és akkor a szabályok **semmit
nem engednek látni**. Ez szándékos: az alapértelmezés a semmi, nem a minden.

### 2. A szerep neve

A migráció egy `cegem_app` nevű szerepnek ad jogot, mert helyben ilyen kell.
Supabase-en ez az `authenticated` szerep. Telepítés előtt vagy át kell írni, vagy
egyszerűbb így:

```sql
grant cegem_app to authenticated;
```

### Amit a Supabase ad, és nem kell megírni

Belépés, jelszókezelés, e-mailes megerősítés, fájltárolás, EU-s adatrezidencia.
A `felhasznalok` tábla a Supabase `auth.users` táblájához köthető (`id` mezőn
keresztül) — ezt a beléptetési folyamat kialakításakor érdemes eldönteni.

## Tervezési döntések, amiket érdemes tudni

- **`force row level security`** minden táblán. Enélkül a tábla tulajdonosa
  (a migrációt futtató szerep) mindent látna, és a teszt hamis biztonságot adna.
- **Az árrés nézet, nem oszlop** (`termek_arres`). Így nem tud elavulni.
- **Az ajánlat tételei a kiadáskori árat őrzik.** Az árlista módosítása nem
  írhatja át egy már kiadott ajánlat összegét.
- **A `feltetelezesek` mező az ajánlat része**, nem megjelenítés. Ha vita van
  arról, mit ígértünk, ez mondja meg.
- **A `szamlak.forras` kötelező.** Mindig tudni kell, honnan van az adat:
  NAV-lekérdezésből, fotóból, kézi rögzítésből vagy a számlázó API-jából.
- **Az `ai_naplo` tárolja a bemenetet és a kimenetet is.** Enélkül a napló nem
  visszajátszható, csak egy lista arról, hogy „történt valami".

## Ami még hiányzik

- Migráció a Supabase `auth.users` összekötésére (a beléptetés kialakításakor).
- A `javasolt_muveletek.hivatkozott_id` nem idegen kulcs, mert több táblára
  mutathat. Ha ez zavaró lesz, típusonként külön kapcsolótábla a megoldás.
- Archiválás és GDPR-törlés folyamata (a megfelelőségi tétel része).
