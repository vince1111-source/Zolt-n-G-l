/**
 * Az ajánlat-mondat "extrái" ("…, bontással, konténerrel"), DB nélkül.
 *   cd webapp && node --experimental-strip-types --no-warnings src/lib/ajanlat-extrak.teszt.mts
 */
import { extraTetelekKeresese } from "./ajanlat-extrak.ts";

let hibak = 0;
function eset(leiras: string, kapott: unknown, vart: unknown) {
  const ok = JSON.stringify(kapott) === JSON.stringify(vart);
  if (!ok) hibak++;
  console.log((ok ? "OK  " : "HIBA") + ` ${leiras} → ${JSON.stringify(kapott)}${ok ? "" : `  (várt: ${JSON.stringify(vart)})`}`);
}

const TERMEKEK = [
  { id: "bontas", nev: "Régi burkolat bontása", mertekegyseg: "m2" },
  { id: "kontener", nev: "Konténer, sittszállítás (3–4 m³)", mertekegyseg: "db" },
  { id: "kiszallas", nev: "Kiszállás és gépszállítás", mertekegyseg: "alkalom" },
  { id: "szegelyko", nev: "Szegélykő 100×20×5", mertekegyseg: "fm" },
  { id: "szegelyrakas", nev: "Szegélykő rakás", mertekegyseg: "fm" },
  { id: "agyazat", nev: "Ágyazóréteg készítése", mertekegyseg: "m2" },
];
const keres = (mondat: string, kizart: string[] = [], kizartSzavak: string[] = []) => {
  const r = extraTetelekKeresese({ mondat, termekek: TERMEKEK, kizartTermekek: new Set(kizart), kizartSzavak, m2: 45, kerulet: 30 });
  return { tetelek: r.tetelek.map((t) => `${t.termekId}:${t.mennyiseg}`), ketertelmu: r.ketertelmu };
};

eset(
  "bontással → m²-es tétel a területtel",
  keres("keszits ajanlatot balogh feri 45 negyzet kocsibeallora, bontassal", [], ["balogh", "ferenc", "kocsibeallo"]),
  { tetelek: ["bontas:45"], ketertelmu: [] },
);
eset(
  "szám a szó előtt: 2 konténerrel; kiszállással → 1 alkalom",
  keres("45 negyzet bontassal, 2 kontenerrel es kiszallassal"),
  { tetelek: ["bontas:45", "kontener:2", "kiszallas:1"], ketertelmu: [] },
);
eset("ugyanaz a tétel két szóval (konténer, sittszállítás) → egyszer", keres("kontenerrel sittszallitassal"), {
  tetelek: ["kontener:1"],
  ketertelmu: [],
});
eset("kétértelmű: szegélykővel → két tétel is illik, nem választ", keres("szegelykovel"), {
  tetelek: [],
  ketertelmu: ["szegelykovel"],
});
eset("a csomagban már benne lévő tétel nem extra", keres("bontassal", ["bontas"]), { tetelek: [], ketertelmu: [] });
eset("parancsszó nem tétel: készíts ≠ Ágyazóréteg készítése", keres("keszits ajanlatot"), { tetelek: [], ketertelmu: [] });
eset("a partner neve nem tétel", keres("kontenerrel kovacseknak", [], ["kovacs"]), { tetelek: ["kontener:1"], ketertelmu: [] });

console.log(hibak ? `\n${hibak} HIBA` : "\nMinden eset rendben");
process.exit(hibak ? 1 : 0);
