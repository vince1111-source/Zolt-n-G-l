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
export type NaptarSzandek = {
  szandek: "naptar_esemeny";
  napszo: "ma" | "holnap" | "holnaputan" | "hetfo" | "kedd" | "szerda" | "csutortok" | "pentek" | "szombat" | "vasarnap";
  oraSzoveg: string; // "HH:MM"
  partnerSzoveg: string;
  leiras?: string;
};

export type Ertelmezes = AjanlatSzandek | NaptarSzandek | { szandek: "ismeretlen" };

const AJANLAT_MINTA =
  /(?:keszits?|csinalj|adj)\s+(?:egy\s+)?(?:ajanlatot|arajanlatot|arat)\s+(.+?)\s*(?:nek|nak)\s+(\d+(?:[.,]\d+)?)\s*(?:negyzetmeter|nm2|m2|nm)(?:re|ra)?\b\s*(.*)/;

const NAP_ALAK_TERKEP: Record<string, NaptarSzandek["napszo"]> = {
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

export function ertelmezSzoveg(nyersSzoveg: string): Ertelmezes {
  const szoveg = norm(nyersSzoveg);

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

  return { szandek: "ismeretlen" };
}
