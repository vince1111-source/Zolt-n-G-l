/**
 * A 0. réteg szándékfelismerője és a név-illesztők — DB nélkül, tiszta
 * függvényeken. Futtatás a webapp mappából:
 *
 *   node --experimental-strip-types --no-warnings src/lib/szandek.teszt.mts
 *
 * (Node 22+; a szandek.ts-nek nincs futásidejű importja, ezért közvetlenül
 * betölthető.) Ha új parancsot veszel fel a 0. rétegbe, ide is tegyél
 * legalább egy pozitív és egy "továbbad" (ismeretlen) esetet.
 */
import { ertelmezSzoveg, partnerKereses, csomagKereses, becenevFeloldas, szamSzoErteke } from "./szandek.ts";

let hibak = 0;
function eset(leiras: string, kapott: unknown, vart: Record<string, unknown>) {
  const k = kapott as Record<string, unknown>;
  const ok = Object.entries(vart).every(([kulcs, v]) => JSON.stringify(k?.[kulcs]) === JSON.stringify(v));
  if (!ok) hibak++;
  console.log((ok ? "OK  " : "HIBA") + ` ${leiras} → ${JSON.stringify(kapott)}`);
}

console.log("— szándékok —");
const szandekok: [string, Record<string, unknown>][] = [
  ["Hogy állunk Kovácssal?", { szandek: "partner_helyzet", partnerSzoveg: "kovacssal" }],
  ["Mi a helyzet a Kovács Építővel", { szandek: "partner_helyzet", partnerSzoveg: "kovacs epitovel" }],
  ["Mutasd Nagy Istvánt", { szandek: "partner_helyzet", partnerSzoveg: "nagy istvant" }],
  ["Írd fel, hogy hívjam fel Kovácsot holnap", { szandek: "feladat_felvetel", cim: "Hívjam fel Kovácsot", napszo: "holnap" }],
  ["Emlékeztess pénteken a szegélykő rendelésre", { szandek: "feladat_felvetel", cim: "A szegélykő rendelésre", napszo: "pentek" }],
  ["Jegyezd fel: anyagot rendelni", { szandek: "feladat_felvetel", cim: "Anyagot rendelni" }],
  ["Teendő: számlát küldeni Nagyéknak", { szandek: "feladat_felvetel", cim: "Számlát küldeni Nagyéknak" }],
  // Általános igék CSAK nap-szóval teendők — különben a 0. réteg továbbad.
  ["Állíts be 20% kedvezményt Kovácsnak", { szandek: "ismeretlen" }],
  ["Vegyél fel egy új partnert: Tóth Kft.", { szandek: "ismeretlen" }],
  ["Rögzíts egy 50 000 Ft-os számlát a Baumaxtól", { szandek: "ismeretlen" }],
  ["Állíts be holnap, hogy hívjam Kovácsot", { szandek: "feladat_felvetel", cim: "Hívjam Kovácsot", napszo: "holnap" }],
  ["Készíts ajánlatot Kovácsnak 50 m²-re térkövezés", { szandek: "ajanlat_keszites", m2: 50, leiras: "terkovezes" }],
  ["Holnap 10-kor megyek Kovácshoz", { szandek: "naptar_esemeny", napszo: "holnap" }],
  // Nap+idő a "név" részben: naptár-mondat, amit ebben az alakban nem ismerünk — továbbad.
  ["Nézzük meg holnap 9-kor Kovácsot", { szandek: "ismeretlen" }],
  ["mennyibe kerül a térkő", { szandek: "ismeretlen" }],
  // "Mik a teendőim?" — a mai teendők és időpontok (felolvasható válasz)
  ["Mik a mai teendőim?", { szandek: "teendok" }],
  ["mi a dolgom ma", { szandek: "teendok" }],
  ["Mi van ma a naptárban?", { szandek: "teendok" }],
  ["Teendő: számlát küldeni Nagyéknak", { szandek: "feladat_felvetel" }],
  // A demó mintamondatai
  ["Készíts ajánlatot Kovács Építő Kft.-nek 50 m² térkövezésre", { szandek: "ajanlat_keszites", partnerSzoveg: "kovacs epito kft.", m2: 50, leiras: "terkovezesre" }],
  ["Készíts ajánlatot Tóth Gábornak 30 m² kocsibeállóra", { szandek: "ajanlat_keszites", partnerSzoveg: "toth gabor", m2: 30, leiras: "kocsibeallora" }],
  ["Holnap 10-kor megyek Tóth Gáborhoz", { szandek: "naptar_esemeny", partnerSzoveg: "toth gabor", oraSzoveg: "10:00" }],
  ["Hogy állunk a Kovács Építővel?", { szandek: "partner_helyzet", partnerSzoveg: "kovacs epitovel" }],
  ["Írd fel, hogy hívjam fel Tóth Gábort holnap", { szandek: "feladat_felvetel", cim: "Hívjam fel Tóth Gábort", napszo: "holnap" }],
  // Beszélt alakok (hang): számszavak, "négyzet", rugalmas szórend, kerület
  ["Mennyibe kerülne nyolcvan négyzet térkövezés Kovácséknak, 36 méter szegéllyel?", { szandek: "ajanlat_keszites", partnerSzoveg: "kovacs", m2: 80, leiras: "terkovezes", kerulet: 36 }],
  ["Készíts ajánlatot Balogh Ferinek 45 négyzet kocsibeállóra, bontással", { szandek: "ajanlat_keszites", partnerSzoveg: "balogh feri", m2: 45, leiras: "kocsibeallora, bontassal" }],
  ["Ajánlat Nagy Pistának százhúsz négyzetméter udvar", { szandek: "ajanlat_keszites", partnerSzoveg: "nagy pista", m2: 120, leiras: "udvar" }],
  ["Csinálj egy árajánlatot Szabóéknak kétszázötven négyzetméterre", { szandek: "ajanlat_keszites", partnerSzoveg: "szaboek", m2: 250 }],
  ["Adj árat Tóth Gábornak 30 négyzetes kocsibeállóra, szegély 22 méter", { szandek: "ajanlat_keszites", partnerSzoveg: "toth gabor", m2: 30, leiras: "kocsibeallora", kerulet: 22 }],
  ["Mennyibe kerülne 50 négyzet Kovácséknak?", { szandek: "ajanlat_keszites", partnerSzoveg: "kovacs", m2: 50 }],
  ["Holnap kilenckor megyek Tóth Gáborhoz", { szandek: "naptar_esemeny", oraSzoveg: "09:00", partnerSzoveg: "toth gabor" }],
  ["Kíszíts ajánlatot Tóth Gábornak 30 négyzet kocsibeállóra", { szandek: "ajanlat_keszites", partnerSzoveg: "toth gabor", m2: 30, leiras: "kocsibeallora" }],
  ["Adj árat Nagy Istvánnak ötven négyzetre, térkövezés", { szandek: "ajanlat_keszites", partnerSzoveg: "nagy istvan", m2: 50, leiras: "terkovezes" }],
  ["Készíts egy ajánlatot", { szandek: "ismeretlen" }],
];
for (const [be, vart] of szandekok) eset(JSON.stringify(be), ertelmezSzoveg(be), vart);

console.log("— partnerKereses —");
const P = [{ nev: "Nagy Kft." }, { nev: "Szabó Bt." }, { nev: "Kovács Építő Kft." }, { nev: "Kis Bt." }];
const pk = (sz: string) => {
  const r = partnerKereses(P, sz) as Record<string, unknown>;
  return "partner" in r
    ? { nev: (r.partner as { nev: string }).nev, biztos: r.biztos }
    : "tobb" in r
      ? { tobb: (r.tobb as { nev: string }[]).map((p) => p.nev) }
      : { nincs: true };
};
eset("kovacssal (tipp)", pk("kovacssal"), { nev: "Kovács Építő Kft.", biztos: false });
eset("kovacs epito kft. (biztos)", pk("kovacs epito kft."), { nev: "Kovács Építő Kft.", biztos: true });
eset("hivjam fel a kovacs epito kft. ugyvezetojet (biztos, egész szavak)", pk("hivjam fel a kovacs epito kft. ugyvezetojet"), { nev: "Kovács Építő Kft.", biztos: true });
eset("nagyon fontos a beton (tipp, nem biztos)", pk("nagyon fontos a beton"), { nev: "Nagy Kft.", biztos: false });
eset("kisebb szerszamot vegyek (Kis <4 → nincs)", pk("kisebb szerszamot vegyek"), { nincs: true });
eset("szabolcsot (tipp)", pk("szabolcsot"), { nev: "Szabó Bt.", biztos: false });
eset(
  "két Kovács → tobb",
  (() => {
    const r = partnerKereses([...P, { nev: "Kovács János" }], "kovacsnak") as Record<string, unknown>;
    return "tobb" in r ? { tobb: (r.tobb as { nev: string }[]).length } : r;
  })(),
  { tobb: 2 },
);
eset("üres → nincs", pk("   "), { nincs: true });
const P2 = [{ nev: "Kovács Építő Kft." }, { nev: "Kovács Tüzép" }, { nev: "Tóth Gábor" }];
const pk2 = (sz: string) => {
  const r = partnerKereses(P2, sz) as Record<string, unknown>;
  return "partner" in r ? { nev: (r.partner as { nev: string }).nev, biztos: r.biztos } : "tobb" in r ? { tobb: (r.tobb as { nev: string }[]).length } : { nincs: true };
};
eset("két Kovács: „Kovács Építővel” → a második szó dönt", pk2("kovacs epitovel"), { nev: "Kovács Építő Kft.", biztos: false });
eset("két Kovács: „Kovács Tüzéptől” → a Tüzép", pk2("kovacs tuzeptol"), { nev: "Kovács Tüzép", biztos: false });
eset("két Kovács: „Kovácssal” → döntetlen, kérdez", pk2("kovacssal"), { tobb: 2 });
eset("Tóth Gáborhoz", pk2("toth gabor"), { nev: "Tóth Gábor", biztos: true });
const P3 = [{ nev: "Balogh Ferenc" }, { nev: "Nagy István" }, { nev: "Nagy Kft." }, { nev: "Kovács Építő Kft." }];
const pk3 = (sz: string) => {
  const r = partnerKereses(P3, sz) as Record<string, unknown>;
  return "partner" in r ? { nev: (r.partner as { nev: string }).nev, biztos: r.biztos } : "tobb" in r ? { tobb: (r.tobb as { nev: string }[]).length } : { nincs: true };
};
eset("becenév: „balogh feri” → Balogh Ferenc (tipp)", pk3("balogh feri"), { nev: "Balogh Ferenc", biztos: false });
eset("a becenév dönt: „nagy pista” → Nagy István, nem a Nagy Kft.", pk3("nagy pista"), { nev: "Nagy István", biztos: false });
eset("csak becenév: „ferinek” → Balogh Ferenc", pk3("ferinek"), { nev: "Balogh Ferenc", biztos: false });
eset("becenevFeloldas: pistaval → istvan", { v: becenevFeloldas("pistaval") }, { v: "istvan" });
eset("becenevFeloldas: nem becenév (imitt)", { v: becenevFeloldas("imitt") }, { v: null });

console.log("— csomagKereses —");
const C = [{ nev: "Térkövezés" }, { nev: "Térkövezés bontással" }, { nev: "Térkő" }, { nev: "Mázolás" }];
const ck = (sz: string) => {
  const r = csomagKereses(C, sz) as Record<string, unknown>;
  return "csomag" in r
    ? { nev: (r.csomag as { nev: string }).nev }
    : "tobb" in r
      ? { tobb: (r.tobb as { nev: string }[]).map((c) => c.nev) }
      : { nincs: true };
};
eset("terkovezes bontassal (pontos)", ck("terkovezes bontassal"), { nev: "Térkövezés bontással" });
eset("terkovezesre (toldalék; a hosszabb név-előtag nyer a Térkő felett)", ck("terkovezesre"), { nev: "Térkövezés" });
eset("terko (pontos, nem rész)", ck("terko"), { nev: "Térkő" });
eset("ma (<4 → nincs, nem Mázolás)", ck("ma"), { nincs: true });
eset("es (<4 → nincs)", ck("es"), { nincs: true });
eset("terkovezes szegellyel (nincs ilyen; egymásba ágyazott jelöltek → a hosszabb)", ck("terkovezes szegellyel"), { nev: "Térkövezés" });
eset("terkore (Térkő toldalékkal)", ck("terkore"), { nev: "Térkő" });
const C2 = [{ nev: "Térkő szürke" }, { nev: "Térkő antik" }];
eset(
  "terko két Térkő-változatnál → tobb",
  (() => {
    const r = csomagKereses(C2, "terko") as Record<string, unknown>;
    return "tobb" in r ? { tobb: (r.tobb as { nev: string }[]).map((c) => c.nev) } : r;
  })(),
  { tobb: ["Térkő szürke", "Térkő antik"] },
);
eset("burkolasra (nincs ilyen csomag → nincs, nem találgat)", ck("burkolasra"), { nincs: true });
const C3 = [{ nev: "Térkövezés" }, { nev: "Kocsibeálló" }];
const ck3 = (sz: string) => {
  const r = csomagKereses(C3, sz) as Record<string, unknown>;
  return "csomag" in r ? { nev: (r.csomag as { nev: string }).nev } : r;
};
eset("kocsibeallora → Kocsibeálló", ck3("kocsibeallora"), { nev: "Kocsibeálló" });
eset("terkovezesre → Térkövezés", ck3("terkovezesre"), { nev: "Térkövezés" });
const C4 = [
  { nev: "Térkövezés", kulcsszavak: "járda, terasz, kerti út" },
  { nev: "Kocsibeálló", kulcsszavak: "kocsibejáró, bejáró, garázsbejáró" },
];
const ck4 = (sz: string) => {
  const r = csomagKereses(C4, sz) as Record<string, unknown>;
  return "csomag" in r ? { nev: (r.csomag as { nev: string }).nev } : "tobb" in r ? { tobb: (r.tobb as { nev: string }[]).length } : { nincs: true };
};
eset("kulcsszó: bejarora → Kocsibeálló", ck4("bejarora"), { nev: "Kocsibeálló" });
eset("kulcsszó: teraszra → Térkövezés", ck4("teraszra"), { nev: "Térkövezés" });
eset("kulcsszó + extra: kocsibejarora, bontassal → Kocsibeálló", ck4("kocsibejarora, bontassal"), { nev: "Kocsibeálló" });
eset("udvar → nincs (gyalogos vagy autós? kérdezni kell)", ck4("udvar"), { nincs: true });

console.log("— számszavak (hang) —");
eset(
  "szamSzoErteke",
  { v: ["nyolcvan", "szazhusz", "ketszazotven", "ezerketszaz", "tizenot", "hat", "negyzet", "hetfo"].map(szamSzoErteke) },
  { v: [80, 120, 250, 1200, 15, 6, null, null] },
);

console.log(hibak ? `\n${hibak} HIBA` : "\nMinden eset rendben");
process.exit(hibak ? 1 : 0);
