/**
 * A naptár hét-nézetének dátum-aritmetikája. Futtatás a webapp mappából:
 *
 *   node --experimental-strip-types --no-warnings src/lib/het.teszt.mts
 *
 * A hetTartomany azért kapott tesztet, mert a naptár oldal korábban a
 * vasárnapból visszaszámolt hétfőt vette "következő hétnek" — a lekérdezés
 * üres tartományt kapott, és a naptár egyetlen eseményt sem mutatott.
 */
import { hetElsoDatum, hetTartomany, napszoDatumma } from "./het.ts";

let hibak = 0;
function eset(leiras: string, kapott: string | null, vart: string) {
  const ok = kapott === vart;
  if (!ok) hibak++;
  console.log((ok ? "OK  " : "HIBA") + ` ${leiras} → ${JSON.stringify(kapott)}`);
}

eset("csütörtökből a hét hétfője", hetElsoDatum("2026-09-10"), "2026-09-07");
eset("vasárnapból UGYANANNAK a hétnek a hétfője", hetElsoDatum("2026-09-13"), "2026-09-07");
eset("hétfőből önmaga", hetElsoDatum("2026-09-07"), "2026-09-07");

const t = hetTartomany("2026-09-10");
eset("következő hét hétfője (a hiba: eddig 2026-09-07 volt)", t.kovetkezoHet, "2026-09-14");
eset("előző hét hétfője", t.elozoHet, "2026-08-31");
eset("a hét napjai", t.napok.join(","), "2026-09-07,2026-09-08,2026-09-09,2026-09-10,2026-09-11,2026-09-12,2026-09-13");
eset("tól: hétfő budapesti éjfél, nyári idő (UTC+2)", t.tol, "2026-09-06T22:00:00.000Z");
eset("ig: következő hétfő budapesti éjfél", t.ig, "2026-09-13T22:00:00.000Z");

const tel = hetTartomany("2026-12-10");
eset("télen a tól UTC+1", tel.tol, "2026-12-06T23:00:00.000Z");
const valtas = hetTartomany("2026-10-25");
eset("óraátállítás hete: tól még nyári idő", valtas.tol, "2026-10-18T22:00:00.000Z");
eset("óraátállítás hete: ig már téli idő", valtas.ig, "2026-10-25T23:00:00.000Z");
eset("évváltás: dec. 31-ből", hetTartomany("2026-12-31").kovetkezoHet, "2027-01-04");

eset("holnap csütörtökből", napszoDatumma("holnap", "2026-09-10"), "2026-09-11");
eset("\"hétfőn\" csütörtökből a következő hétfő", napszoDatumma("hetfo", "2026-09-10"), "2026-09-14");

console.log(hibak ? `\n${hibak} HIBA` : "\nMinden eset rendben");
process.exit(hibak ? 1 : 0);
