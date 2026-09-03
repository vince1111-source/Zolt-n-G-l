/**
 * CÉGEM.AI — munkaidő-kalkuláció.
 *
 * Ugyanaz a szabály, mint a többi mag-modulnál: determinisztikus kód, nem
 * a modell mondja meg, mennyi ideig tart egy munka. A normaidőt (1
 * mértékegységnyi munka becsült ideje percben, egy menetben/rétegben)
 * mindig a felhasználó adja meg az árlistán — ez a modul semmilyen
 * szakmai normát nem ismer és nem tesz fel alapértelmezettként.
 */

/**
 * Egy tétel becsült munkaideje percben.
 *
 * @param {object} p
 * @param {number} p.mennyiseg              a tétel mennyisége (pl. m²)
 * @param {number} p.normaidoPercEgysegre    1 mértékegység becsült ideje percben, egy menetben
 * @param {number} [p.szorzo]                munkaidő-only szorzó (pl. rétegek száma), alap 1
 */
export function munkaidoPercBecsles({ mennyiseg, normaidoPercEgysegre, szorzo = 1 }) {
  if (!(mennyiseg > 0)) throw new Error('A mennyiség csak pozitív szám lehet.');
  if (!(normaidoPercEgysegre > 0)) throw new Error('A normaidő csak pozitív szám lehet.');
  if (!(szorzo > 0)) throw new Error('A szorzó csak pozitív szám lehet.');
  return Math.round(mennyiseg * normaidoPercEgysegre * szorzo);
}

/**
 * Egy ajánlat tételeinek összesített becsült munkaideje.
 *
 * A `tetelek` elemei `{ munkaidoPerc: number|null|undefined }` alakúak —
 * a hívó felelőssége, hogy a saját sorait erre az alakra hozza. Azok a
 * tételek, amelyeknél nincs normaidő (tehát `munkaidoPerc` nincs
 * kitöltve), nem adódnak hozzá az összeghez, de számolódnak a
 * `hianyzoTetelSzam`-ba — így a felület jelezheti, hogy a becslés nem
 * teljes, nem hallgatja el.
 */
export function osszesitettMunkaido(tetelek) {
  let osszesPerc = 0;
  let hianyzoTetelSzam = 0;
  for (const t of tetelek) {
    if (t.munkaidoPerc === null || t.munkaidoPerc === undefined) {
      hianyzoTetelSzam += 1;
    } else {
      osszesPerc += t.munkaidoPerc;
    }
  }
  return { osszesPerc, hianyzoTetelSzam };
}

/** Perc → magyar szöveg ("125 perc" -> "2 óra 5 perc"). */
export function percOraSzoveg(perc) {
  if (!(perc >= 0)) throw new Error('A perc csak nemnegatív szám lehet.');
  if (perc < 60) return `${perc} perc`;
  const ora = Math.floor(perc / 60);
  const maradekPerc = perc % 60;
  return maradekPerc === 0 ? `${ora} óra` : `${ora} óra ${maradekPerc} perc`;
}
