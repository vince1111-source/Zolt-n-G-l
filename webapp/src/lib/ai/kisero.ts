import { szovegValasz, MODELL_EROS, type AiHivasEredmeny } from "./openai";

/**
 * Ajánlat kísérőlevele — PISZKOZAT, amit a vállalkozó a saját levelezőjébe
 * másol. Nem küldünk e-mailt (10. modul, V2; CLAUDE.md: Gmail-integráció
 * tilos). Kérésre generálódik, és az ajánlaton tárolódik (0021
 * `kisero_szoveg`), hogy ne készüljön újra minden megnyitáskor.
 */
export type KiseroAdatok = {
  cegNev: string;
  kuldoNev: string;
  partnerNev: string;
  kapcsolattarto: string | null;
  sorszam: string;
  bruttoFt: number;
  ervenyesIg: string | null;
  tetelek: string[];
  helyszin: string | null;
};

const UTASITAS = `Egy magyar kivitelező kisvállalkozás nevében írsz rövid kísérő e-mailt egy árajánlathoz, amit mellékletként küldenek.
Formátum: első sor "Tárgy: …", utána üres sor, majd a levél törzse; magázódva, udvariasan, tömören (legfeljebb 120 szó); aláírás a küldő nevével és a cég nevével.
Szigorú szabályok:
- KIZÁRÓLAG a megadott adatokat használd: ne találj ki határidőt, kedvezményt, garanciát, telefonszámot vagy ígéretet.
- Az összeget forintban, ezres tagolással írd, "bruttó" jelzővel.
- Ha van érvényességi dátum, említsd meg; ha nincs, ne írj róla.
- Ne írj olyan mondatot, hogy "mellékelten küldöm" helyett mást — a levélhez az ajánlat PDF-je mellékletként kerül.`;

export async function kiseroLevelSzovege(adatok: KiseroAdatok): Promise<AiHivasEredmeny<string>> {
  return szovegValasz({
    modell: MODELL_EROS,
    utasitas: UTASITAS,
    bemenet: JSON.stringify(adatok),
    maxKiToken: 1200,
  });
}
