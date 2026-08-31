/**
 * CÉGEM.AI — anyagszükséglet.
 *
 * Ugyanaz a szabály, mint a többi mag-modulnál: a modell nem számol, a kód
 * igen. Ez a számítás eddig csak a telefonos prototípusban élt
 * (`prototype/CEGEM-AI-telefon.html`) — ez a fájl ugyanazokkal a
 * konstansokkal és képletekkel a mag alá emeli, hogy a webapp és bármely
 * jövőbeli felület ugyanabból az egy forrásból számoljon.
 *
 * A kerületet a `keruletBecsles`-ből veszi, nem külön paraméterként kapja —
 * így nem tud elcsúszni attól, amit az ajánlat ugyanerre a méretre számol.
 */

import { keruletBecsles } from './arkalkulacio.mjs';

export const ANYAG = {
  agyazatVastagsag: 0.15,    // m, tömörítve
  tomoritesiSzorzo: 1.25,    // laza térfogat / tömörített
  zuzottkoSuruseg: 1.7,      // t/m³
  homokVastagsag: 0.04,      // m ágyazóréteg
  homokSuruseg: 1.6,         // t/m³
  raklapM2: 12.96,           // egy raklap szürke 6 cm-es térkő
  fugahomokKgM2: 2,
  zsakKg: 25,
};

const egyTized = (n) => Math.round(n * 10) / 10;

/**
 * A beszerzendő anyagok listája egy adott méretű térkövezéshez.
 *
 * @param {object} p
 * @param {number} p.m2                      burkolandó felület
 * @param {"szurke"|"antik"} [p.anyag]        térkő anyaga
 * @returns {Array<{nev:string, mennyi:number, egyseg:string, nagykerNev:string, alatta:string}>}
 */
export function anyagszukseglet({ m2, anyag = 'szurke' }) {
  if (!(m2 > 0)) throw new Error('A terület csak pozitív szám lehet.');

  const fm = keruletBecsles(m2);
  const terkoM2 = Math.round(m2 * 1.05);
  const zuzottkoM3 = m2 * ANYAG.agyazatVastagsag * ANYAG.tomoritesiSzorzo;
  const homokM3 = m2 * ANYAG.homokVastagsag;
  const antik = anyag === 'antik';

  return [
    {
      nev: antik ? 'Térkő, antik 6 cm' : 'Térkő, szürke 6 cm',
      mennyi: terkoM2,
      egyseg: 'm²',
      nagykerNev: antik ? 'Térkő anyag, antik 6 cm' : 'Térkő anyag, szürke 6 cm',
      alatta: `${Math.ceil(terkoM2 / ANYAG.raklapM2)} raklap · 5% vágási ráhagyással`,
    },
    {
      nev: 'Zúzottkő 0/32 — alapréteg',
      mennyi: egyTized(zuzottkoM3 * ANYAG.zuzottkoSuruseg),
      egyseg: 't',
      nagykerNev: 'Zúzottkő 0/32',
      alatta: `${Math.round(ANYAG.agyazatVastagsag * 100)} cm tömörítve · ${egyTized(zuzottkoM3)} m³ lazán`,
    },
    {
      nev: 'Ágyazóhomok 0/4',
      mennyi: egyTized(homokM3 * ANYAG.homokSuruseg),
      egyseg: 't',
      nagykerNev: 'Ágyazóhomok 0/4',
      alatta: `${Math.round(ANYAG.homokVastagsag * 100)} cm ágyazóréteg`,
    },
    {
      nev: 'Szegélykő, süttői 100×20',
      mennyi: fm,
      egyseg: 'db',
      nagykerNev: 'Szegélykő, süttői 100×20',
      alatta: '1 fm-es elemek, a becsült kerületre',
    },
    {
      nev: 'Beton a szegélygerendához',
      mennyi: egyTized(fm * 0.02),
      egyseg: 'm³',
      nagykerNev: 'C12/15 beton',
      alatta: 'C12/15, kétoldali megtámasztással',
    },
    {
      nev: 'Fugahomok',
      mennyi: Math.ceil((m2 * ANYAG.fugahomokKgM2) / ANYAG.zsakKg),
      egyseg: 'zsák',
      nagykerNev: 'Fugahomok 25 kg',
      alatta: `${ANYAG.zsakKg} kg-os kiszerelés`,
    },
  ];
}

/**
 * A beszerzési lista ára a nagyker aktuális árain.
 *
 * @param {Array<{nagykerNev:string, mennyi:number}>} lista  az `anyagszukseglet` kimenete
 * @param {Map<string,number>|Record<string,number>} nagykerArak  tételnév → beszerzési ár
 * @returns {{ossz:number, hianyzo:number}} `hianyzo`: hány tételre nincs nagyker-ár —
 *   ezt a hívó felületnek jeleznie kell, nem szabad csendben kihagyni.
 */
export function beszerzesiKoltseg(lista, nagykerArak) {
  const arLekeres = nagykerArak instanceof Map
    ? (nev) => nagykerArak.get(nev)
    : (nev) => nagykerArak[nev];

  let ossz = 0;
  let hianyzo = 0;
  for (const tetel of lista) {
    const ar = arLekeres(tetel.nagykerNev);
    if (ar == null) hianyzo += 1;
    else ossz += tetel.mennyi * ar;
  }
  return { ossz, hianyzo };
}
