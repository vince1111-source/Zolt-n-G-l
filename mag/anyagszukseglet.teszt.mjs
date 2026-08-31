/**
 * Az anyagszükséglet tesztjei.
 *
 * A 800 m²-es eset ugyanaz a demóparancs, mint az árkalkulációnál — ha ez
 * a szám valaha eltérne a telefonos prototípus kimenetétől, a demó két
 * különböző mennyiséget mondana ugyanarra a méretre.
 *
 * Futtatás:  node --test mag/*.teszt.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { anyagszukseglet, beszerzesiKoltseg, ANYAG } from './anyagszukseglet.mjs';

test('800 m²-re a térkő 5% vágási ráhagyással, felfelé kerekített raklapszámmal jön ki', () => {
  const lista = anyagszukseglet({ m2: 800 });
  const terko = lista.find((t) => t.nev === 'Térkő, szürke 6 cm');
  assert.equal(terko.mennyi, 840); // 800 * 1.05
  assert.equal(terko.egyseg, 'm²');
  assert.match(terko.alatta, /65 raklap/); // ceil(840 / 12.96) = 65
});

test('az "antik" változat más terméknevet és nagyker-nevet ad', () => {
  const lista = anyagszukseglet({ m2: 800, anyag: 'antik' });
  const terko = lista.find((t) => t.nagykerNev === 'Térkő anyag, antik 6 cm');
  assert.ok(terko, 'az antik tétel szerepel a listában');
  assert.equal(terko.nev, 'Térkő, antik 6 cm');
});

test('a szegélykő mennyisége a kerületbecslésből jön, nem külön paraméterből', () => {
  // keruletBecsles(800) = 115 fm (lásd arkalkulacio.teszt.mjs)
  const lista = anyagszukseglet({ m2: 800 });
  const szegely = lista.find((t) => t.nev === 'Szegélykő, süttői 100×20');
  assert.equal(szegely.mennyi, 115);
});

test('a zúzottkő és az ágyazóhomok tömegre van átszámolva, egy tizedesre kerekítve', () => {
  const lista = anyagszukseglet({ m2: 800 });
  // 800 * 0.15 * 1.25 * 1.7 = 255 t
  const zuzottko = lista.find((t) => t.nev.startsWith('Zúzottkő'));
  assert.equal(zuzottko.mennyi, 255);
  assert.equal(zuzottko.egyseg, 't');
  // 800 * 0.04 * 1.6 = 51.2 t
  const homok = lista.find((t) => t.nev === 'Ágyazóhomok 0/4');
  assert.equal(homok.mennyi, 51.2);
});

test('a fugahomok zsákszámra kerekít felfelé', () => {
  const lista = anyagszukseglet({ m2: 800 });
  const fuga = lista.find((t) => t.nev === 'Fugahomok');
  // 800 * 2 / 25 = 64 — pont kerek, de a képlet felfelé kerekít
  assert.equal(fuga.mennyi, 64);
  assert.equal(fuga.egyseg, 'zsák');
});

test('nulla vagy negatív területet elutasít, nem talál ki mennyiséget', () => {
  assert.throws(() => anyagszukseglet({ m2: 0 }));
  assert.throws(() => anyagszukseglet({ m2: -10 }));
});

test('a beszerzési költség a nagyker árain összegez, és jelzi a hiányzó tételt', () => {
  const lista = anyagszukseglet({ m2: 100 }); // kis lista, könnyű fejben követni
  const nagykerArak = new Map([
    ['Térkő anyag, szürke 6 cm', 3190],
    ['Zúzottkő 0/32', 4500],
    // a többi tétel szándékosan hiányzik
  ]);
  const { ossz, hianyzo } = beszerzesiKoltseg(lista, nagykerArak);
  assert.equal(hianyzo, 4, 'a lista 6 tételéből 2 van árazva, 4 hiányzik');
  const terko = lista.find((t) => t.nagykerNev === 'Térkő anyag, szürke 6 cm');
  const zuzottko = lista.find((t) => t.nagykerNev === 'Zúzottkő 0/32');
  assert.equal(ossz, terko.mennyi * 3190 + zuzottko.mennyi * 4500);
});

test('a beszerzési költség sima objektumot is elfogad, nem csak Map-et', () => {
  const lista = anyagszukseglet({ m2: 50 });
  const { hianyzo } = beszerzesiKoltseg(lista, { 'Térkő anyag, szürke 6 cm': 3190 });
  assert.equal(hianyzo, 5);
});

test('az ANYAG konstansok exportálva vannak — a felület ugyanezekre hivatkozhat', () => {
  assert.equal(ANYAG.raklapM2, 12.96);
  assert.equal(ANYAG.zsakKg, 25);
});
