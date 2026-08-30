/**
 * CÉGEM.AI — árkalkuláció.
 *
 * Ez a modul a termék magja, és szándékosan **determinisztikus kód**:
 * a nyelvi modell csak a paramétereket tölti ki (kinek, mennyire, milyen
 * anyagból), a számolást ez végzi. Három okból:
 *
 *   1. Olcsóbb — nem kell hozzá modellhívás.
 *   2. Kiszámítható — ugyanaz a bemenet mindig ugyanazt az összeget adja.
 *   3. Védhető — a kiadott ajánlat mögött az ügyfél árlistája áll,
 *      nem egy nyelvi modell.
 *
 * A „mit feltételeztem" lista **ugyanebből a számításból** származik, nem
 * külön íródik. Így nem tud eltérni attól, ami ténylegesen történt.
 */

/** Kerekítés forintra. Minden pénzösszeg ezen megy át, hogy egységes legyen. */
export const forintra = (n) => Math.round(n);

/**
 * A burkolandó terület kerületének becslése.
 *
 * Négyzetes alakot feltételez, és 5 folyóméterre kerekít fel- vagy lefelé.
 * Ez **feltevés**, nem mérés — ezért kerül bele a feltételezések listájába is.
 * Hosszúkás területnél a valódi kerület ennél nagyobb.
 */
export function keruletBecsles(m2) {
  if (!(m2 > 0)) throw new Error('A terület csak pozitív szám lehet.');
  return Math.round((4 * Math.sqrt(m2)) / 5) * 5;
}

/** Vágási ráhagyás az anyagnál: a lerakás során törik és vágni kell. */
export const VAGASI_RAHAGYAS = 0.05;

/** Alapértelmezett áfakulcs. Az árlista tételenként felülírhatja. */
export const AFA_KULCS = 27;

/**
 * Térkövezési ajánlat tételei az árlistából.
 *
 * @param {object} p
 * @param {number} p.m2         burkolandó felület
 * @param {"normal"|"mintas"} [p.kotes]     lerakási kötésmód
 * @param {"szurke"|"antik"}  [p.anyag]     térkő anyaga
 * @param {Array}  p.arlista    a cég árlistája (cikkszámmal)
 * @returns {Array} tételek — az egységár a KIADÁSKORI ár másolata
 */
export function terkovezesTetelek({ m2, kotes = 'normal', anyag = 'szurke', arlista }) {
  if (!(m2 > 0)) throw new Error('A terület csak pozitív szám lehet.');
  if (!Array.isArray(arlista) || !arlista.length) throw new Error('Az árlista üres.');

  const tetel = (cikkszam) => {
    const t = arlista.find((x) => x.cikkszam === cikkszam);
    if (!t) throw new Error(`Hiányzó árlistatétel: ${cikkszam}`);
    return t;
  };

  const fm = keruletBecsles(m2);
  const anyagTetel = tetel(anyag === 'antik' ? 'AN-202' : 'AN-201');
  const lerakasTetel = tetel(kotes === 'mintas' ? 'MU-102' : 'MU-101');

  const sorok = [
    { forras: tetel('MU-110'), mennyiseg: m2 },
    { forras: anyagTetel, mennyiseg: Math.round(m2 * (1 + VAGASI_RAHAGYAS)) },
    { forras: lerakasTetel, mennyiseg: m2 },
    { forras: tetel('AN-210'), mennyiseg: fm },
    { forras: tetel('MU-120'), mennyiseg: fm },
    { forras: tetel('SZ-310'), mennyiseg: 1 },
  ];

  return sorok.map((s, i) => ({
    termek_id: s.forras.id ?? null,
    cikkszam: s.forras.cikkszam,
    megnevezes: s.forras.nev,
    mennyiseg: s.mennyiseg,
    mertekegyseg: s.forras.mertekegyseg,
    // A kiadáskori ár másolata: az árlista későbbi módosítása nem írhatja át
    // egy már kiadott ajánlat összegét.
    egysegar: s.forras.eladasi_ar,
    afa_kulcs: s.forras.afa_kulcs ?? AFA_KULCS,
    netto: forintra(s.mennyiseg * s.forras.eladasi_ar),
    sorrend: i,
  }));
}

/**
 * Összesítés. A kedvezmény a nettó végösszegre vonatkozik, nem tételenként —
 * így a tételsorok a listaárat mutatják, és látszik, mennyit engedtünk.
 */
export function osszesites(tetelek, { kedvezmenySzazalek = 0, afaKulcs = AFA_KULCS } = {}) {
  if (!Array.isArray(tetelek) || !tetelek.length) throw new Error('Nincs tétel.');
  if (kedvezmenySzazalek < 0 || kedvezmenySzazalek >= 100) {
    throw new Error('A kedvezmény 0 és 100 százalék között lehet.');
  }

  const listaar = tetelek.reduce((s, t) => s + t.netto, 0);
  const netto = forintra(listaar * (1 - kedvezmenySzazalek / 100));
  const afa = forintra(netto * (afaKulcs / 100));

  return {
    listaar,
    kedvezmeny: listaar - netto,
    netto,
    afa,
    // A bruttó a nettóból számol, nem a nettó és az áfa összegéből — így nem
    // csúszhat el egy forintot a kerekítés miatt.
    brutto: forintra(netto * (1 + afaKulcs / 100)),
  };
}

/**
 * A „Amit feltételeztem — ellenőrizd" sáv tartalma.
 *
 * Ugyanabból a számításból származik, mint az összeg, ezért nem tud
 * eltérni attól, ami ténylegesen történt. Ez a bizalom alapja: a felhasználó
 * nem azt látja, hogy „kész", hanem azt, hogy mit feltételeztünk helyette.
 */
export function feltetelezesek({ m2, kotes = 'normal', anyag = 'szurke', kedvezmenySzazalek = 0, partnerNev }) {
  const fm = keruletBecsles(m2);
  const hu = new Intl.NumberFormat('hu-HU');
  const lista = [
    `${hu.format(m2)} m² burkolandó felület, ${anyag === 'antik' ? 'antik' : 'szürke'}, ` +
      `${kotes === 'mintas' ? 'mintás/díszkötésű' : 'normál kötésű'} 6 cm-es térkővel.`,
    `${fm} fm szegélyt számoltam, közel négyzetes területet feltételezve. ` +
      `Ha hosszúkás a terület, ez több lesz.`,
    `${Math.round(VAGASI_RAHAGYAS * 100)}% vágási ráhagyás az anyagnál.`,
    `Nem tartalmaz bontást, földmunkát és sittelszállítást — ha kell, mondd, és beteszem.`,
  ];
  if (kedvezmenySzazalek > 0) {
    lista.push(
      `${kedvezmenySzazalek}% törzsvevői kedvezményt alkalmaztam` +
        (partnerNev ? ` ${partnerNev} adatlapja alapján.` : '.')
    );
  }
  return lista;
}

/**
 * Teljes ajánlat egy lépésben. Ezt hívja az AI-réteg `ajanlat_keszites`
 * eszköze — a modell csak a paramétereket adja, a szám innen jön.
 */
export function ajanlatKeszites({ m2, kotes, anyag, arlista, kedvezmenySzazalek = 0, partnerNev }) {
  const tetelek = terkovezesTetelek({ m2, kotes, anyag, arlista });
  const osszeg = osszesites(tetelek, { kedvezmenySzazalek });
  return {
    tetelek,
    ...osszeg,
    fm: keruletBecsles(m2),
    feltetelezesek: feltetelezesek({ m2, kotes, anyag, kedvezmenySzazalek, partnerNev }),
  };
}
