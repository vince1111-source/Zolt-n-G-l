/**
 * Az 1. réteg válasz → `Ertelmezes` leképezése, hálózat nélkül.
 * Futtatás a webapp mappából:
 *   node --experimental-strip-types --no-warnings src/lib/ai/reteg1.teszt.mts
 */
import { reteg1Ertelmezesse, type Reteg1Valasz } from "./reteg1.ts";

let hibak = 0;
function eset(leiras: string, kapott: unknown, vart: Record<string, unknown>) {
  const k = kapott as Record<string, unknown>;
  const ok = Object.entries(vart).every(([kulcs, v]) => JSON.stringify(k?.[kulcs]) === JSON.stringify(v));
  if (!ok) hibak++;
  console.log((ok ? "OK  " : "HIBA") + ` ${leiras} → ${JSON.stringify(kapott)}`);
}
const alap: Reteg1Valasz = { szandek: "ismeretlen", partner: "", mennyiseg_m2: null, csomag: "", nap: "", ido: "", szoveg: "", hianyzik: [], visszakerdezes: "" };

eset("ajánlat teljes", reteg1Ertelmezesse({ ...alap, szandek: "ajanlat_keszites", partner: "Kovács Építő Kft.", mennyiseg_m2: 800, csomag: "Térkövezés" }),
  { szandek: "ajanlat_keszites", partnerSzoveg: "Kovács Építő Kft.", m2: 800, leiras: "Térkövezés" });
eset("ajánlat m² nélkül → kérdés (a modellé)", reteg1Ertelmezesse({ ...alap, szandek: "ajanlat_keszites", partner: "Kovácsék", visszakerdezes: "Hány négyzetméterre?" }),
  { szandek: "kerdes", kerdes: "Hány négyzetméterre?" });
eset("ajánlat partner nélkül → alap kérdés", reteg1Ertelmezesse({ ...alap, szandek: "ajanlat_keszites", mennyiseg_m2: 50 }),
  { szandek: "kerdes", kerdes: "Melyik partnernek készüljön az ajánlat?" });
eset("naptár ISO dátummal", reteg1Ertelmezesse({ ...alap, szandek: "naptar_esemeny", partner: "Nagy István", nap: "2026-09-10", ido: "9:30", szoveg: "felmérés" }),
  { szandek: "naptar_esemeny", napszo: null, datumIso: "2026-09-10", oraSzoveg: "09:30", partnerSzoveg: "Nagy István", leiras: "felmérés" });
eset("naptár nap-szóval", reteg1Ertelmezesse({ ...alap, szandek: "naptar_esemeny", partner: "Nagy István", nap: "pentek", ido: "14:00" }),
  { szandek: "naptar_esemeny", napszo: "pentek", oraSzoveg: "14:00" });
eset("naptár idő nélkül → kérdés", reteg1Ertelmezesse({ ...alap, szandek: "naptar_esemeny", partner: "Nagy István", nap: "holnap" }),
  { szandek: "kerdes", kerdes: "Hány órakor?" });
eset("naptár rossz idő → kérdés", reteg1Ertelmezesse({ ...alap, szandek: "naptar_esemeny", partner: "Nagy István", nap: "holnap", ido: "25:99" }),
  { szandek: "kerdes", kerdes: "Hány órakor?" });
eset("naptár ismeretlen nap-szó → kérdés", reteg1Ertelmezesse({ ...alap, szandek: "naptar_esemeny", partner: "Nagy István", nap: "jövő héten valamikor", ido: "10:00" }),
  { szandek: "kerdes", kerdes: "Melyik napon?" });
eset("teendő nap nélkül", reteg1Ertelmezesse({ ...alap, szandek: "feladat_felvetel", szoveg: "hívjam fel a Baumaxot" }),
  { szandek: "feladat_felvetel", cim: "Hívjam fel a Baumaxot" });
eset("teendő holnapra", reteg1Ertelmezesse({ ...alap, szandek: "feladat_felvetel", szoveg: "anyagot rendelni", nap: "holnap" }),
  { szandek: "feladat_felvetel", cim: "Anyagot rendelni", napszo: "holnap" });
eset("teendő szöveg nélkül → kérdés", reteg1Ertelmezesse({ ...alap, szandek: "feladat_felvetel" }),
  { szandek: "kerdes", kerdes: "Mit írjak fel?" });
eset("partner-helyzet", reteg1Ertelmezesse({ ...alap, szandek: "partner_helyzet", partner: "Kovács Építő Kft." }),
  { szandek: "partner_helyzet", partnerSzoveg: "Kovács Építő Kft." });
eset("teendok", reteg1Ertelmezesse({ ...alap, szandek: "teendok" }), { szandek: "teendok" });
eset("ismeretlen marad ismeretlen", reteg1Ertelmezesse(alap), { szandek: "ismeretlen" });

console.log(hibak ? `\n${hibak} HIBA` : "\nMinden eset rendben");
process.exit(hibak ? 1 : 0);
