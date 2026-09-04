import type { TetelBemenet } from "./ajanlat-szamitas";

export type CsomagTetel = { termek_id: string; mennyiseg_egysegre: number };

/**
 * Egy munkacsomag tételeiből ajánlat-tételbemeneteket készít egy adott
 * alapmennyiségre ("50 m² térkövezés" → tételenként 50 × mennyiség/egység).
 * Tiszta függvény, DB nélkül — ugyanezt hívja az AI-doboz (szerver) és az
 * ajánlat-űrlap "Csomag hozzáadása" gombja (kliens), hogy a kettő sose
 * számoljon másképp. Két tizedesre kerekít, ahogy az űrlap lépésköze is.
 */
export function csomagTetelBemenetek(tetelek: CsomagTetel[], alapMennyiseg: number): TetelBemenet[] {
  if (!(alapMennyiseg > 0)) return [];
  return tetelek.map((t) => ({
    termekId: t.termek_id,
    mennyiseg: Math.round(alapMennyiseg * Number(t.mennyiseg_egysegre) * 100) / 100,
  }));
}
