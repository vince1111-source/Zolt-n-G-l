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

// ---------------------------------------------------------------------------
// Szóval kimondott számok. A böngésző hangfelismerője néha betűvel írja ki
// ("nyolcvan négyzetméter", "tízkor"). Csak akkor írjuk át számjegyre, ha
// mértékegység vagy időpont követi — így az "egy ajánlatot" névelője vagy a
// "jövő héten" nem változik meg.
// ---------------------------------------------------------------------------

const EGYESEK: [string, number][] = [
  ["ketto", 2], ["harom", 3], ["negy", 4], ["nyolc", 8], ["kilenc", 9],
  ["egy", 1], ["ket", 2], ["hat", 6], ["het", 7], ["ot", 5],
];
const TIZESEK: [string, number][] = [
  ["tizen", 10], ["huszon", 20], ["harminc", 30], ["negyven", 40], ["otven", 50],
  ["hatvan", 60], ["hetven", 70], ["nyolcvan", 80], ["kilencven", 90], ["tiz", 10], ["husz", 20],
];

function elotag(s: string, lista: [string, number][]): [number, string] | null {
  for (const [alak, ertek] of lista) if (s.startsWith(alak)) return [ertek, s.slice(alak.length)];
  return null;
}

/** Ékezet nélküli számszó értéke: "nyolcvanot" → 85, "ketszazotven" → 250, "ezerketszaz" → 1200; ha nem szám: null. */
export function szamSzoErteke(szo: string): number | null {
  let s = szo;
  let osszeg = 0;
  let volt = false;
  for (const [kulcs, szorzo] of [["ezer", 1000], ["szaz", 100]] as const) {
    const e = elotag(s, EGYESEK);
    if (e && e[1].startsWith(kulcs)) {
      osszeg += e[0] * szorzo;
      s = e[1].slice(kulcs.length);
      volt = true;
    } else if (s.startsWith(kulcs)) {
      osszeg += szorzo;
      s = s.slice(kulcs.length);
      volt = true;
    }
  }
  const t = elotag(s, TIZESEK);
  if (t) {
    osszeg += t[0];
    s = t[1];
    volt = true;
  }
  const e = elotag(s, EGYESEK);
  if (e) {
    osszeg += e[0];
    s = e[1];
    volt = true;
  }
  return volt && s === "" ? osszeg : null;
}

/** Ami után egy számszó biztosan szám: mértékegység vagy időpont. */
const SZAM_UTAN = /^(negyzet|nm|m2|m3|meter|fm|folyometer|orakor|ora|kor|zsak|db|darab|kontener|alkalom|raklap|kobmeter|tonna)/;

/** A normalizált mondat szóval kiírt számait számjegyre cseréli ("nyolcvan negyzet" → "80 negyzet", "tizkor" → "10kor"). */
export function szamSzavakAtirasa(szoveg: string): string {
  const szavak = szoveg.split(" ");
  return szavak
    .map((sz, i) => {
      const tiszta = sz.replace(/[.,!?;:]+$/, "");
      const vege = sz.slice(tiszta.length);
      const kor = tiszta.match(/^(.+?)(orakor|kor)$/);
      if (kor) {
        const ertek = szamSzoErteke(kor[1]);
        if (ertek !== null) return `${ertek}${kor[2]}${vege}`;
      }
      const ertek = szamSzoErteke(tiszta);
      if (ertek !== null && SZAM_UTAN.test(szavak[i + 1] ?? "")) return `${ertek}${vege}`;
      return sz;
    })
    .join(" ");
}

export type AjanlatSzandek = {
  szandek: "ajanlat_keszites";
  partnerSzoveg: string;
  m2: number;
  leiras?: string;
  /** Ha a mondat megmondta ("36 méter szegéllyel"): a kerület folyóméterben — különben becslés. */
  kerulet?: number;
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

/** Négyzetméter írt és beszélt alakjai: m2, nm, négyzetméter(re|es|en), négyzet(re|es). */
const M2_EGYSEG = "(?:negyzet\\w*|nm2?\\w*|m2\\w*)";

// "k[ei]sz[ei]t": a szabolcsi í-zést ("kíszíts") is felismeri — a böngésző
// hangfelismerője gyakran úgy írja le, ahogy hallja.
const AJANLAT_MINTA = new RegExp(
  `(?:k[ei]sz[ei]t\\w*|csinal\\w*|adj)\\s+(?:egy\\s+)?(?:ajanlatot|arajanlatot|arat)\\s+(.+?)\\s*(?:nek|nak)\\s+(\\d+(?:[.,]\\d+)?)\\s*${M2_EGYSEG}\\s*(.*)`,
);

/**
 * "36 méter szegéllyel", "szegély 40 fm", "kerülete 28 méter" — a kerület, ha
 * elhangzott. A tő "szegel": toldalékkal a ly kettőződik (szegély → szegéllyel).
 */
const KERULET_MINTA =
  /(\d+(?:[.,]\d+)?)\s*(?:fm|folyometer\w*|meter\w*)\s+(?:szegel\w*|kerulet\w*)|(?:szegel\w*|kerulet\w*)\s+(\d+(?:[.,]\d+)?)\s*(?:fm|folyometer\w*|meter\w*)?/;

function keruletKivetel(szoveg: string): { kerulet?: number; maradek: string } {
  const vegeTisztitva = (s: string) =>
    s.replace(/\s+/g, " ").trim().replace(/^[\s,.;:!?]+/, "").replace(/[\s,.;:!?]+$/, "");
  const t = szoveg.match(KERULET_MINTA);
  if (!t || t.index === undefined) return { maradek: vegeTisztitva(szoveg) };
  const kerulet = Number((t[1] ?? t[2]).replace(",", "."));
  if (!(kerulet > 0)) return { maradek: vegeTisztitva(szoveg) };
  return { kerulet, maradek: vegeTisztitva(`${szoveg.slice(0, t.index)} ${szoveg.slice(t.index + t[0].length)}`) };
}

/** A rugalmas ajánlat-mondat kiváltó szavai: "mennyibe kerülne…", "ajánlat Kovácséknak…". */
const AJANLAT_KIVALTO = /\b(?:ajanlat\w*|arajanlat\w*|arat|araz\w*|mennyibe|mennyiert|kalkulal\w*|szamold)\b|mennyi lenne|mennyi az ara/;
const MENNYISEG_M2 = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${M2_EGYSEG}`);
/** Parancs- és töltelékszavak — nem nevek, nem munkák. */
const AJANLAT_TOLTELEK = new Set([
  "keszits", "keszitsd", "keszitsen", "kiszits", "kiszitsd", "kiszitsen", "csinalj", "csinald", "adj", "kerek", "kellene", "kell", "kene", "legyen",
  "lenne", "mennyibe", "kerulne", "kerul", "mennyi", "mennyiert", "arazd", "be", "ki", "szamold", "kalkulald",
  "egy", "az", "a", "es", "meg", "is", "nekem", "neki", "annak", "ennek", "ajanlat", "ajanlatot", "arajanlat",
  "arajanlatot", "arat", "ar", "ara", "arra", "erre", "hogy", "mar", "most", "gyorsan", "legyszi", "kerlek",
  "plusz", "kb", "korulbelul", "nagyjabol", "valami", "olyan", "kozel",
]);
/** Munka- és extra-szótövek: a név ezeknél véget ér ("… térkövezés Kovácséknak"). */
const MUNKA_TOVEK = ["terko", "kocsibe", "bejaro", "udvar", "jard", "terasz", "garazs", "parkol", "burkol", "szegel", "bontas", "kontener", "kiszall", "sitt"];
const RESZES_ESET = /^(.{2,}?)(eknak|eknek|nak|nek)$/;

/**
 * Rugalmas szórendű ajánlat-mondat — ahogy hangosan mondjuk:
 * "Mennyibe kerülne 80 négyzet térkövezés Kovácséknak?",
 * "Ajánlat Nagy Pistának 120 négyzet udvar". Kell: kiváltó szó, egy m²-es
 * mennyiség és egy részes esetű (-nak/-nek) név. A név a részes szó és a
 * közvetlenül előtte álló névszavak (legfeljebb 3); a maradék a leírás.
 */
function ertelmezAjanlatRugalmas(szoveg: string): AjanlatSzandek | null {
  if (!AJANLAT_KIVALTO.test(szoveg)) return null;
  const { kerulet, maradek } = keruletKivetel(szoveg);
  const mennyiseg = maradek.match(MENNYISEG_M2);
  if (!mennyiseg || mennyiseg.index === undefined) return null;
  const m2 = Number(mennyiseg[1].replace(",", "."));
  if (!(m2 > 0)) return null;
  const tobbi = `${maradek.slice(0, mennyiseg.index)} ${maradek.slice(mennyiseg.index + mennyiseg[0].length)}`;
  const szavak = tobbi
    .split(" ")
    .map((sz) => sz.replace(/[.,!?;:]+$/, ""))
    .filter(Boolean);

  const reszes = szavak.findIndex((sz) => RESZES_ESET.test(sz) && !AJANLAT_TOLTELEK.has(sz));
  if (reszes < 0) return null;
  const nevIndexek = [reszes];
  for (let i = reszes - 1; i >= 0 && nevIndexek.length < 3; i--) {
    const sz = szavak[i];
    if (AJANLAT_TOLTELEK.has(sz) || /\d/.test(sz) || MUNKA_TOVEK.some((m) => sz.startsWith(m)) || AJANLAT_KIVALTO.test(sz)) break;
    nevIndexek.unshift(i);
  }
  const partnerSzoveg = nevIndexek
    .map((i) => (i === reszes ? szavak[i].replace(RESZES_ESET, "$1") : szavak[i]))
    .join(" ");
  const leiras = szavak
    .filter((sz, i) => !nevIndexek.includes(i) && !AJANLAT_TOLTELEK.has(sz) && !AJANLAT_KIVALTO.test(sz))
    .join(" ");
  return { szandek: "ajanlat_keszites", partnerSzoveg, m2, leiras: leiras || undefined, ...(kerulet ? { kerulet } : {}) };
}

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
  // A szóval kimondott számok ("nyolcvan négyzet", "tízkor") számjegyre — a
  // minták számjegyre illeszkednek.
  const szoveg = szamSzavakAtirasa(norm(nyersSzoveg));

  const feladatSzandek = ertelmezFeladatSzoveg(nyersSzoveg);
  if (feladatSzandek) return feladatSzandek;

  if (TEENDOK_MINTA.test(szoveg)) return { szandek: "teendok" };

  const ajanlatTalalat = szoveg.match(AJANLAT_MINTA);
  if (ajanlatTalalat) {
    const [, partnerSzoveg, m2Szoveg, leirasNyers] = ajanlatTalalat;
    const m2 = Number(m2Szoveg.replace(",", "."));
    if (m2 > 0 && partnerSzoveg.trim()) {
      const { kerulet, maradek } = keruletKivetel(leirasNyers ?? "");
      return {
        szandek: "ajanlat_keszites",
        partnerSzoveg: partnerSzoveg.trim(),
        m2,
        leiras: maradek || undefined,
        ...(kerulet ? { kerulet } : {}),
      };
    }
  }

  // Rugalmas szórend, ahogy beszélni szokás: "Mennyibe kerülne 80 négyzet
  // térkövezés Kovácséknak?", "Ajánlat Nagy Pistának 120 négyzet udvar".
  const rugalmas = ertelmezAjanlatRugalmas(szoveg);
  if (rugalmas) return rugalmas;

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
/** Cégforma-szavak: a döntetlen-bontásnál nem számítanak névszónak. */
const CEGFORMAK = new Set(["kft", "bt", "zrt", "nyrt", "kkt", "egyeni", "vallalkozo"]);

/**
 * Becenév → hivatalos keresztnév (ékezet nélkül). Beszédben ritkán mondjuk a
 * hivatalos nevet: "Nagy Pistának", "Balogh Ferinek".
 */
const BECENEVEK: Record<string, string> = {
  pista: "istvan", pisti: "istvan", laci: "laszlo", feri: "ferenc", ferko: "ferenc", jozsi: "jozsef",
  jani: "janos", jancsi: "janos", gabi: "gabor", zoli: "zoltan", sanyi: "sandor", misi: "mihaly",
  miska: "mihaly", bandi: "andras", andris: "andras", tibi: "tibor", gyuri: "gyorgy", karcsi: "karoly",
  lajcsi: "lajos", imi: "imre", ati: "attila", csabi: "csaba", peti: "peter", robi: "robert",
  zsolti: "zsolt", tomi: "tamas", marci: "marton", dani: "daniel", gergo: "gergely", szabi: "szabolcs",
  levi: "levente", kati: "katalin", erzsi: "erzsebet", marika: "maria", juci: "judit", zsuzsi: "zsuzsanna",
  evi: "eva", ili: "ilona", gizi: "gizella", panni: "anna", anci: "anna", niki: "nikolett", kriszti: "krisztina",
  moni: "monika", eni: "eniko", bea: "beata",
};
const BECENEV_TOLDALEK = /^(|t|nak|nek|val|vel|hoz|hez|nal|nel|tol|rol|ra|re|ek|eknak|eknek|ekhez|eknel|eknal|eket|ekkel)$/;

/** "ferinek" → "ferenc", "pistaval" → "istvan"; ha nem becenév: null. */
export function becenevFeloldas(szo: string): string | null {
  for (const [bece, teljes] of Object.entries(BECENEVEK)) {
    if (szo.startsWith(bece) && BECENEV_TOLDALEK.test(szo.slice(bece.length))) return teljes;
  }
  return null;
}

export function partnerKereses<T extends { nev: string }>(partnerek: T[], szoveg: string): NevTalalat<T> {
  const cel = norm(szoveg);
  if (!cel) return { nincs: true };
  const celSzavak = cel.split(" ");
  // Becenév ("Balogh Ferinek", "Nagy Pistával"): a hivatalos keresztnév is
  // illeszthető szó — de csak tippként, a jóváhagyó lap kimondja.
  const formalisSzavak = celSzavak.map(becenevFeloldas).filter((x): x is string => !!x);
  const bovitett = [...celSzavak, ...formalisSzavak];

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
    const nevSzavak = nev.split(" ");
    const elsoSzo = nevSzavak[0];
    if (elsoSzo.length >= 4 && bovitett.some((sz) => sz.startsWith(elsoSzo))) return true;
    // Csak becenévvel ("Ferinek"): a hivatalos keresztnév szerepel a partner nevében.
    return formalisSzavak.some((f) => nevSzavak.includes(f));
  });
  if (tippek.length === 1) return { partner: tippek[0], biztos: false };
  if (tippek.length > 1) {
    // Döntetlen-bontás: hány névszava (≥ 4 betű, cégforma nélkül) áll a mondat
    // valamelyik szavának ELEJÉN. "Kovács Építővel": a Kovács Építő Kft. két
    // szóval illik, a Kovács Tüzép eggyel — ezt a mondat dönti el, nem
    // találgatás. Egyenlőségnél ("Kovácssal") továbbra is kérdezünk.
    const pont = (p: T) =>
      norm(p.nev)
        .split(" ")
        .map((w) => w.replace(/[.,]+$/, ""))
        .filter((w) => w.length >= 4 && !CEGFORMAK.has(w))
        .filter((w) => bovitett.some((sz) => sz.startsWith(w))).length;
    const rangsor = tippek.map((p) => ({ p, n: pont(p) })).sort((a, b) => b.n - a.n);
    if (rangsor[0].n > rangsor[1].n) return { partner: rangsor[0].p, biztos: false };
    return { tobb: tippek };
  }
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
export function csomagKereses<T extends { nev: string; kulcsszavak?: string | null }>(
  csomagok: T[],
  leiras: string,
): { csomag: T } | { tobb: T[] } | { nincs: true } {
  const cel = norm(leiras);
  if (!cel) return { nincs: true };
  // A csomag neve MELLETT a kulcsszavai is nevek ("bejáró" → Kocsibeálló, 0024).
  const nevvel = csomagok
    .flatMap((c) => [c.nev, ...kulcsszoLista(c.kulcsszavak)].map((nev) => ({ c, nev: norm(nev) })))
    .filter((x) => x.nev.length >= 4);
  const egyedi = (xs: { c: T }[]) => [...new Set(xs.map((x) => x.c))];

  const pontos = egyedi(nevvel.filter((x) => x.nev === cel));
  if (pontos.length === 1) return { csomag: pontos[0] };
  if (pontos.length > 1) return { tobb: pontos };

  const eloTag = nevvel.filter((x) => cel.startsWith(x.nev) && !cel.slice(x.nev.length).includes(" "));
  if (eloTag.length) {
    const leghosszabb = eloTag.reduce((a, b) => (b.nev.length > a.nev.length ? b : a));
    return { csomag: leghosszabb.c };
  }

  if (cel.length >= 4) {
    const csonka = egyedi(nevvel.filter((x) => x.nev.startsWith(cel)));
    if (csonka.length === 1) return { csomag: csonka[0] };
    if (csonka.length > 1) return { tobb: csonka };
  }

  const resz = cel.length >= 4 ? nevvel.filter((x) => cel.includes(x.nev) || x.nev.includes(cel)) : [];
  const reszCsomagok = egyedi(resz);
  if (reszCsomagok.length === 1) return { csomag: reszCsomagok[0] };
  if (reszCsomagok.length > 1) {
    const leghosszabb = resz.reduce((a, b) => (b.nev.length > a.nev.length ? b : a));
    if (resz.every((x) => leghosszabb.nev.includes(x.nev))) return { csomag: leghosszabb.c };
    return { tobb: reszCsomagok };
  }
  return { nincs: true };
}

/** A csomag kulcsszavai listaként ("járda, terasz" → ["járda", "terasz"]). */
export function kulcsszoLista(kulcsszavak?: string | null): string[] {
  return (kulcsszavak ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Amit az AI-doboz "m²"-nek ért — a csomag alapegységének egyeztetéséhez. */
export const M2_ALIASOK = new Set(["m2", "nm", "nm2", "negyzetmeter"]);
