// A listák keresőjének (lib/kereses.ts `illeszkedik`) és a flash-süti
// értelmezésének (lib/flash.ts `flashOlvasas`) esetei. A két függvény itt
// MÁSOLATBAN szerepel (a kereses.ts kiterjesztés nélküli TS-importja miatt
// Node közvetlenül nem tölti be) — ha a forrásban változtatsz, ezt is
// igazítsd. Futtatás: node webapp/src/lib/kereses.teszt.mjs

function norm(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/²/g, "2")
    .replace(/-/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
function illeszkedik(q, ...mezok) {
  const cel = norm(q);
  if (!cel) return true;
  return mezok.some((m) => m != null && norm(String(m)).includes(cel));
}

const esetek = [
  ["kovacs", ["Kovács Építő Kft.", null], true, "ékezet nélkül talál ékezetest"],
  ["ÉPÍTŐ", ["Kovács Építő Kft."], true, "nagybetű + ékezet"],
  ["kft.", ["Kovács Építő Kft."], true, "pont megmarad"],
  ["", ["bármi"], true, "üres keresés mindent enged"],
  ["   ", ["bármi"], true, "csak szóköz = üres"],
  ["szabo", ["Kovács Építő Kft.", "Nagy István"], false, "nincs találat"],
  ["elfogadva", [undefined, "AJ-2026-003", "elfogadva"], true, "állapot-címke"],
  ["2026-003", ["AJ-2026-003"], true, "sorszám kötőjellel (a norm mindkét oldalon eltávolítja)"],
  ["nagy istvan", ["Nagy István"], true, "két szó, szóköz-normalizálás"],
];
let hibak = 0;
for (const [q, mezok, vart, leiras] of esetek) {
  const k = illeszkedik(q, ...mezok);
  const ok = k === vart;
  if (!ok) hibak++;
  console.log((ok ? "OK  " : "HIBA") + ` ${leiras}: illeszkedik(${JSON.stringify(q)}) = ${k}`);
}

function flashParse(nyers) {
  if (!nyers) return null;
  try {
    const e = JSON.parse(nyers);
    if (typeof e.szoveg !== "string" || typeof e.nonce !== "number") return null;
    const t = e.tipus === "hiba" || e.tipus === "info" ? e.tipus : "siker";
    return { tipus: t, szoveg: e.szoveg, nonce: e.nonce };
  } catch {
    return null;
  }
}
const fp = [
  [JSON.stringify({ tipus: "siker", szoveg: "Mentve.", nonce: 1 }), "siker", "érvényes"],
  [JSON.stringify({ tipus: "barmi", szoveg: "x", nonce: 2 }), "siker", "ismeretlen típus → siker"],
  ["nem json", null, "rossz JSON → null"],
  [JSON.stringify({ szoveg: "x" }), null, "hiányzó nonce → null"],
  ["", null, "üres → null"],
];
for (const [ny, vart, leiras] of fp) {
  const r = flashParse(ny);
  const ok = (r === null && vart === null) || (r && r.tipus === vart);
  if (!ok) hibak++;
  console.log((ok ? "OK  " : "HIBA") + ` flash: ${leiras}`);
}
console.log(hibak ? `\n${hibak} HIBA` : "\nMinden eset rendben");
process.exit(hibak ? 1 : 0);
