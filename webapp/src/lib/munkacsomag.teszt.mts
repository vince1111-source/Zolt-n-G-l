/**
 * A munkacsomag → ajánlat-tétel számítás, DB nélkül.
 *   cd webapp && node --experimental-strip-types --no-warnings src/lib/munkacsomag.teszt.mts
 */
import { csomagTetelBemenetek, vanKeruletesTetel } from "./munkacsomag.ts";

let hibak = 0;
function eset(leiras: string, kapott: unknown, vart: unknown) {
  const ok = JSON.stringify(kapott) === JSON.stringify(vart);
  if (!ok) hibak++;
  console.log((ok ? "OK  " : "HIBA") + ` ${leiras} → ${JSON.stringify(kapott)}${ok ? "" : `  (várt: ${JSON.stringify(vart)})`}`);
}
const q = (tetelek: Parameters<typeof csomagTetelBemenetek>[0], m2: number) =>
  csomagTetelBemenetek(tetelek, m2).map((t) => t.mennyiseg);

eset("terület: 50 m² térkő 1,05 m²/m²", q([{ termek_id: "a", mennyiseg_egysegre: 1.05 }], 50), [52.5]);
eset("terület: kavics 0,1875 m³/m² → két tizedes", q([{ termek_id: "a", mennyiseg_egysegre: 0.1875 }], 50), [9.38]);
eset("kerület: 50 m² → 30 fm szegély", q([{ termek_id: "a", mennyiseg_egysegre: 1, alap: "kerulet" }], 50), [30]);
eset("kerület: 800 m² → 115 fm (nem egyenes arány)", q([{ termek_id: "a", mennyiseg_egysegre: 1, alap: "kerulet" }], 800), [115]);
eset("darabos: 60 m² × 0,08 zsák = 4,8 → 5 zsák", q([{ termek_id: "a", mennyiseg_egysegre: 0.08, mertekegyseg: "zsák" }], 60), [5]);
eset("darabos pontos: 50 m² × 0,08 zsák = 4 zsák, nem 5", q([{ termek_id: "a", mennyiseg_egysegre: 0.08, mertekegyseg: "zsak" }], 50), [4]);
eset("darabos kerülettel: 30 fm × 1 db/fm = 30 db", q([{ termek_id: "a", mennyiseg_egysegre: 1, alap: "kerulet", mertekegyseg: "db" }], 50), [30]);
eset("ismeretlen alap = terület", q([{ termek_id: "a", mennyiseg_egysegre: 2, alap: "valami" }], 10), [20]);
eset("nulla terület → nincs tétel", q([{ termek_id: "a", mennyiseg_egysegre: 1 }], 0), []);
eset("megadott kerület: 50 m², 36 fm → 36 fm szegély", csomagTetelBemenetek([{ termek_id: "a", mennyiseg_egysegre: 1, alap: "kerulet" }], 50, 36).map((t) => t.mennyiseg), [36]);
eset("megadott kerület csak a kerület-tételt érinti", csomagTetelBemenetek([{ termek_id: "a", mennyiseg_egysegre: 1.05 }, { termek_id: "b", mennyiseg_egysegre: 0.02, alap: "kerulet" }], 50, 40).map((t) => t.mennyiseg), [52.5, 0.8]);
eset("vanKeruletesTetel", vanKeruletesTetel([{ termek_id: "a", mennyiseg_egysegre: 1 }, { termek_id: "b", mennyiseg_egysegre: 1, alap: "kerulet" }]), true);

console.log(hibak ? `\n${hibak} HIBA` : "\nMinden eset rendben");
process.exit(hibak ? 1 : 0);
