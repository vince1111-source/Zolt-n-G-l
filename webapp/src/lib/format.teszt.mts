/**
 * Mennyiség- és mértékegység-kiírás (ügyfélnek szóló PDF, jóváhagyó lap,
 * anyaglista). Futtatás a webapp mappából:
 *
 *   node --experimental-strip-types --no-warnings src/lib/format.teszt.mts
 */
import { Ft, mennyisegSzoveg, mertekegysegSzoveg, mennyisegEgyseggel } from "./format.ts";

let hibak = 0;
function eset(leiras: string, kapott: string, vart: string) {
  // A hu-HU ezres tagoló nem törő szóköz (U+00A0) — összehasonlításhoz sima szóköz.
  const k = kapott.replace(/ /g, " ");
  const ok = k === vart;
  if (!ok) hibak++;
  console.log((ok ? "OK  " : "HIBA") + ` ${leiras} → ${JSON.stringify(k)}`);
}

eset("9.375 → két tizedes, vessző", mennyisegSzoveg(9.375), "9,38");
eset("52.5", mennyisegSzoveg(52.5), "52,5");
eset("50 (egész)", mennyisegSzoveg(50), "50");
eset("adatbázis-szöveg \"0.600\"", mennyisegSzoveg("0.600"), "0,6");
eset("12345.6 ezres tagolással", mennyisegSzoveg(12345.6), "12 345,6");
eset("m2 → m²", mertekegysegSzoveg("m2"), "m²");
eset("M3 → m³", mertekegysegSzoveg("M3"), "m³");
eset("nm → m²", mertekegysegSzoveg("nm"), "m²");
eset("fm marad", mertekegysegSzoveg("fm"), "fm");
eset("zsák marad", mertekegysegSzoveg("zsák"), "zsák");
eset("üres", mertekegysegSzoveg(null), "");
eset("0.6 m3 együtt", mennyisegEgyseggel(0.6, "m3"), "0,6 m³");
eset("Ft ezres tagolás", Ft(1441895), "1 441 895 Ft");

console.log(hibak ? `\n${hibak} HIBA` : "\nMinden eset rendben");
process.exit(hibak ? 1 : 0);
