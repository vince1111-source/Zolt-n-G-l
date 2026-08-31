/**
 * CÉGEM.AI — kintlévőség-összesítés.
 *
 * Ugyanaz a szabály, mint a többi mag-modulnál: ez determinisztikus kód,
 * nem a modell mondja meg, kinek mennyivel tartozik a cég vagy a cég
 * kinek — a `szamlak` tábla sorai és egy dátum a bemenet, a többi számítás.
 *
 * A modul szándékosan nem ismeri a Supabase-t vagy a prototípus adatformáját:
 * a hívó felelőssége, hogy a saját számla-sorait erre az egyszerű alakra
 * hozza — `{ partner, brutto, hatarido, allapot }` —, ahogy a tesztek is
 * teszik.
 */

import { lejartE, napokEltelte } from './fizetesi_hatarido.mjs';

/**
 * @typedef {object} SzamlaSor
 * @property {string} partner    a partner neve (vagy bármi, ami csoportosít)
 * @property {number} brutto
 * @property {string} hatarido   ISO dátum
 * @property {'nyitott'|'fizetve'|'sztornozott'} allapot
 */

/**
 * @param {SzamlaSor[]} szamlak
 * @param {string} ma   ISO dátum — a mai nap, amihez a lejáratot mérjük
 */
export function kintlevosegOsszesites(szamlak, ma) {
  const nyitottak = szamlak.filter((sz) => sz.allapot === 'nyitott');
  const lejartak = nyitottak.filter((sz) => lejartE(sz.hatarido, ma));

  const partnerTerkep = new Map();
  for (const sz of nyitottak) {
    const bejegyzes = partnerTerkep.get(sz.partner) ?? {
      partner: sz.partner,
      nyitottOsszeg: 0,
      lejartOsszeg: 0,
      darab: 0,
    };
    bejegyzes.nyitottOsszeg += sz.brutto;
    bejegyzes.darab += 1;
    if (lejartE(sz.hatarido, ma)) bejegyzes.lejartOsszeg += sz.brutto;
    partnerTerkep.set(sz.partner, bejegyzes);
  }

  const partnerenkent = [...partnerTerkep.values()].sort(
    (a, b) => b.lejartOsszeg - a.lejartOsszeg || b.nyitottOsszeg - a.nyitottOsszeg,
  );

  return {
    nyitottOsszesen: nyitottak.reduce((s, sz) => s + sz.brutto, 0),
    nyitottDarab: nyitottak.length,
    lejartOsszesen: lejartak.reduce((s, sz) => s + sz.brutto, 0),
    lejartDarab: lejartak.length,
    legregebbiLejaratNapja: lejartak.length
      ? Math.max(...lejartak.map((sz) => napokEltelte(sz.hatarido, ma)))
      : null,
    partnerenkent,
  };
}
