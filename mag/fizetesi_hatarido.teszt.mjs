/**
 * A fizetési határidő tesztjei.
 *
 * Futtatás:  node --test mag/*.teszt.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { fizetesiHatarido, napokEltelte, lejartE } from './fizetesi_hatarido.mjs';

test('a határidő a kiállítás dátumából és a partner napszámából adódik', () => {
  assert.equal(fizetesiHatarido({ kelt: '2026-08-25', fizetesiHataridoNap: 15 }), '2026-09-09');
  assert.equal(fizetesiHatarido({ kelt: '2026-08-25', fizetesiHataridoNap: 8 }), '2026-09-02');
  assert.equal(fizetesiHatarido({ kelt: '2026-08-25', fizetesiHataridoNap: 0 }), '2026-08-25');
});

test('a határidő átível hónap- és évváltáson is', () => {
  assert.equal(fizetesiHatarido({ kelt: '2026-12-20', fizetesiHataridoNap: 15 }), '2027-01-04');
});

test('negatív napszámot elutasít, nem talál ki értéket', () => {
  assert.throws(() => fizetesiHatarido({ kelt: '2026-08-25', fizetesiHataridoNap: -1 }));
});

test('napokEltelte pozitív, ha a kezdő dátum a múltban van', () => {
  assert.equal(napokEltelte('2026-08-05', '2026-08-25'), 20);
});

test('napokEltelte negatív, ha a kezdő dátum a jövőben van', () => {
  assert.equal(napokEltelte('2026-09-01', '2026-08-25'), -7);
});

test('a lejárat napja maga még nem számít lejártnak', () => {
  assert.equal(lejartE('2026-08-25', '2026-08-25'), false);
  assert.equal(lejartE('2026-08-25', '2026-08-26'), true);
  assert.equal(lejartE('2026-08-25', '2026-08-24'), false);
});
