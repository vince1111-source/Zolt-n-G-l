/**
 * Az AI-eszközkészlet és a jóváhagyási kapu állapotgépének tesztjei.
 *
 * Ez a bizonyíték arra, hogy „modellhívás nélkül is tesztelhető, hogy a
 * kapu nem kerülhető meg" (HANDOVER, 8. fejezet, 3. pont) — egyetlen
 * modellhívás sincs ebben a fájlban.
 *
 * Futtatás:  node --test mag/*.teszt.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESZKOZOK,
  eszkozLekeres,
  eszkozIgenyelJovahagyast,
  allapotatmenetErvenyesE,
} from './eszkozok.mjs';

const SPEC_ESZKOZOK = [
  'partner_kereses', 'partner_adatlap', 'szamla_lista', 'arlista_lekerdezes',
  'ajanlat_keszites', 'ajanlat_kikuldes', 'feladat_letrehozas',
  'emlekezteto_tervezet', 'emlekezteto_kuldes', 'dokumentum_kiolvasas',
  'napi_osszefoglalo',
];

test('a fejlesztői specifikáció 6.2 fejezetének mind a 11 eszköze megvan', () => {
  const nevek = ESZKOZOK.map((e) => e.nev);
  for (const nev of SPEC_ESZKOZOK) {
    assert.ok(nevek.includes(nev), `hiányzik: ${nev}`);
  }
  assert.equal(nevek.length, SPEC_ESZKOZOK.length, 'nincs se hiányzó, se felesleges eszköz');
});

test('csak a specifikációban „→ JÓVÁHAGYÁS"-sal jelölt két eszköz igényel jóváhagyást', () => {
  const jovahagyastIgenyloEszkozok = ESZKOZOK.filter((e) => e.igenyelJovahagyast).map((e) => e.nev);
  assert.deepEqual(
    jovahagyastIgenyloEszkozok.sort(),
    ['ajanlat_kikuldes', 'emlekezteto_kuldes'].sort(),
  );
});

test('minden jóváhagyást igénylő eszközhöz tartozik érvényes muvelet_tipus', () => {
  for (const eszkoz of ESZKOZOK.filter((e) => e.igenyelJovahagyast)) {
    assert.ok(eszkoz.muveletTipus, `${eszkoz.nev}-hez nincs muveletTipus megadva`);
  }
});

test('ismeretlen eszközre hibát dob, nem talál ki hamis választ', () => {
  assert.throws(() => eszkozLekeres('nem_letezo_eszkoz'));
  assert.throws(() => eszkozIgenyelJovahagyast('nem_letezo_eszkoz'));
});

test('minden eszköznek van bemeneti sémája', () => {
  for (const eszkoz of ESZKOZOK) {
    assert.equal(eszkoz.bemenetSchema.type, 'object', `${eszkoz.nev} sémája nem object típusú`);
  }
});

// ---------------------------------------------------------- állapotgép --

test('a szabályos út végigjárható: javasolt → jóváhagyott → végrehajtott', () => {
  assert.equal(allapotatmenetErvenyesE('javasolt', 'jovahagyott'), true);
  assert.equal(allapotatmenetErvenyesE('jovahagyott', 'vegrehajtott'), true);
});

test('a mellékágak engedélyezettek: kihagyott és elvetett mindkét szintről', () => {
  assert.equal(allapotatmenetErvenyesE('javasolt', 'kihagyott'), true);
  assert.equal(allapotatmenetErvenyesE('javasolt', 'elvetett'), true);
  assert.equal(allapotatmenetErvenyesE('jovahagyott', 'elvetett'), true);
});

test('NINCS javasolt → végrehajtott él — ez a kapu lényege', () => {
  assert.equal(allapotatmenetErvenyesE('javasolt', 'vegrehajtott'), false);
});

test('a lezárt állapotokból (végrehajtott, kihagyott, elvetett) nincs tovább', () => {
  assert.equal(allapotatmenetErvenyesE('vegrehajtott', 'javasolt'), false);
  assert.equal(allapotatmenetErvenyesE('kihagyott', 'jovahagyott'), false);
  assert.equal(allapotatmenetErvenyesE('elvetett', 'vegrehajtott'), false);
});

test('ismeretlen állapotra hibát dob', () => {
  assert.throws(() => allapotatmenetErvenyesE('javasolt', 'kesz'));
  assert.throws(() => allapotatmenetErvenyesE('kesz', 'javasolt'));
});
