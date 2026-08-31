export const forint = new Intl.NumberFormat("hu-HU");

export function Ft(osszeg: number) {
  return `${forint.format(Math.round(osszeg))} Ft`;
}
