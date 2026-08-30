/**
 * Az árkalkuláció tesztjei.
 *
 * Futtatás:  node --test mag/
 *
 * A legfontosabb teszt az első: rögzíti azt a végösszeget, amit mindkét
 * prototípus mutat ugyanarra a parancsra. Ha ez elmozdul, a demó és a
 * termék két különböző számot mondana — és a bizalom pont ezen múlik.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ajanlatKeszites, terkovezesTetelek, osszesites,
  keruletBecsles, feltetelezesek, VAGASI_RAHAGYAS,
} from './arkalkulacio.mjs';

/** A Kőháló Kft. árlistája — ugyanaz, mint a prototípusokban és a mintaadatban. */
const ARLISTA = [
  { cikkszam: 'MU-101', nev: 'Térkő lerakás, normál kötés',     mertekegyseg: 'm²',   beszerzesi_ar: 3200, eladasi_ar: 4800 },
  { cikkszam: 'MU-102', nev: 'Térkő lerakás, mintás/díszkötés', mertekegyseg: 'm²',   beszerzesi_ar: 4100, eladasi_ar: 6500 },
  { cikkszam: 'MU-110', nev: 'Alapozás, zúzottkő ágyazat',      mertekegyseg: 'm²',   beszerzesi_ar: 1900, eladasi_ar: 2900 },
  { cikkszam: 'MU-120', nev: 'Szegélykő elhelyezés',            mertekegyseg: 'fm',   beszerzesi_ar: 2200, eladasi_ar: 3400 },
  { cikkszam: 'AN-201', nev: 'Térkő anyag, szürke 6 cm',        mertekegyseg: 'm²',   beszerzesi_ar: 2980, eladasi_ar: 3950 },
  { cikkszam: 'AN-202', nev: 'Térkő anyag, antik 6 cm',         mertekegyseg: 'm²',   beszerzesi_ar: 3900, eladasi_ar: 5200 },
  { cikkszam: 'AN-210', nev: 'Szegélykő, süttői 100×20',        mertekegyseg: 'fm',   beszerzesi_ar: 1450, eladasi_ar: 2100 },
  { cikkszam: 'SZ-310', nev: 'Kiszállás, munkakezdés',          mertekegyseg: 'alk.', beszerzesi_ar: 0,    eladasi_ar: 25000 },
];

test('a demó végösszege nem mozdulhat el', () => {
  // „Készíts ajánlatot a Kovács Kft-nek 800 négyzetméter térkövezésre"
  const a = ajanlatKeszites({ m2: 800, arlista: ARLISTA, kedvezmenySzazalek: 3 });
  assert.equal(a.brutto, 12485922, 'ez a szám szerepel mindkét prototípusban');
  assert.equal(a.netto, 9831435);
  assert.equal(a.tetelek.length, 6);
});

test('a kerület becslése négyzetes területet feltételez, 5 fm-re kerekítve', () => {
  assert.equal(keruletBecsles(800), 115);
  assert.equal(keruletBecsles(100), 40);
  assert.equal(keruletBecsles(25), 20);
  assert.throws(() => keruletBecsles(0), /pozitív/);
  assert.throws(() => keruletBecsles(-5), /pozitív/);
});

test('a vágási ráhagyás csak az anyagra vonatkozik, a munkadíjra nem', () => {
  const t = terkovezesTetelek({ m2: 800, arlista: ARLISTA });
  const anyag = t.find((x) => x.cikkszam === 'AN-201');
  const lerakas = t.find((x) => x.cikkszam === 'MU-101');
  const alapozas = t.find((x) => x.cikkszam === 'MU-110');

  assert.equal(anyag.mennyiseg, Math.round(800 * (1 + VAGASI_RAHAGYAS)), '840 m² anyag');
  assert.equal(lerakas.mennyiseg, 800, 'a lerakás a tényleges felületre megy');
  assert.equal(alapozas.mennyiseg, 800, 'az alapozás is');
});

test('az antik változat csak az anyagsort cseréli', () => {
  const szurke = ajanlatKeszites({ m2: 800, arlista: ARLISTA });
  const antik = ajanlatKeszites({ m2: 800, anyag: 'antik', arlista: ARLISTA });

  assert.equal(antik.tetelek.length, szurke.tetelek.length);
  assert.ok(antik.brutto > szurke.brutto, 'az antik drágább');

  const valtozott = antik.tetelek.filter(
    (t, i) => t.cikkszam !== szurke.tetelek[i].cikkszam || t.netto !== szurke.tetelek[i].netto
  );
  assert.equal(valtozott.length, 1, 'pontosan egy sor változott');
  assert.equal(valtozott[0].cikkszam, 'AN-202');
});

test('a mintás kötés csak a lerakás sorát cseréli', () => {
  const normal = ajanlatKeszites({ m2: 300, arlista: ARLISTA });
  const mintas = ajanlatKeszites({ m2: 300, kotes: 'mintas', arlista: ARLISTA });
  const valtozott = mintas.tetelek.filter((t, i) => t.cikkszam !== normal.tetelek[i].cikkszam);
  assert.equal(valtozott.length, 1);
  assert.equal(valtozott[0].cikkszam, 'MU-102');
});

test('a kedvezmény a nettó végösszegre megy, a tételsorok listaáron maradnak', () => {
  const nelkule = ajanlatKeszites({ m2: 500, arlista: ARLISTA });
  const kedvezmennyel = ajanlatKeszites({ m2: 500, arlista: ARLISTA, kedvezmenySzazalek: 10 });

  assert.deepEqual(
    kedvezmennyel.tetelek.map((t) => t.netto),
    nelkule.tetelek.map((t) => t.netto),
    'a tételsorok nem változnak — látszik, mennyit engedtünk'
  );
  assert.equal(kedvezmennyel.listaar, nelkule.listaar);
  assert.equal(kedvezmennyel.netto, Math.round(nelkule.listaar * 0.9));
  assert.equal(kedvezmennyel.kedvezmeny, nelkule.listaar - kedvezmennyel.netto);
});

test('a bruttó a nettóból számol, nem a nettó és az áfa összegéből', () => {
  // Ha az áfát külön kerekítenénk és hozzáadnánk, egy forintot csúszhatna.
  for (const m2 of [1, 7, 33, 101, 777, 1234]) {
    const a = ajanlatKeszites({ m2, arlista: ARLISTA });
    assert.equal(a.brutto, Math.round(a.netto * 1.27), `${m2} m²`);
  }
});

test('ugyanaz a bemenet mindig ugyanazt adja', () => {
  const egyszer = ajanlatKeszites({ m2: 640, anyag: 'antik', arlista: ARLISTA, kedvezmenySzazalek: 5 });
  const masodszor = ajanlatKeszites({ m2: 640, anyag: 'antik', arlista: ARLISTA, kedvezmenySzazalek: 5 });
  assert.deepEqual(egyszer, masodszor);
});

test('az árlista módosítása nem írja át a már kiadott ajánlatot', () => {
  const kiadott = ajanlatKeszites({ m2: 200, arlista: ARLISTA });
  const eltarolt = structuredClone(kiadott.tetelek);

  // Az anyag ára megduplázódik a listában…
  const dragabb = ARLISTA.map((t) =>
    t.cikkszam === 'AN-201' ? { ...t, eladasi_ar: t.eladasi_ar * 2 } : t
  );
  const uj = ajanlatKeszites({ m2: 200, arlista: dragabb });

  assert.ok(uj.brutto > kiadott.brutto, 'az új ajánlat drágább');
  assert.deepEqual(kiadott.tetelek, eltarolt, '…de a kiadott ajánlat tételei változatlanok');
  assert.equal(
    eltarolt.find((t) => t.cikkszam === 'AN-201').egysegar, 3950,
    'a tétel a kiadáskori egységárat őrzi'
  );
});

test('a feltételezések a tényleges számításból származnak', () => {
  const a = ajanlatKeszites({ m2: 800, arlista: ARLISTA, kedvezmenySzazalek: 3, partnerNev: 'Kovács Építő Kft.' });
  const szoveg = a.feltetelezesek.join(' ');

  assert.match(szoveg, /115 fm/, 'a ténylegesen számolt szegélyhossz szerepel benne');
  assert.match(szoveg, /5% vágási ráhagyás/);
  assert.match(szoveg, /3% törzsvevői kedvezmény/);
  assert.match(szoveg, /Kovács Építő Kft\./);
  assert.match(szoveg, /Nem tartalmaz bontást/, 'a kizárások is szerepelnek');
});

test('kedvezmény nélkül nincs kedvezményről szóló feltételezés', () => {
  const lista = feltetelezesek({ m2: 100 });
  assert.ok(!lista.some((s) => /kedvezmény/.test(s)));
});

test('hibás bemenetet elutasít, nem talál ki értéket', () => {
  assert.throws(() => ajanlatKeszites({ m2: 0, arlista: ARLISTA }), /pozitív/);
  assert.throws(() => ajanlatKeszites({ m2: 100, arlista: [] }), /árlista üres/);
  assert.throws(
    () => terkovezesTetelek({ m2: 100, arlista: ARLISTA.filter((t) => t.cikkszam !== 'AN-201') }),
    /Hiányzó árlistatétel: AN-201/
  );
  assert.throws(() => osszesites([{ netto: 100 }], { kedvezmenySzazalek: 120 }), /0 és 100/);
  assert.throws(() => osszesites([], {}), /Nincs tétel/);
});
