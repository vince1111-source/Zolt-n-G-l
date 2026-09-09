import { szovegValasz, MODELL_EROS, type AiHivasEredmeny } from "./openai";

/**
 * Napi összefoglaló — a vízió-dokumentum "Jó reggelt, Zoli!" képernyője.
 * Naponta EGYSZER generálódik cégenként és tárolódik (napi_osszefoglalok,
 * 0021) — CLAUDE.md költségszabály. A bemenet kizárólag determinisztikus
 * tény, amit a "Ma" oldal amúgy is kiszámol; a modell csak fogalmaz.
 */
export type NapiTenyek = {
  nev: string;
  datum: string;
  napNeve: string;
  nyitottMunka: number;
  fuggoAjanlat: number;
  nyitottTeendo: number;
  surgosTeendok: string[];
  kintlevosegFt: number;
  kintlevosegDarab: number;
  lejartFt: number;
  regotaVarakozo: { partner: string; sorszam: string; napok: number }[];
  maiEsemenyek: { ido: string; cim: string }[];
};

const UTASITAS = `Egy magyar kivitelező (térkövező) kisvállalkozó reggeli összefoglalóját írod, tegeződve, 2–3 rövid mondatban, sima szövegként (nincs cím, nincs felsorolás, nincs emoji).
Szigorú szabályok:
- KIZÁRÓLAG a megadott adatokat használd. Ne találj ki számot, nevet, tanácsot vagy okot, ami nincs az adatokban.
- Ha valami nulla vagy üres, azt vagy hagyd ki, vagy mondd ki röviden ("nincs nyitott számlád").
- A legfontosabbal kezdj: lejárt kintlévőség, régóta válasz nélküli ajánlat, mai időpont, sürgős teendő — ebben a sorrendben, ha van ilyen.
- Az összegeket forintban, ezres tagolással írd (pl. 1 885 950 Ft).`;

export async function napiOsszefoglaloSzovege(tenyek: NapiTenyek): Promise<AiHivasEredmeny<string>> {
  return szovegValasz({
    modell: MODELL_EROS,
    utasitas: UTASITAS,
    bemenet: JSON.stringify(tenyek),
    maxKiToken: 1200,
  });
}
