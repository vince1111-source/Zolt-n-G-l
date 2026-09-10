import { norm } from "./szandek.ts";

export type ExtraTermek = { id: string; nev: string; mertekegyseg: string };
export type ExtraTetel = { termekId: string; nev: string; mertekegyseg: string; mennyiseg: number };

/** Parancs- és töltelékszavak — ezek sosem jelentenek árlistatételt. */
const NEM_EXTRA = new Set([
  "keszits", "keszitsd", "csinalj", "csinald", "ajanlat", "ajanlatot", "arajanlat", "arajanlatot", "mennyibe",
  "kerulne", "mennyiert", "lenne", "szamold", "arazd", "kalkulald", "holnap", "plusz", "valamint", "illetve",
  "egyutt", "nelkul", "negyzet", "negyzetmeter", "negyzetmeterre", "negyzetmeteres", "meter", "meterrel",
  "folyometer", "szegellyel", "szegely", "kerulet", "kerulettel",
]);

/** Ennyi betűs szótővel illesztünk: "bontással" ~ "bontása", "konténerrel" ~ "Konténer". */
const TO_HOSSZ = 6;

/**
 * A mondat "extrái" — "…, bontással, konténerrel" → az árlista azon tételei,
 * amelyek nevének egy szava ugyanazzal a tővel kezdődik, mint a mondat egy
 * szava. Csak a csomagban még NEM szereplő tételek, és csak egyértelmű
 * egyezéssel: ha egy szóra több tétel illik, nem választunk (CLAUDE.md 5.),
 * csak visszaadjuk a szót, hogy a feltételezés kimondja.
 *
 * Mennyiség: ha a szó előtt szám áll ("2 konténerrel"), az; különben
 * m²-es tételnél a terület, fm-esnél a kerület, minden másnál 1.
 *
 * Tiszta függvény, DB nélkül — a hívó (AI-hub) adja az aktív árlistát.
 */
export function extraTetelekKeresese(p: {
  mondat: string;
  termekek: ExtraTermek[];
  kizartTermekek: Set<string>;
  kizartSzavak: string[];
  m2: number;
  kerulet: number;
}): { tetelek: ExtraTetel[]; ketertelmu: string[] } {
  const szavak = p.mondat
    .split(" ")
    .map((sz) => sz.replace(/[.,!?;:]+$/, ""))
    .filter(Boolean);
  const kizartSzavak = p.kizartSzavak.map((sz) => sz.replace(/[.,]+$/, "")).filter((sz) => sz.length >= 4);
  const jeloltek = p.termekek
    .filter((t) => !p.kizartTermekek.has(t.id))
    .map((t) => ({ t, szavak: norm(t.nev).split(/[\s,/()]+/).filter((w) => w.length >= 5) }));

  const tetelek: ExtraTetel[] = [];
  const ketertelmu: string[] = [];
  const felvett = new Set<string>();

  szavak.forEach((szo, i) => {
    if (szo.length < 5 || /\d/.test(szo) || NEM_EXTRA.has(szo)) return;
    if (kizartSzavak.some((k) => szo.startsWith(k) || k.startsWith(szo))) return;
    const to = szo.slice(0, TO_HOSSZ);
    const talalat = jeloltek.filter((x) => x.szavak.some((w) => w.startsWith(to)));
    if (!talalat.length) return;
    if (talalat.length > 1) {
      ketertelmu.push(szo);
      return;
    }
    const t = talalat[0].t;
    if (felvett.has(t.id)) return;
    felvett.add(t.id);
    const elotte = Number((szavak[i - 1] ?? "").replace(",", "."));
    const me = norm(t.mertekegyseg);
    const mennyiseg = elotte > 0 ? elotte : me === "m2" || me === "nm" ? p.m2 : me === "fm" ? p.kerulet : 1;
    tetelek.push({ termekId: t.id, nev: t.nev, mertekegyseg: t.mertekegyseg, mennyiseg });
  });

  return { tetelek, ketertelmu };
}
