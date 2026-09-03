/**
 * iCalendar (.ics) generálás a naptár egyirányú, feliratkozásos
 * szinkronjához (lásd db/migraciok/0013_naptar_feed_szinkron.sql).
 * Az RFC 5545 alapjait követi: CRLF sorvégek, a szöveges mezők
 * escape-elése, és a hosszú sorok tördelése. A tördelés karakterszám
 * (nem oktet) alapú egyszerűsítés — ékezetes szöveg emiatt néha korábban
 * tördelődik, mint az RFC 75 oktetes határa, ami megengedett (a határ
 * csak felülről korlátoz), és a naptár-alkalmazások az extra tördelést
 * simán feldolgozzák.
 */

export type FeedEsemeny = {
  id: string;
  cim: string;
  kezdet: string;
  veg: string | null;
  munka_cim: string | null;
  partner_nev: string | null;
};

// Irányjelző Unicode-vezérlők (RLO, irány-izolátumok, LRM/RLM) — egy
// esemény cím/cím/partner mezőben nincs legitim céljuk, viszont vizuálisan
// meghamisíthatnák a naptárkliensben megjelenő szöveget (pl. egy URL
// álcázására). Kiszűrve, nem csak escape-elve — nincs olyan érvényes eset,
// amit meg kéne őrizni.
const IRANY_VEZERLOK = /[\u202E\u2066-\u2069\u200E\u200F]/g;
// C0-vezérlőkarakterek a tabulátoron és a soremelés-családon kívül —
// szintén nincs legitim céljuk ezekben a mezőkben.
const VEZERLO_KARAKTEREK = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
// A CRLF-családon kívül a Unicode sor-/bekezdéselválasztókat (U+2028,
// U+2029) és a NEL-t (U+0085) is soremelésként kezeljük — ezeket néhány,
// az RFC 5545-nél megengedőbb szövegfeldolgozó valódi sortörésként
// értelmezi, ezért ugyanúgy escape-elendők, mint a \n.
const SOREMELESEK = /\r\n|\r|\n|\u2028|\u2029|\u0085/g;

function icsEscape(szoveg: string): string {
  return szoveg
    .replace(IRANY_VEZERLOK, "")
    .replace(VEZERLO_KARAKTEREK, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(SOREMELESEK, "\\n");
}

const SORTORES_HATAR = 70;

function icsSorTores(sor: string): string {
  // Kódpont szerint (nem UTF-16 kódegység szerint) tördelünk, hogy egy
  // szürrogát-párral kódolt karakter (pl. emoji) sose vágódjon ketté — egy
  // ilyen vágás a két félkarakter helyén két érvénytelen U+FFFD karaktert
  // eredményezne a végső, UTF-8-ra kódolt válaszban.
  const karakterek = Array.from(sor);
  if (karakterek.length <= SORTORES_HATAR) return sor;
  const darabok: string[] = [];
  let index = 0;
  let elso = true;
  while (index < karakterek.length) {
    const meret = elso ? SORTORES_HATAR : SORTORES_HATAR - 1;
    darabok.push((elso ? "" : " ") + karakterek.slice(index, index + meret).join(""));
    index += meret;
    elso = false;
  }
  return darabok.join("\r\n");
}

function icsSor(cimke: string, ertek: string): string {
  return icsSorTores(`${cimke}:${icsEscape(ertek)}`);
}

function datumIcsSzoveg(isoIdobelyeg: string): string {
  return new Date(isoIdobelyeg)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function esemenyekIcsSzoveg(cegNev: string, esemenyek: FeedEsemeny[]): string {
  const most = datumIcsSzoveg(new Date().toISOString());

  const sorok: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CEGEM.AI//Naptar//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    icsSor("X-WR-CALNAME", `${cegNev} — CÉGEM.AI naptár`),
    "X-WR-TIMEZONE:Europe/Budapest",
  ];

  for (const e of esemenyek) {
    const leirasReszek = [e.partner_nev, e.munka_cim].filter((r): r is string => !!r);
    sorok.push("BEGIN:VEVENT");
    sorok.push(icsSor("UID", `${e.id}@cegem.ai`));
    sorok.push(icsSor("DTSTAMP", most));
    sorok.push(icsSor("DTSTART", datumIcsSzoveg(e.kezdet)));
    if (e.veg) sorok.push(icsSor("DTEND", datumIcsSzoveg(e.veg)));
    sorok.push(icsSor("SUMMARY", e.cim));
    if (leirasReszek.length) sorok.push(icsSor("DESCRIPTION", leirasReszek.join(" · ")));
    if (e.munka_cim) sorok.push(icsSor("LOCATION", e.munka_cim));
    sorok.push("END:VEVENT");
  }

  sorok.push("END:VCALENDAR");
  return sorok.join("\r\n") + "\r\n";
}
