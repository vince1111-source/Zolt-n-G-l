/**
 * Szándékfelismerés — 0. réteg, determinisztikus regex, nem modell.
 *
 * Ugyanaz az elv, mint a `prototype/CEGEM-AI-telefon.html` `SZANDEKOK`
 * tömbjében: a bemenetet normalizáljuk (kisbetű, ékezet nélkül), és egy
 * mintát próbálunk ráilleszteni. Ha nem illeszkedik semmi, ezt őszintén
 * jelezzük — nem teszünk úgy, mintha a rendszer többet tudna, mint
 * amennyit ténylegesen felismer helyben. A CLAUDE.md lépcsős AI-elve
 * szerint új parancsot előbb ide veszünk fel, modellre csak akkor hagyjuk,
 * ha a megfogalmazás tényleg változatos.
 *
 * Ez a modul szándékosan nem ér hozzá az adatbázishoz — tiszta
 * szövegfeldolgozás, ezért egyszerűen tesztelhető. A partner/árlista
 * feloldása a hívó (szerver oldali) felelőssége.
 */

export function norm(szoveg: string): string {
  return szoveg
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // ékezetek (az NFD ezeket önálló jelként bontja szét)
    .replace(/²/g, "2") // az NFD ezt NEM bontja "2"-vé, külön kell kezelni
    .replace(/-/g, "") // "Kft.-nek", "m²-re": a kötőjel csak toldalékot választ el
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export type AjanlatSzandek = {
  szandek: "ajanlat_keszites";
  partnerSzoveg: string;
  m2: number;
  leiras?: string;
};

/**
 * A vízió-dokumentum "Wow #2"-je: "Holnap 10-kor megyek Kovácshoz" →
 * naptárbejegyzés. `napszo` és `oraSzoveg` szándékosan szöveg marad itt
 * (nem alakul dátummá) — ez a modul tiszta szövegfeldolgozás, a tényleges
 * "mai nap Budapesten" a hívó (szerver oldali) felelőssége, hogy a modul
 * ne váljon időzóna-függő, nehezen tesztelhető kóddá.
 */
export type NapSzo = "ma" | "holnap" | "holnaputan" | "hetfo" | "kedd" | "szerda" | "csutortok" | "pentek" | "szombat" | "vasarnap";

export type NaptarSzandek = {
  szandek: "naptar_esemeny";
  /** ISO dátum (ÉÉÉÉ-HH-NN), ha az 1. réteg konkrét napot adott; ilyenkor a napszo null. */
  datumIso?: string;
  napszo: NapSzo | null;
  oraSzoveg: string; // "HH:MM"
  partnerSzoveg: string;
  leiras?: string;
};

/** "Hogy állunk Kovácssal?" — a prototípus `partner` parancsa: egy partner helyzete egy lapon. */
export type PartnerHelyzetSzandek = {
  szandek: "partner_helyzet";
  partnerSzoveg: string;
};

/**
 * "Írd fel, hogy hívjam fel Kovácsot holnap" — a prototípus `feladat`
 * parancsa. A `cim` az EREDETI (nem normalizált) szöveg, hogy a teendő
 * címében megmaradjanak az ékezetek. A nap-szó és a partner opcionális.
 */
export type FeladatSzandek = {
  szandek: "feladat_felvetel";
  cim: string;
  napszo?: NapSzo;
  /** ISO dátum az 1. rétegtől, ha konkrét napot mondott. */
  datumIso?: string;
};

/** "Mik a teendőim?", "mi van ma?" — a prototípus `teendo` parancsa: a mai teendők és időpontok, felolvasható válasszal. */
export type TeendokSzandek = { szandek: "teendok" };

export type Ertelmezes =
  | AjanlatSzandek
  | NaptarSzandek
  | PartnerHelyzetSzandek
  | FeladatSzandek
  | TeendokSzandek
  | { szandek: "ismeretlen" };

const AJANLAT_MINTA =
  /(?:keszits?|csinalj|adj)\s+(?:egy\s+)?(?:ajanlatot|arajanlatot|arat)\s+(.+?)\s*(?:nek|nak)\s+(\d+(?:[.,]\d+)?)\s*(?:negyzetmeter|nm2|m2|nm)(?:re|ra)?\b\s*(.*)/;

export const NAP_ALAK_TERKEP: Record<string, NapSzo> = {
  ma: "ma",
  holnap: "holnap",
  holnaputan: "holnaputan",
  hetfo: "hetfo",
  hetfon: "hetfo",
  kedd: "kedd",
  kedden: "kedd",
  szerda: "szerda",
  szerdan: "szerda",
  csutortok: "csutortok",
  csutortokon: "csutortok",
  pentek: "pentek",
  penteken: "pentek",
  szombat: "szombat",
  szombaton: "szombat",
  vasarnap: "vasarnap",
};
const NAPTAR_KEZDET = new RegExp(`^(${Object.keys(NAP_ALAK_TERKEP).join("|")})\\b`);

const IDO_MINTA = /(\d{1,2})(?:[:.](\d{2}))?\s*(?:orakor|kor)\b/;
const RESZNAP_MINTA = /\b(reggel|delelott|delutan|delben|del|este)\b/;
const RESZNAP_ORA: Record<string, string> = {
  reggel: "08:00",
  delelott: "10:00",
  del: "12:00",
  delben: "12:00",
  delutan: "14:00",
  este: "18:00",
};
const TOLTELEKSZO_MINTA = /\b(megyek|talalkoz\w*|felmer\w*)\b/g;
const PARTNER_MINTA = /\b([a-z][a-z.\s]*?)\s*(?:hoz|hez|nal|nel)\b/;

/**
 * "Holnap 10-kor megyek Kovácshoz" → nap + idő + partner-szöveg. Csak egy
 * szűk, konkrét mondatformát ismer fel (a nap-szó legyen a mondat eleje) —
 * ha bizonytalan, inkább `null`-t ad, mint hogy kitaláljon egy időpontot.
 * Ezért NEM ad alapértelmezett órát: idő nélkül nincs elég adat egy valós
 * naptárbejegyzéshez.
 */
function ertelmezNaptarSzoveg(szoveg: string): NaptarSzandek | null {
  const napTalalat = szoveg.match(NAPTAR_KEZDET);
  if (!napTalalat) return null;
  const napszo = NAP_ALAK_TERKEP[napTalalat[1]];
  let hatralevo = szoveg.slice(napTalalat[0].length).trim();

  let oraSzoveg: string | null = null;
  const idoTalalat = hatralevo.match(IDO_MINTA);
  if (idoTalalat && idoTalalat.index !== undefined) {
    const ora = idoTalalat[1].padStart(2, "0");
    const perc = (idoTalalat[2] ?? "00").padStart(2, "0");
    if (Number(ora) <= 23 && Number(perc) <= 59) {
      oraSzoveg = `${ora}:${perc}`;
      hatralevo = (
        hatralevo.slice(0, idoTalalat.index) +
        hatralevo.slice(idoTalalat.index + idoTalalat[0].length)
      ).trim();
    }
  }
  if (!oraSzoveg) {
    const reszTalalat = hatralevo.match(RESZNAP_MINTA);
    if (reszTalalat && reszTalalat.index !== undefined) {
      oraSzoveg = RESZNAP_ORA[reszTalalat[1]];
      hatralevo = (
        hatralevo.slice(0, reszTalalat.index) +
        hatralevo.slice(reszTalalat.index + reszTalalat[0].length)
      ).trim();
    }
  }
  if (!oraSzoveg) return null;

  hatralevo = hatralevo.replace(TOLTELEKSZO_MINTA, " ").replace(/\s+/g, " ").trim();

  const partnerTalalat = hatralevo.match(PARTNER_MINTA);
  if (!partnerTalalat || partnerTalalat.index === undefined) return null;
  const partnerSzoveg = partnerTalalat[1].trim();
  if (!partnerSzoveg) return null;

  const elotte = hatralevo.slice(0, partnerTalalat.index).trim();
  const utana = hatralevo.slice(partnerTalalat.index + partnerTalalat[0].length).trim();
  const leiras = [elotte, utana].filter(Boolean).join(" ") || undefined;

  return { szandek: "naptar_esemeny", napszo, oraSzoveg, partnerSzoveg, leiras };
}

const TEENDOK_MINTA =
  /\b(mai teendo|mi a dolgom|teendoim|teendok|mik a teendo|mi van ma|mai feladat|napirend|mit kell ma|mi a mai|naptaram|mi van a naptar)/;

const PARTNER_HELYZET_MINTA =
  /^(?:mutasd|nyisd meg|nezzuk|hogy allunk|mi a helyzet|mennyivel tartozik)\s+(?:meg\s+)?(?:a\s+|az\s+)?(.+?)\s*\??$/;

/**
 * A teendő-parancs kiváltó szavai — a prototípus `feladat` mintája.
 * Szó-szintű, mert a címet az EREDETI szövegből kell kivágni (lásd
 * `FeladatSzandek.cim`), a normalizált és az eredeti szöveg szavai
 * viszont egy az egyben megfeleltethetők.
 */
const FELADAT_KIVALTOK: string[][] = [
  ["emlekeztess"],
  ["jegyezd", "fel"],
  ["ird", "fel"],
  ["ne", "felejtsem"],
  ["teendo"],
];

/**
 * Általános igék ("Állíts be 20% kedvezményt", "Vegyél fel egy partnert",
 * "Rögzíts egy számlát") CSAK nap-szóval együtt jelentenek teendőt — a
 * prototípus `kell:["hatarido"]` őre. Nélküle a 0. réteg továbbad
 * (ismeretlen), nem ír csendben teendőt egy egészen más szándékból.
 */
const FELADAT_KIVALTOK_HATARIDOVEL: string[][] = [
  ["vegyel", "fel"],
  ["allits", "be"],
  ["rogzits"],
];

function ertelmezFeladatSzoveg(nyersSzoveg: string): FeladatSzandek | null {
  const nyersSzavak = nyersSzoveg.trim().split(/\s+/);
  const normSzavak = nyersSzavak.map((sz) => norm(sz).replace(/[.,:;!?]+$/, ""));

  const illik = (k: string[]) => k.every((sz, i) => normSzavak[i] === sz);
  const kivalto = FELADAT_KIVALTOK.find(illik) ?? FELADAT_KIVALTOK_HATARIDOVEL.find(illik);
  if (!kivalto) return null;
  const hataridoKell = !FELADAT_KIVALTOK.includes(kivalto);

  let index = kivalto.length;
  if (normSzavak[index] === "hogy") index += 1;
  const maradek = nyersSzavak.slice(index);
  if (!maradek.length) return null;

  let napszo: NapSzo | undefined;
  const cimSzavak = maradek.filter((sz, i) => {
    const n = normSzavak[index + i];
    const nap = NAP_ALAK_TERKEP[n];
    if (nap && !napszo) {
      napszo = nap;
      return false;
    }
    return true;
  });

  if (hataridoKell && !napszo) return null;

  // "Állíts be holnap, hogy hívjam…" — a nap-szó kivétele után maradó
  // vezető "hogy" sem tartozik a címhez.
  if (cimSzavak.length && norm(cimSzavak[0]).replace(/[.,:;!?]+$/, "") === "hogy") cimSzavak.shift();
  const cim = cimSzavak.join(" ").replace(/^[,:\s]+/, "").trim();
  if (!cim) return null;
  return { szandek: "feladat_felvetel", cim: cim.charAt(0).toUpperCase() + cim.slice(1), napszo };
}

export function ertelmezSzoveg(nyersSzoveg: string): Ertelmezes {
  const szoveg = norm(nyersSzoveg);

  const feladatSzandek = ertelmezFeladatSzoveg(nyersSzoveg);
  if (feladatSzandek) return feladatSzandek;

  if (TEENDOK_MINTA.test(szoveg)) return { szandek: "teendok" };

  const ajanlatTalalat = szoveg.match(AJANLAT_MINTA);
  if (ajanlatTalalat) {
    const [, partnerSzoveg, m2Szoveg, leiras] = ajanlatTalalat;
    const m2 = Number(m2Szoveg.replace(",", "."));
    if (m2 > 0 && partnerSzoveg.trim()) {
      return {
        szandek: "ajanlat_keszites",
        partnerSzoveg: partnerSzoveg.trim(),
        m2,
        leiras: leiras?.trim() || undefined,
      };
    }
  }

  const naptarSzandek = ertelmezNaptarSzoveg(szoveg);
  if (naptarSzandek) return naptarSzandek;

  // A partner-helyzet a naptár UTÁN jön: a "nézzük meg holnap Kovácsot"
  // ne partner-lapot nyisson, ha van benne nap+idő — a szűkebb minta előbb.
  const partnerTalalat = szoveg.match(PARTNER_HELYZET_MINTA);
  const partnerSzoveg = partnerTalalat?.[1].trim();
  // Ha a "név" részben nap-szó vagy időpont van ("nézzük meg holnap 9-kor
  // Kovácsot"), az egy naptár-mondat, amit a 0. réteg ebben az alakban nem
  // ismer — ilyenkor továbbad (ismeretlen), nem partner-lapot nyit.
  if (
    partnerSzoveg &&
    !partnerSzoveg.split(" ").some((sz) => NAP_ALAK_TERKEP[sz]) &&
    !IDO_MINTA.test(partnerSzoveg)
  ) {
    return { szandek: "partner_helyzet", partnerSzoveg };
  }

  return { szandek: "ismeretlen" };
}

// ---------------------------------------------------------------------------
// Név-illesztők — a szándékfelismerő párja: egy mondatból kivágott,
// toldalékos névrészletet illesztenek a cég saját listáira. Itt vannak (és
// nem az actions.ts-ben), hogy DB nélkül, szkripttel tesztelhetők legyenek.
// ---------------------------------------------------------------------------

export type NevTalalat<T> = { partner: T; biztos: boolean } | { tobb: T[] } | { nincs: true };

/**
 * Partner keresése egy (toldalékos) névrészletre: "Kovácssal", "Kovácsnak".
 *
 * `biztos`: a teljes normalizált név pontosan vagy egész szavakként benne
 * van a szövegben — erre lehet csendben építeni (pl. teendő partnerhez
 * kötése). Minden más (részsztring ≥ 4 betű, vagy a név ELSŐ szava egy
 * mondatszó elején, ≥ 4 betű) csak TIPP: a hívó mondja ki, mit értett.
 * Több jelölt → `tobb`, nem választunk (CLAUDE.md 5. szabály).
 */
export function partnerKereses<T extends { nev: string }>(partnerek: T[], szoveg: string): NevTalalat<T> {
  const cel = norm(szoveg);
  if (!cel) return { nincs: true };
  const celSzavak = cel.split(" ");

  const pontos = partnerek.filter((p) => norm(p.nev) === cel);
  if (pontos.length === 1) return { partner: pontos[0], biztos: true };
  if (pontos.length > 1) return { tobb: pontos };

  const biztosak = partnerek.filter((p) => {
    const nev = norm(p.nev);
    return nev.length >= 4 && ` ${cel} `.includes(` ${nev} `);
  });
  if (biztosak.length === 1) return { partner: biztosak[0], biztos: true };
  if (biztosak.length > 1) return { tobb: biztosak };

  const tippek = partnerek.filter((p) => {
    const nev = norm(p.nev);
    if (nev.length >= 4 && cel.length >= 4 && (nev.includes(cel) || cel.includes(nev))) return true;
    const elsoSzo = nev.split(" ")[0];
    return elsoSzo.length >= 4 && celSzavak.some((sz) => sz.startsWith(elsoSzo));
  });
  if (tippek.length === 1) return { partner: tippek[0], biztos: false };
  if (tippek.length > 1) return { tobb: tippek };
  return { nincs: true };
}

/**
 * Munkacsomag keresése az ajánlat-mondat végéből ("… 50 m²-re térkövezésre").
 *
 * Rangsor (a "ne találgass" elv mellett a toldalékos magyar alakokra):
 *  0. pontos normalizált egyezés;
 *  A. a csomag neve a leírás ELEJE, és utána csak toldalék jön (nincs
 *     szóköz): "terkovezesre" ← "terkovezes". Több ilyen névnél a
 *     LEGHOSSZABB nyer ("terko" és "terkovezes" közül az utóbbi — a
 *     felhasználó térkövezést mondott, ez nem találgatás);
 *  B. a leírás a csomagnév eleje (csonka bevitel: "terko" ← "Térkő szürke",
 *     "Térkő antik"): egy jelölt → az; több → `tobb`;
 *  C. részsztring bármelyik irányban (≥ 4 betű mindkét oldalon): egy → az;
 *     több, de egymásba ágyazott nevek (a leghosszabb tartalmazza a
 *     többit) → a leghosszabb; egyébként → `tobb`, kérdezünk.
 */
export function csomagKereses<T extends { nev: string }>(
  csomagok: T[],
  leiras: string,
): { csomag: T } | { tobb: T[] } | { nincs: true } {
  const cel = norm(leiras);
  if (!cel) return { nincs: true };
  const nevvel = csomagok.map((c) => ({ c, nev: norm(c.nev) })).filter((x) => x.nev.length >= 4);

  const pontos = nevvel.filter((x) => x.nev === cel);
  if (pontos.length === 1) return { csomag: pontos[0].c };
  if (pontos.length > 1) return { tobb: pontos.map((x) => x.c) };

  const eloTag = nevvel.filter((x) => cel.startsWith(x.nev) && !cel.slice(x.nev.length).includes(" "));
  if (eloTag.length) {
    const leghosszabb = eloTag.reduce((a, b) => (b.nev.length > a.nev.length ? b : a));
    return { csomag: leghosszabb.c };
  }

  if (cel.length >= 4) {
    const csonka = nevvel.filter((x) => x.nev.startsWith(cel));
    if (csonka.length === 1) return { csomag: csonka[0].c };
    if (csonka.length > 1) return { tobb: csonka.map((x) => x.c) };
  }

  const resz = cel.length >= 4 ? nevvel.filter((x) => cel.includes(x.nev) || x.nev.includes(cel)) : [];
  if (resz.length === 1) return { csomag: resz[0].c };
  if (resz.length > 1) {
    const leghosszabb = resz.reduce((a, b) => (b.nev.length > a.nev.length ? b : a));
    if (resz.every((x) => leghosszabb.nev.includes(x.nev))) return { csomag: leghosszabb.c };
    return { tobb: resz.map((x) => x.c) };
  }
  return { nincs: true };
}

/** Amit az AI-doboz "m²"-nek ért — a csomag alapegységének egyeztetéséhez. */
export const M2_ALIASOK = new Set(["m2", "nm", "nm2", "negyzetmeter"]);
