/**
 * A munkaidő-kalkuláció tesztjei.
 *
 * Futtatás:  node --test mag/*.teszt.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { munkaidoPercBecsles, osszesitettMunkaido, percOraSzoveg } from './munkaido.mjs';

test('a vízió-dokumentum saját példája: 40 m² × 3 perc/m² × 3 réteg = 360 perc', () => {
  assert.equal(
    munkaidoPercBecsles({ mennyiseg: 40, normaidoPercEgysegre: 3, szorzo: 3 }),
    360,
  );
});

test('szorzó nélkül az alapérték 1', () => {
  assert.equal(munkaidoPercBecsles({ mennyiseg: 10, normaidoPercEgysegre: 3 }), 30);
});

test('kerekít egész percre', () => {
  assert.equal(munkaidoPercBecsles({ mennyiseg: 5, normaidoPercEgysegre: 3.3 }), 17);
});

test('nem pozitív mennyiséget, normaidőt vagy szorzót elutasít, nem talál ki értéket', () => {
  assert.throws(() => munkaidoPercBecsles({ mennyiseg: 0, normaidoPercEgysegre: 3 }));
  assert.throws(() => munkaidoPercBecsles({ mennyiseg: 10, normaidoPercEgysegre: 0 }));
  assert.throws(() => munkaidoPercBecsles({ mennyiseg: 10, normaidoPercEgysegre: 3, szorzo: 0 }));
  assert.throws(() => munkaidoPercBecsles({ mennyiseg: -5, normaidoPercEgysegre: 3 }));
});

test('osszesitettMunkaido összegzi a kitöltött tételeket, és számolja a hiányzókat', () => {
  const eredmeny = osszesitettMunkaido([
    { munkaidoPerc: 120 },
    { munkaidoPerc: 45 },
    { munkaidoPerc: null },
    { munkaidoPerc: undefined },
  ]);
  assert.equal(eredmeny.osszesPerc, 165);
  assert.equal(eredmeny.hianyzoTetelSzam, 2);
});

test('osszesitettMunkaido üres listán nullát ad, nem hibázik', () => {
  assert.deepEqual(osszesitettMunkaido([]), { osszesPerc: 0, hianyzoTetelSzam: 0 });
});

test('percOraSzoveg 60 percnél kisebb értékre percet ír', () => {
  assert.equal(percOraSzoveg(0), '0 perc');
  assert.equal(percOraSzoveg(45), '45 perc');
});

test('percOraSzoveg pontosan 60 percnél órát ír, perc nélkül', () => {
  assert.equal(percOraSzoveg(60), '1 óra');
});

test('percOraSzoveg 24 órán túl is helyesen ír órát és percet', () => {
  assert.equal(percOraSzoveg(125), '2 óra 5 perc');
  assert.equal(percOraSzoveg(360), '6 óra');
  assert.equal(percOraSzoveg(1500), '25 óra');
});

test('negatív percet elutasít', () => {
  assert.throws(() => percOraSzoveg(-1));
});
