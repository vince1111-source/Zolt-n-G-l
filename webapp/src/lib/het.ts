/**
 * Tiszta dátum-aritmetika a naptár hét-nézetéhez. Ez SZÁNDÉKOSAN nincs a
 * `mag/`-ban: nem üzleti/pénzügyi kalkuláció (ár, határidő, kintlévőség),
 * hanem prezentációs segédlet a webapp oldalán.
 */

/**
 * Az adott "YYYY-MM-DD" dátumot tartalmazó hét hétfője, ugyanolyan
 * "YYYY-MM-DD" alakban. Szándékosan dátum-stringgel, nem `Date`
 * objektummal számol — egy naptári dátumnak nincs önmagában időzónája, és
 * ha `Date`-del, helyi (szerver) idő szerinti `getDay()`/`setDate()`-tel
 * számolnánk, a szerver időzónájától függően csúszhatna a hét eleje.
 */
export function hetElsoDatum(datumStr: string): string {
  const [ev, honap, nap] = datumStr.split("-").map(Number);
  const napJelzo = new Date(Date.UTC(ev, honap - 1, nap));
  // getUTCDay(): 0=vasárnap..6=szombat — a hétfőig visszaszámolt napok száma.
  const elteltNapokHetfoOta = (napJelzo.getUTCDay() + 6) % 7;
  napJelzo.setUTCDate(napJelzo.getUTCDate() - elteltNapokHetfoOta);
  return napJelzo.toISOString().slice(0, 10);
}

/** Egy "YYYY-MM-DD" dátumhoz `napok` napot ad hozzá (lehet negatív is). */
export function napHozzaad(datumStr: string, napok: number): string {
  const [ev, honap, nap] = datumStr.split("-").map(Number);
  return new Date(Date.UTC(ev, honap - 1, nap + napok)).toISOString().slice(0, 10);
}

const HETKOZNAP_INDEX: Record<string, number> = {
  vasarnap: 0,
  hetfo: 1,
  kedd: 2,
  szerda: 3,
  csutortok: 4,
  pentek: 5,
  szombat: 6,
};

/**
 * Egy nap-szóból ("ma", "holnap", "holnaputan", vagy egy hétköznap neve)
 * tényleges "YYYY-MM-DD" dátumot ad `maDatum`-hoz képest — a szöveges
 * AI-doboz naptár-szándékához (lásd `szandek.ts`). Hétköznap-névnél
 * mindig a KÖVETKEZŐ ilyen napot jelenti, sosem a mait — a hétköznapi
 * nyelvhasználat szerint "keddet" mondva soha nem a mai keddre gondolunk.
 */
export function napszoDatumma(napszo: string, maDatum: string): string | null {
  if (napszo === "ma") return maDatum;
  if (napszo === "holnap") return napHozzaad(maDatum, 1);
  if (napszo === "holnaputan") return napHozzaad(maDatum, 2);
  const celIndex = HETKOZNAP_INDEX[napszo];
  if (celIndex === undefined) return null;
  const [ev, honap, nap] = maDatum.split("-").map(Number);
  const maIndex = new Date(Date.UTC(ev, honap - 1, nap)).getUTCDay();
  let kulonbseg = (celIndex - maIndex + 7) % 7;
  if (kulonbseg === 0) kulonbseg = 7;
  return napHozzaad(maDatum, kulonbseg);
}

/** A hét 7 napja, hétfőtől vasárnapig, "YYYY-MM-DD" stringekként. */
export function hetNapjai(hetElsoNap: string): string[] {
  const [ev, honap, nap] = hetElsoNap.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(ev, honap - 1, nap + i));
    return d.toISOString().slice(0, 10);
  });
}

/**
 * A naptár hét-nézetének tartománya a megjelölt nap körül: a hét napjai, a
 * szomszédos hetek hétfője, és a lekérdezés [tol, ig) határai budapesti
 * éjfélhez igazítva (UTC ISO-időbélyegként). A következő hét hétfője a
 * hétfő + 7 nap — NEM a vasárnapból visszaszámolt hétfő, ami ugyanerre a
 * hétre esne vissza (ez üres lekérdezést és helyben maradó lapozást adott).
 */
export function hetTartomany(datumStr: string) {
  const hetfo = hetElsoDatum(datumStr);
  const kovetkezoHet = napHozzaad(hetfo, 7);
  return {
    hetfo,
    napok: hetNapjai(hetfo),
    elozoHet: napHozzaad(hetfo, -7),
    kovetkezoHet,
    tol: budapestIdopontIso(hetfo, "00:00"),
    ig: budapestIdopontIso(kovetkezoHet, "00:00"),
  };
}

/** Dátum-string ("2026-09-03") magyar, olvasható alakja. */
export function datumSzoveg(datumStr: string): string {
  return new Date(`${datumStr}T00:00:00Z`).toLocaleDateString("hu-HU", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Egy "2026-09-03" dátum + "14:00" idő párost alakít UTC ISO-időbélyeggé,
 * Europe/Budapest helyi idő szerint (a nyári/téli időszámítást is
 * figyelembe véve). Erre azért van szükség, mert a szerver folyamat nem
 * feltétlenül Budapest időzónában fut — egy naiv `new Date(datum+"T"+ido)`
 * a szerver saját időzónáját használná, ami rossz órát menthetne el.
 */
export function budapestIdopontIso(datumStr: string, idoStr: string): string {
  const [ev, honap, nap] = datumStr.split("-").map(Number);
  const [ora, perc] = idoStr.split(":").map(Number);
  const durvaUtc = Date.UTC(ev, honap - 1, nap, ora, perc);
  const offsetPerc = budapestOffsetPercDurvaUtcnal(durvaUtc);
  return new Date(durvaUtc - offsetPerc * 60000).toISOString();
}

/** Egy UTC időbélyeg dátuma Europe/Budapest helyi idő szerint, "YYYY-MM-DD". */
export function budapestNapString(isoIdobelyeg: string): string {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(isoIdobelyeg));
}

/** A mai nap Europe/Budapest helyi idő szerint, "YYYY-MM-DD". */
export function budapestMaDatum(): string {
  return budapestNapString(new Date().toISOString());
}

/** Egy UTC időbélyeg ideje Europe/Budapest helyi idő szerint, "HH:MM". */
export function budapestIdoString(isoIdobelyeg: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(new Date(isoIdobelyeg));
}

function budapestOffsetPercDurvaUtcnal(utcMillis: number): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Budapest",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const resz = fmt.formatToParts(new Date(utcMillis));
  const ertek = (tipus: string) => Number(resz.find((r) => r.type === tipus)?.value);
  const kepzeltUtc = Date.UTC(
    ertek("year"),
    ertek("month") - 1,
    ertek("day"),
    ertek("hour") === 24 ? 0 : ertek("hour"),
    ertek("minute"),
    ertek("second"),
  );
  return (kepzeltUtc - utcMillis) / 60000;
}
