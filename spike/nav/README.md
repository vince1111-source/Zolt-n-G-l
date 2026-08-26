# 1. spike — NAV bejövő számla lekérdezés

**A kérdés:** lekérdezhetők-e a cégre kiállított (bejövő) számlák a NAV-tól a cég
saját technikai felhasználójával, és milyen mélységben?

**Miért ez a legfontosabb:** ha igen, a 6. modul (bejövő számlák) nagy része
fotózás és kiolvasás nélkül megoldható. Ez a válasz dönti el az MVP méretét.

## Előfeltétel — ezt neked kell elintézni

1. Belépés az [Online Számla rendszerbe](https://onlineszamla.nav.gov.hu) a cég nevében.
2. **Felhasználók → Új technikai felhasználó.** Ez nem az ügyfélkapu.
3. A technikai felhasználónak adj **„Számla lekérdezése”** jogosultságot.
4. Generáltass **aláírókulcsot**. (Cserekulcs csak számlabeküldéshez kell — ez a
   projekt nem küld be számlát, mert számlázót integrálunk, nem építünk.)
5. Először a **teszt** környezetben próbáld: `onlineszamla-test.nav.gov.hu`,
   külön regisztrációval.

Átfutás tapasztalat szerint 1–3 hét, ezért érdemes ma elindítani.

## Futtatás

```bash
cd spike
cp nav/pelda.env .env && $EDITOR .env
set -a && . ./.env && set +a

# 1. lépés — él-e a hitelesítés egyáltalán
node nav/nav-lekerdezes.mjs --muvelet kapcsolat

# 2. lépés — a tényleges spike kérdés
node nav/nav-lekerdezes.mjs --muvelet bejovo --tol 2026-01-01 --ig 2026-08-25

# 3. lépés — jön-e tételszintű adat is
node nav/nav-lekerdezes.mjs --muvelet szamla --szamlaszam "a fenti listából egy szám"
```

Nincs telepítendő függőség, csak Node 20 vagy újabb.

## Amit a szkript mér

- **kapcsolat** — `queryTaxpayer` a saját adószámra. A legegyszerűbb hitelesített
  hívás; ha ez megy, az aláírás és a kulcsok rendben vannak. Mellékhaszon: ez
  egyben a 3. modul (partnerfelvitel adószámból) alapja.
- **bejovo** — `queryInvoiceDigest` `INBOUND` iránnyal, kiállítási dátum szerint,
  35 napos ablakokra bontva, lapozással. A végén **mezőnkénti kitöltöttséget** ír
  ki: ez mondja meg, mennyi marad kézi munka.
- **szamla** — `queryInvoiceData` egy konkrét számlára. Ha visszajön a base64-elt
  számla-XML tételekkel, a 6. modul tételszinten is építhető NAV-adatból.

## A döntés, amit a kimenet eldönt

| Kimenet | Következmény az MVP-re |
|---|---|
| Digest és tételszintű adat is jön | A fotózás kényelmi funkció lesz, nem a fő út. A 6. modul olcsóbb. |
| Csak digest jön (összesítők) | Fejadatok automatikusan, tételek fotóból/PDF-ből. A 2. spike lesz a döntő. |
| Semmi nem jön / nincs jogosultság | A 6. modul teljesen a kiolvasásra épül. A 2. spike a szűk keresztmetszet. |

Az eredményt írd be a `spike/eredmenyek/EREDMENY-SABLON.md` másolatába.

## Amit a szkript szándékosan nem csinál

- **Nem küld be számlát.** A `manageInvoice` és a hozzá tartozó `tokenExchange`
  szándékosan hiányzik: a 2.4 döntés szerint számlázást nem építünk, hanem
  Számlázz.hu vagy Billingo API-t integrálunk. Lekérdezéshez nem kell token.
- **Nem használ XML-parsert.** A válaszfeldolgozás reguláris kifejezésekkel megy,
  ami spike-hoz elég, termékbe nem. Ott rendes parser kell (pl. `fast-xml-parser`),
  és a NAV v3 séma évente változik — ez állandó karbantartási tétel.
- **Nem tárol semmit a repóban.** A kimenet a `nav/kimenet/` mappába megy, ami
  git-ignorált, mert valódi partneradatot tartalmaz.

## Ha hibát kapsz

A szkript kiírja a NAV `funcCode`, `errorCode` és `message` mezőit, valamint a
technikai validációs üzeneteket. A leggyakoribb okok sorrendben:

1. **Rossz kulcs.** Az aláírókulcsot kell megadni, nem a cserekulcsot.
2. **Adószám.** Csak az első 8 számjegy, kötőjel nélkül.
3. **Jogosultság.** A technikai felhasználónak nincs számlalekérdezési joga.
4. **Órabeállítás.** Az aláírás UTC időbélyeget használ; ha a gép órája sokat
   téved, a NAV elutasítja a kérést.

## Az aláírás szabálya (hogy ellenőrizhető legyen)

```
requestSignature = SHA3-512( requestId + időbélyeg + aláírókulcs )   nagybetűs hex
```

ahol az időbélyeg a fejléc `timestamp` értéke **UTC-ben, `YYYYMMDDhhmmss` alakban**,
elválasztók és időzóna nélkül, ezredmásodperc nélkül. Lekérdező műveleteknél nincs
számlaadat-hash, csak ez a „parciális hitelesítés”. A `passwordHash` a jelszó
SHA-512 lenyomata, szintén nagybetűs hexadecimálisan.

Forrás: NAV Online Számla interfész-specifikáció v3.0 —
<https://onlineszamla.nav.gov.hu/dokumentaciok>,
minta kérések: <https://github.com/nav-gov-hu/Online-Invoice>
