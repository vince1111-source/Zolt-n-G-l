/**
 * A kintlévőség-összesítés tesztjei.
 *
 * A minta ugyanaz a három számla, mint a telefonos prototípus mintaadata
 * (`prototype/CEGEM-AI-telefon.html`) — 2026. 08. 25-i mai nappal két
 * lejárt (Kovács, Zöld Kert) és egy még nem esedékes (Szabó) számla van.
 *
 * Futtatás:  node --test mag/*.teszt.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { kintlevosegOsszesites } from './kintlevoseg.mjs';

const MA = '2026-08-25';

const SZAMLAK = [
  { partner: 'Kovács Építő Kft.', brutto: 1240000, hatarido: '2026-08-17', allapot: 'nyitott' },
  { partner: 'Zöld Kert Bt.',     brutto: 620000,  hatarido: '2026-08-05', allapot: 'nyitott' },
  { partner: 'Szabó Ingatlan Zrt.', brutto: 3480000, hatarido: '2026-09-04', allapot: 'nyitott' },
];

test('a nyitott összeg minden nyitott számlát összead, a fizetetteket nem', () => {
  const szamlakFizetettel = [...SZAMLAK, { partner: 'X Kft.', brutto: 100000, hatarido: '2026-08-01', allapot: 'fizetve' }];
  const o = kintlevosegOsszesites(szamlakFizetettel, MA);
  assert.equal(o.nyitottOsszesen, 1240000 + 620000 + 3480000);
  assert.equal(o.nyitottDarab, 3);
});

test('a lejárt összeg csak a határidőn túli, nyitott számlákat adja össze', () => {
  const o = kintlevosegOsszesites(SZAMLAK, MA);
  assert.equal(o.lejartOsszesen, 1240000 + 620000);
  assert.equal(o.lejartDarab, 2);
});

test('a legrégebbi lejárat napjainak száma a legrégebbi lejárt számláé', () => {
  const o = kintlevosegOsszesites(SZAMLAK, MA);
  // Zöld Kert: 2026-08-05 → 2026-08-25 = 20 napja lejárt.
  assert.equal(o.legregebbiLejaratNapja, 20);
});

test('nincs lejárt tétel esetén a legrégebbi lejárat null, nem 0 vagy -Infinity', () => {
  const csakFuturo = [SZAMLAK[2]];
  const o = kintlevosegOsszesites(csakFuturo, MA);
  assert.equal(o.legregebbiLejaratNapja, null);
  assert.equal(o.lejartOsszesen, 0);
});

test('partnerenkénti bontás, lejárt összeg szerint csökkenő sorrendben', () => {
  const o = kintlevosegOsszesites(SZAMLAK, MA);
  assert.equal(o.partnerenkent.length, 3);
  assert.equal(o.partnerenkent[0].partner, 'Kovács Építő Kft.');
  assert.equal(o.partnerenkent[0].lejartOsszeg, 1240000);
  assert.equal(o.partnerenkent[2].partner, 'Szabó Ingatlan Zrt.');
  assert.equal(o.partnerenkent[2].lejartOsszeg, 0);
});

test('egy partner több számlája összeadódik', () => {
  const ketSzamlaUgyanattol = [
    { partner: 'Kovács Építő Kft.', brutto: 100000, hatarido: '2026-08-01', allapot: 'nyitott' },
    { partner: 'Kovács Építő Kft.', brutto: 200000, hatarido: '2026-08-10', allapot: 'nyitott' },
  ];
  const o = kintlevosegOsszesites(ketSzamlaUgyanattol, MA);
  assert.equal(o.partnerenkent.length, 1);
  assert.equal(o.partnerenkent[0].darab, 2);
  assert.equal(o.partnerenkent[0].nyitottOsszeg, 300000);
  assert.equal(o.partnerenkent[0].lejartOsszeg, 300000);
});
