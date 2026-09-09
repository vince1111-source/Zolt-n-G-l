/**
 * Amit a rendszer visszamond hangból jött parancs után — DB és hálózat nélkül.
 *   node --experimental-strip-types --no-warnings src/lib/felolvasas.teszt.mts
 */
import { felolvasasSzoveg } from "./felolvasas.ts";
import type { AiEredmeny } from "@/app/(vedett)/actions";

let hibak = 0;
function eset(leiras: string, e: AiEredmeny, vartResz: string) {
  const k = felolvasasSzoveg(e);
  const ok = k.includes(vartResz);
  if (!ok) hibak++;
  console.log((ok ? "OK  " : "HIBA") + ` ${leiras} → „${k}”`);
}

eset("ismeretlen", { allapot: "ismeretlen", reteg: 0 }, "nem értettem");
eset("kérdés a modelltől", { allapot: "kerdes", uzenet: "Hány négyzetméterre?", reteg: 1, modell: "gpt-5-nano" }, "Hány négyzetméterre?");
eset("naptár", { allapot: "naptar_letrehozva", esemenyId: "x", cim: "Felmérés — Kovács Építő Kft.", kezdetSzoveg: "csütörtök, szeptember 10. 09:30", reteg: 0 }, "Naptárba felvéve: Felmérés");
eset("teendő határidővel", { allapot: "feladat_letrehozva", feladatId: "x", cim: "Hívjam fel Kovácsot", hataridoSzoveg: "péntek, szeptember 5.", partnerNev: null, reteg: 0 }, "Felírtam: Hívjam fel Kovácsot, péntek");
eset("teendők", { allapot: "teendok", teendok: [], esemenyek: [], felolvasas: "Ma nincs nyitott teendőd. Mai időpontod nincs.", reteg: 0 }, "Ma nincs nyitott teendőd");
eset(
  "partner-helyzet",
  { allapot: "partner_helyzet", partnerId: "x", partnerNev: "Kovács Építő Kft.", fuggoAjanlat: 2, utolsoAjanlat: null, nyitottMunka: 1, nyitottSzamlaDarab: 1, nyitottSzamlaOsszeg: 1885950, lejartSzamlaOsszeg: 0, reteg: 0 },
  "2 függő ajánlat, 1 nyitott munka, kintlévőség 1 885 950 forint",
);
eset(
  "ajánlat-javaslat → jóváhagyásra utal",
  { allapot: "javaslat", partnerId: "x", partnerNev: "Kovács Építő Kft.", tetelBemenetek: [], elonezet: { partner: { nev: "K", kedvezmeny_szazalek: 0 }, tetelek: [], afaKulcs: 27, listaar: 0, kedvezmeny: 0, netto: 0, afa: 0, brutto: 12485922 }, feltetelezesek: [], reteg: 1, modell: "gpt-5-nano" },
  "hagyd jóvá a képernyőn",
);

console.log(hibak ? `\n${hibak} HIBA` : "\nMinden eset rendben");
process.exit(hibak ? 1 : 0);
