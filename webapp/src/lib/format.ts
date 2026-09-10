export const forint = new Intl.NumberFormat("hu-HU");

export function Ft(osszeg: number) {
  return `${forint.format(Math.round(osszeg))} Ft`;
}

const mennyisegFormatum = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 });

/** Mennyiség magyarul, tizedesvesszővel: 9.375 → "9,38", 52.5 → "52,5", 50 → "50". */
export function mennyisegSzoveg(mennyiseg: number | string) {
  return mennyisegFormatum.format(Number(mennyiseg));
}

/**
 * Mértékegység kiírva: "m2" → "m²", "m3" → "m³". Csak a megjelenítés
 * változik — a tárolt érték marad "m2", a szándékfelismerő és a
 * munkacsomag-logika arra illeszkedik.
 */
export function mertekegysegSzoveg(mertekegyseg: string | null | undefined) {
  const me = (mertekegyseg ?? "").trim();
  if (/^(m2|nm)$/i.test(me)) return "m²";
  if (/^m3$/i.test(me)) return "m³";
  return me;
}

/** "9,38 m³" — mennyiség és mértékegység együtt, ügyfélnek szóló formában. */
export function mennyisegEgyseggel(mennyiseg: number | string, mertekegyseg: string | null | undefined) {
  return `${mennyisegSzoveg(mennyiseg)} ${mertekegysegSzoveg(mertekegyseg)}`.trim();
}
