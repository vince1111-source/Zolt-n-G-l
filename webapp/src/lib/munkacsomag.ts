import type { TetelBemenet } from "./ajanlat-szamitas";
import { keruletBecsles } from "./mag.ts";

export type TetelAlap = "terulet" | "kerulet";

export type CsomagTetel = {
  termek_id: string;
  mennyiseg_egysegre: number;
  /**
   * Mihez arányos a tétel: a csomag alapmennyiségéhez, azaz a területhez
   * (alapértelmezés), vagy a területből becsült kerülethez — pl. a szegély
   * (0023). Ismeretlen érték = terület.
   */
  alap?: TetelAlap | string | null;
  /** A termék mértékegysége: darabos egységnél (db, zsák…) felfelé kerekítünk. */
  mertekegyseg?: string | null;
};

/** Egységek, amikből csak egészet lehet venni vagy elszámolni. */
const DARABOS = new Set(["db", "darab", "zsak", "zsák", "alkalom", "raklap", "doboz", "csomag", "tekercs"]);

export function darabosE(mertekegyseg: string | null | undefined): boolean {
  return !!mertekegyseg && DARABOS.has(mertekegyseg.trim().toLowerCase());
}

/**
 * Egy munkacsomag tételeiből ajánlat-tételbemeneteket készít egy adott
 * alapmennyiségre ("50 m² térkövezés").
 *
 * - területtel arányos tétel: alap × mennyiség/egység;
 * - kerülettel arányos tétel: becsült kerület × mennyiség/egység — a
 *   kerület a mag `keruletBecsles` függvényéből jön (négyzet alak, 5 fm-re
 *   kerekítve), ugyanaz, amit a prototípus is használ;
 * - darabos egységnél (zsák, db…) felfelé kerekít, mert 4,8 zsák fugahomok
 *   nem vehető; minden másnál két tizedesre, ahogy az űrlap lépésköze is.
 *
 * Tiszta függvény, DB nélkül — ugyanezt hívja az AI-doboz (szerver) és az
 * ajánlat-űrlap "Tételek hozzáadása" gombja (kliens), hogy a kettő sose
 * számoljon másképp.
 */
export function csomagTetelBemenetek(tetelek: CsomagTetel[], alapMennyiseg: number): TetelBemenet[] {
  if (!(alapMennyiseg > 0)) return [];
  const kerulet = keruletBecsles(alapMennyiseg);
  return tetelek.map((t) => {
    const nyers = (t.alap === "kerulet" ? kerulet : alapMennyiseg) * Number(t.mennyiseg_egysegre);
    const mennyiseg = darabosE(t.mertekegyseg) ? Math.ceil(nyers - 1e-9) : Math.round(nyers * 100) / 100;
    return { termekId: t.termek_id, mennyiseg };
  });
}

/** Van-e a csomagban kerülettel arányos tétel — a feltételezés-sorhoz. */
export function vanKeruletesTetel(tetelek: CsomagTetel[]): boolean {
  return tetelek.some((t) => t.alap === "kerulet");
}
