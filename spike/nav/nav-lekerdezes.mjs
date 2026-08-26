#!/usr/bin/env node
/**
 * CÉGEM.AI — 0. fázis spike / 1. kérdés
 * Működik-e a NAV Online Számla queryInvoiceDigest INBOUND lekérdezés
 * a cég saját technikai felhasználójával?
 *
 * Ez NEM termékkód. Egyetlen célja, hogy eldöntsük: a 6. modul (bejövő számlák)
 * mekkora részét lehet fotózás nélkül, a NAV-tól automatikusan megoldani.
 *
 * Nincs függősége, csak a Node beépített moduljai (>=20).
 *
 * Futtatás:
 *   node nav/nav-lekerdezes.mjs --muvelet kapcsolat
 *   node nav/nav-lekerdezes.mjs --muvelet bejovo --tol 2026-01-01 --ig 2026-08-25
 *   node nav/nav-lekerdezes.mjs --muvelet szamla --szamlaszam SZ-2026/0142
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ITT = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- beállítások

const VEGPONT = {
  teszt: 'https://api-test.onlineszamla.nav.gov.hu/invoiceService/v3',
  eles: 'https://api.onlineszamla.nav.gov.hu/invoiceService/v3',
};

// A queryInvoiceDigest kiállítási dátum szerinti keresésnél a NAV korlátozza az
// intervallum hosszát. A szkript ezért ablakokra bontja a kért időszakot.
// Ha a NAV mást mond a hibaüzenetben, csak ezt a számot kell átírni.
const ABLAK_NAP = 35;
const MAX_OLDAL = 50; // biztonsági fék, hogy egy elrontott szűrő ne pörögjön el

function kornyezet() {
  const k = {
    kornyezet: process.env.NAV_KORNYEZET || 'teszt',
    login: process.env.NAV_LOGIN,
    jelszo: process.env.NAV_JELSZO,
    adoszam: (process.env.NAV_ADOSZAM || '').replace(/[^0-9]/g, '').slice(0, 8),
    alairokulcs: process.env.NAV_ALAIROKULCS,
    // A szoftver-blokk kötelező. Saját fejlesztésnél a softwareId 18 karakter,
    // és a cég saját adatait kell benne szerepeltetni.
    swId: process.env.SW_ID || 'CEGEMAISPIKE000001',
    swNev: process.env.SW_NEV || 'CEGEM.AI spike',
    swFoverzio: process.env.SW_FOVERZIO || '0.1',
    swFejlesztoNev: process.env.SW_FEJLESZTO_NEV || 'CEGEM.AI',
    swFejlesztoKapcsolat: process.env.SW_FEJLESZTO_KAPCSOLAT || 'nincs@megadva.hu',
    swFejlesztoAdoszam: process.env.SW_FEJLESZTO_ADOSZAM || '',
  };
  const hianyzik = ['login', 'jelszo', 'adoszam', 'alairokulcs'].filter((m) => !k[m]);
  if (hianyzik.length) {
    console.error(
      `Hiányzó környezeti változó: ${hianyzik.map((m) => 'NAV_' + m.toUpperCase()).join(', ')}\n` +
        `Másold le a nav/pelda.env fájlt .env néven, töltsd ki, majd:\n` +
        `  set -a && . ./.env && set +a`
    );
    process.exit(2);
  }
  if (k.adoszam.length !== 8) {
    console.error('A NAV_ADOSZAM az adószám első 8 számjegye (kötőjel nélkül).');
    process.exit(2);
  }
  if (!VEGPONT[k.kornyezet]) {
    console.error(`NAV_KORNYEZET csak "teszt" vagy "eles" lehet, ez jött: ${k.kornyezet}`);
    process.exit(2);
  }
  return k;
}

// ------------------------------------------------------------------- aláírás

/**
 * requestSignature = SHA3-512( requestId + UTC időbélyeg YYYYMMDDhhmmss + aláírókulcs ),
 * nagybetűs hexadecimális formában. Lekérdező műveleteknél nincs számlaadat-hash,
 * csak ez a "parciális hitelesítés".
 */
function requestSignature(requestId, datum, alairokulcs) {
  const t =
    String(datum.getUTCFullYear()) +
    p2(datum.getUTCMonth() + 1) +
    p2(datum.getUTCDate()) +
    p2(datum.getUTCHours()) +
    p2(datum.getUTCMinutes()) +
    p2(datum.getUTCSeconds());
  return crypto
    .createHash('sha3-512')
    .update(requestId + t + alairokulcs, 'utf8')
    .digest('hex')
    .toUpperCase();
}

const p2 = (n) => String(n).padStart(2, '0');

const passwordHash = (jelszo) =>
  crypto.createHash('sha512').update(jelszo, 'utf8').digest('hex').toUpperCase();

const ujRequestId = () =>
  'RID' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase();

const xmlEsc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

// -------------------------------------------------------------------- kérések

function fejlec(k, requestId, datum) {
  return `  <common:header>
    <common:requestId>${requestId}</common:requestId>
    <common:timestamp>${datum.toISOString().replace(/\.(\d{3})Z$/, '.$1Z')}</common:timestamp>
    <common:requestVersion>3.0</common:requestVersion>
    <common:headerVersion>1.0</common:headerVersion>
  </common:header>
  <common:user>
    <common:login>${xmlEsc(k.login)}</common:login>
    <common:passwordHash cryptoType="SHA-512">${passwordHash(k.jelszo)}</common:passwordHash>
    <common:taxNumber>${k.adoszam}</common:taxNumber>
    <common:requestSignature cryptoType="SHA3-512">${requestSignature(requestId, datum, k.alairokulcs)}</common:requestSignature>
  </common:user>
  <software>
    <softwareId>${xmlEsc(k.swId)}</softwareId>
    <softwareName>${xmlEsc(k.swNev)}</softwareName>
    <softwareOperation>LOCAL_SOFTWARE</softwareOperation>
    <softwareMainVersion>${xmlEsc(k.swFoverzio)}</softwareMainVersion>
    <softwareDevName>${xmlEsc(k.swFejlesztoNev)}</softwareDevName>
    <softwareDevContact>${xmlEsc(k.swFejlesztoKapcsolat)}</softwareDevContact>
    <softwareDevCountryCode>HU</softwareDevCountryCode>
    <softwareDevTaxNumber>${xmlEsc(k.swFejlesztoAdoszam)}</softwareDevTaxNumber>
  </software>`;
}

function boritek(gyoker, k, torzs) {
  const requestId = ujRequestId();
  const datum = new Date();
  return `<?xml version="1.0" encoding="UTF-8"?>
<${gyoker} xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
${fejlec(k, requestId, datum)}
${torzs}
</${gyoker}>`;
}

async function hivas(k, muvelet, xml) {
  const url = `${VEGPONT[k.kornyezet]}/${muvelet}`;
  const valasz = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      Accept: 'application/xml',
    },
    body: xml,
  });
  const szoveg = await valasz.text();
  return { statusz: valasz.status, szoveg, url };
}

// ------------------------------------------------------- minimális XML-olvasó
// Spike-hoz elég. Termékben rendes XML-parser kell (pl. fast-xml-parser).

function mind(xml, tag) {
  const re = new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'g');
  const ki = [];
  let m;
  while ((m = re.exec(xml))) ki.push(m[1]);
  return ki;
}

const egy = (xml, tag) => mind(xml, tag)[0];

function hibaKiiras(szoveg) {
  const fc = egy(szoveg, 'funcCode');
  const ec = egy(szoveg, 'errorCode');
  const uz = egy(szoveg, 'message');
  if (fc || ec || uz) {
    console.error(`\n  NAV válasz: funcCode=${fc || '-'} errorCode=${ec || '-'}`);
    if (uz) console.error(`  üzenet: ${uz}`);
    for (const v of mind(szoveg, 'technicalValidationMessages')) {
      console.error(`  technikai: ${egy(v, 'validationErrorCode') || ''} — ${egy(v, 'message') || ''}`);
    }
    return true;
  }
  return false;
}

// ------------------------------------------------------------------ műveletek

async function kapcsolat(k) {
  // A legegyszerűbb hitelesített hívás: a saját adószám lekérdezése.
  // Ez egyben a 3. modul (partnerek) adószám-ellenőrzésének is az alapja.
  const xml = boritek('QueryTaxpayerRequest', k, `  <taxNumber>${k.adoszam}</taxNumber>`);
  const { statusz, szoveg, url } = await hivas(k, 'queryTaxpayer', xml);
  console.log(`\n▸ queryTaxpayer — ${url}`);
  console.log(`  HTTP ${statusz}`);
  if (statusz !== 200 || hibaKiiras(szoveg)) {
    console.log('\n  A hitelesítés nem ment át. Ellenőrizd sorban:');
    console.log('   1. a technikai felhasználó login/jelszó párost,');
    console.log('   2. az aláírókulcsot (nem a cserekulcsot!),');
    console.log('   3. hogy a NAV_ADOSZAM az adószám első 8 jegye,');
    console.log('   4. hogy a technikai felhasználónak van "Számla lekérdezése" jogosultsága.');
    return false;
  }
  const nev = egy(szoveg, 'taxpayerName') || egy(szoveg, 'shortName') || '(nincs név a válaszban)';
  console.log(`  ✓ hitelesítés rendben — adózó: ${nev}`);
  console.log(`  ✓ a queryTaxpayer használható a partnerfelvitel adószám-ellenőrzéséhez is`);
  return true;
}

async function bejovoOldal(k, tol, ig, oldal) {
  const torzs = `  <page>${oldal}</page>
  <invoiceDirection>INBOUND</invoiceDirection>
  <invoiceQueryParams>
    <mandatoryQueryParams>
      <invoiceIssueDate>
        <dateFrom>${tol}</dateFrom>
        <dateTo>${ig}</dateTo>
      </invoiceIssueDate>
    </mandatoryQueryParams>
  </invoiceQueryParams>`;
  const xml = boritek('QueryInvoiceDigestRequest', k, torzs);
  return hivas(k, 'queryInvoiceDigest', xml);
}

function digestFeldolgozas(szoveg) {
  return mind(szoveg, 'invoiceDigest').map((d) => ({
    szamlaszam: egy(d, 'invoiceNumber'),
    kiallito_adoszam: egy(d, 'supplierTaxNumber'),
    kiallito_nev: egy(d, 'supplierName'),
    vevo_adoszam: egy(d, 'customerTaxNumber'),
    kelt: egy(d, 'invoiceIssueDate'),
    teljesites: egy(d, 'invoiceDeliveryDate'),
    fizetesi_hatarido: egy(d, 'paymentDate'),
    netto: egy(d, 'invoiceNetAmount'),
    netto_huf: egy(d, 'invoiceNetAmountHUF'),
    afa: egy(d, 'invoiceVatAmount'),
    afa_huf: egy(d, 'invoiceVatAmountHUF'),
    penznem: egy(d, 'currency'),
    muvelet: egy(d, 'invoiceOperation'),
    kategoria: egy(d, 'invoiceCategory'),
    forras: egy(d, 'source'),
    beerkezes: egy(d, 'insDate'),
  }));
}

async function bejovo(k, tol, ig) {
  const sorok = [];
  let hiba = false;
  const ablakok = ablakokra(tol, ig, ABLAK_NAP);
  console.log(`\n▸ queryInvoiceDigest INBOUND — ${tol} … ${ig} (${ablakok.length} ablak, max ${ABLAK_NAP} nap)`);

  for (const [a, b] of ablakok) {
    let oldal = 1;
    let osszOldal = 1;
    do {
      const { statusz, szoveg } = await bejovoOldal(k, a, b, oldal);
      if (statusz !== 200 || hibaKiiras(szoveg)) {
        console.error(`  ✗ ${a} … ${b} / ${oldal}. oldal — HTTP ${statusz}`);
        hiba = true;
        break;
      }
      osszOldal = Number(egy(szoveg, 'availablePage') || 1);
      const db = digestFeldolgozas(szoveg);
      sorok.push(...db);
      console.log(`  ${a} … ${b} — ${oldal}/${osszOldal}. oldal: ${db.length} számla`);
      oldal += 1;
    } while (oldal <= Math.min(osszOldal, MAX_OLDAL));
  }
  return { sorok, hiba };
}

async function szamlaAdat(k, szamlaszam) {
  const torzs = `  <invoiceNumberQuery>
    <invoiceNumber>${xmlEsc(szamlaszam)}</invoiceNumber>
    <invoiceDirection>INBOUND</invoiceDirection>
  </invoiceNumberQuery>`;
  const xml = boritek('QueryInvoiceDataRequest', k, torzs);
  const { statusz, szoveg } = await hivas(k, 'queryInvoiceData', xml);
  console.log(`\n▸ queryInvoiceData INBOUND — ${szamlaszam}`);
  console.log(`  HTTP ${statusz}`);
  if (statusz !== 200 || hibaKiiras(szoveg)) return null;
  const b64 = egy(szoveg, 'invoiceData');
  if (!b64) {
    console.log('  A válaszban nincs invoiceData. Ez a spike egyik lehetséges kimenete:');
    console.log('  a tételszintű adat vevői oldalról nem érhető el, csak az összesítő.');
    return null;
  }
  const szamlaXml = Buffer.from(b64.trim(), 'base64').toString('utf8');
  const tetelek = mind(szamlaXml, 'line').length;
  console.log(`  ✓ tételszintű adat megjött: ${tetelek} tétel, ${szamlaXml.length} bájt XML`);
  console.log('  → a 6. modul tételszinten is építhető NAV-adatból, fotózás nélkül');
  return szamlaXml;
}

// ------------------------------------------------------------------ segédek

function ablakokra(tol, ig, napok) {
  const ki = [];
  let a = new Date(tol + 'T00:00:00Z');
  const veg = new Date(ig + 'T00:00:00Z');
  while (a <= veg) {
    const b = new Date(Math.min(a.getTime() + (napok - 1) * 86400000, veg.getTime()));
    ki.push([iso(a), iso(b)]);
    a = new Date(b.getTime() + 86400000);
  }
  return ki;
}

const iso = (d) => d.toISOString().slice(0, 10);

function argok() {
  const a = process.argv.slice(2);
  const ki = {};
  for (let i = 0; i < a.length; i += 2) ki[a[i].replace(/^--/, '')] = a[i + 1];
  return ki;
}

function osszegzes(sorok) {
  const mezok = Object.keys(sorok[0] || {});
  const kitoltott = Object.fromEntries(
    mezok.map((m) => [m, sorok.filter((s) => s[m] != null && s[m] !== '').length])
  );
  console.log('\n  Mezőnkénti kitöltöttség (ez dönti el, mennyi marad kézi munka):');
  for (const m of mezok) {
    const db = kitoltott[m];
    const szazalek = sorok.length ? Math.round((100 * db) / sorok.length) : 0;
    const jel = szazalek === 100 ? '✓' : szazalek === 0 ? '✗' : '~';
    console.log(`    ${jel} ${m.padEnd(20)} ${String(db).padStart(4)}/${sorok.length}  ${szazalek}%`);
  }
  const partnerek = new Set(sorok.map((s) => s.kiallito_adoszam).filter(Boolean));
  console.log(`\n  ${sorok.length} bejövő számla, ${partnerek.size} különböző szállító.`);
  if (!sorok.some((s) => s.fizetesi_hatarido)) {
    console.log('  FIGYELEM: fizetési határidő nem jött vissza egyetlen számlán sem.');
    console.log('  Ez azt jelenti, hogy az 5. modul esedékesség-figyeléséhez más forrás kell.');
  }
}

// ---------------------------------------------------------------------- main

const a = argok();
const k = kornyezet();
const muvelet = a.muvelet || 'kapcsolat';

console.log(`CÉGEM.AI spike — NAV ${k.kornyezet} környezet, adószám ${k.adoszam}`);

if (muvelet === 'kapcsolat') {
  process.exit((await kapcsolat(k)) ? 0 : 1);
}

if (muvelet === 'bejovo') {
  const ig = a.ig || iso(new Date());
  const tol = a.tol || iso(new Date(Date.now() - 90 * 86400000));
  const { sorok, hiba } = await bejovo(k, tol, ig);
  if (sorok.length) {
    osszegzes(sorok);
    const ki = path.join(ITT, 'kimenet');
    fs.mkdirSync(ki, { recursive: true });
    const fajl = path.join(ki, `nav-bejovo-${tol}_${ig}.json`);
    fs.writeFileSync(fajl, JSON.stringify(sorok, null, 2), 'utf8');
    console.log(`\n  Mentve: ${path.relative(process.cwd(), fajl)}`);
    console.log('  Következő lépés: egy számlaszámmal futtasd a --muvelet szamla ágat,');
    console.log('  hogy kiderüljön, jön-e tételszintű adat is.');
  } else if (!hiba) {
    console.log('\n  A hívás lefutott, de nem jött számla. Bővítsd az időszakot (--tol/--ig).');
  }
  process.exit(hiba ? 1 : 0);
}

if (muvelet === 'szamla') {
  if (!a.szamlaszam) {
    console.error('Adj meg számlaszámot: --szamlaszam SZ-2026/0142');
    process.exit(2);
  }
  const xml = await szamlaAdat(k, a.szamlaszam);
  if (xml) {
    const ki = path.join(ITT, 'kimenet');
    fs.mkdirSync(ki, { recursive: true });
    const fajl = path.join(ki, `szamla-${a.szamlaszam.replace(/[^\w.-]/g, '_')}.xml`);
    fs.writeFileSync(fajl, xml, 'utf8');
    console.log(`  Mentve: ${path.relative(process.cwd(), fajl)}`);
  }
  process.exit(xml ? 0 : 1);
}

console.error(`Ismeretlen művelet: ${muvelet}. Használható: kapcsolat | bejovo | szamla`);
process.exit(2);
