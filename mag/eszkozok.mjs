/**
 * CÉGEM.AI — az AI-réteg eszközkészlete.
 *
 * A fejlesztői specifikáció 6.2 fejezete szerint: „Ne »chatbotot« építs,
 * ami mellékesen elér adatokat — építs eszközkészletet, és az asszisztens
 * ezeket hívja." Ez a fájl az eszközök szerződése — kódban, nem csak
 * dokumentumban —, hogy amikor egy valódi modellhívás bekerül (1. vagy
 * 2. réteg), ugyanezt a zárt sémát kapja, és a jóváhagyást igénylő
 * eszközök listája egyetlen helyről derüljön ki, ne szét legyen szórva
 * a hívó kódban.
 *
 * A modul maga nem hív adatbázist és nem ismeri a Supabase-t — pusztán a
 * szerződést írja le, és azt a szabályt, hogy egy javasolt művelet mikor
 * léphet át egy másik állapotba. Ez utóbbi pontosan ugyanaz a szabály,
 * mint amit a `db/migraciok/0001_alap.sql` triggere kényszerít ki az
 * adatbázisban — itt alkalmazás-oldalon, hogy egy hibás hívás ne is
 * jusson el az adatbázisig, csak érthető hibaüzenettel álljon meg.
 */

/** A `javasolt_muveletek.allapot` enum — ugyanaz, mint az 0001 migrációban. */
export const MUVELET_ALLAPOTOK = ['javasolt', 'jovahagyott', 'vegrehajtott', 'kihagyott', 'elvetett'];

/** A `javasolt_muveletek.tipus` enum — ugyanaz, mint az 0001 migrációban. */
export const MUVELET_TIPUSOK = ['ajanlat_kikuldes', 'emlekezteto', 'email', 'utalasi_javaslat'];

/**
 * Az eszközkészlet — a fejlesztői specifikáció 6.2 fejezetének listája.
 *
 * `igenyelJovahagyast: true` azt jelenti, hogy az eszköz nem futtathatja
 * le közvetlenül a külső hatású műveletet: előbb egy `javasolt_muveletek`
 * sort kell létrehoznia (`javasolt` állapotban), és csak egy KÜLÖN,
 * emberi jóváhagyás után léphet tovább `vegrehajtott`-ba.
 */
export const ESZKOZOK = [
  {
    nev: 'partner_kereses',
    leiras: 'Partner keresése név vagy adószám alapján.',
    igenyelJovahagyast: false,
    bemenetSchema: {
      type: 'object',
      properties: {
        nev: { type: 'string' },
        adoszam: { type: 'string' },
      },
      anyOf: [{ required: ['nev'] }, { required: ['adoszam'] }],
    },
  },
  {
    nev: 'partner_adatlap',
    leiras: 'Egy partner adatlapjának lekérdezése azonosító alapján.',
    igenyelJovahagyast: false,
    bemenetSchema: {
      type: 'object',
      properties: { partner_id: { type: 'string', format: 'uuid' } },
      required: ['partner_id'],
    },
  },
  {
    nev: 'szamla_lista',
    leiras: 'Számlák listázása irány és állapot szerint, szűrhető partnerre és határidőre.',
    igenyelJovahagyast: false,
    bemenetSchema: {
      type: 'object',
      properties: {
        irany: { enum: ['kimeno', 'bejovo'] },
        statusz: { enum: ['nyitott', 'fizetve', 'sztornozott'] },
        partner_id: { type: 'string', format: 'uuid' },
        hatarido_elott: { type: 'string', format: 'date' },
      },
      required: ['irany'],
    },
  },
  {
    nev: 'arlista_lekerdezes',
    leiras: 'A cég saját árlistájának lekérdezése, opcionális kereséssel.',
    igenyelJovahagyast: false,
    bemenetSchema: {
      type: 'object',
      properties: { kereses: { type: 'string' } },
    },
  },
  {
    nev: 'ajanlat_keszites',
    leiras: 'Ajánlat összeállítása tételekből — az eredmény piszkozat állapotú ajánlat, nem kerül ki.',
    igenyelJovahagyast: false,
    bemenetSchema: {
      type: 'object',
      properties: {
        partner_id: { type: 'string', format: 'uuid' },
        tetelek: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              termek_id: { type: 'string', format: 'uuid' },
              mennyiseg: { type: 'number', exclusiveMinimum: 0 },
            },
            required: ['termek_id', 'mennyiseg'],
          },
          minItems: 1,
        },
        kedvezmeny: { type: 'number', minimum: 0, maximum: 99 },
      },
      required: ['partner_id', 'tetelek'],
    },
  },
  {
    nev: 'ajanlat_kikuldes',
    leiras: 'Egy piszkozat ajánlat kiküldése az ügyfélnek.',
    igenyelJovahagyast: true,
    muveletTipus: 'ajanlat_kikuldes',
    bemenetSchema: {
      type: 'object',
      properties: { ajanlat_id: { type: 'string', format: 'uuid' } },
      required: ['ajanlat_id'],
    },
  },
  {
    nev: 'feladat_letrehozas',
    leiras: 'Teendő felvétele, opcionálisan egy partnerhez kötve.',
    igenyelJovahagyast: false,
    bemenetSchema: {
      type: 'object',
      properties: {
        cim: { type: 'string' },
        hatarido: { type: 'string', format: 'date' },
        partner_id: { type: 'string', format: 'uuid' },
      },
      required: ['cim'],
    },
  },
  {
    nev: 'emlekezteto_tervezet',
    leiras: 'Fizetési emlékeztető szövegének elkészítése egy nyitott számlához — még nem megy ki.',
    igenyelJovahagyast: false,
    bemenetSchema: {
      type: 'object',
      properties: {
        partner_id: { type: 'string', format: 'uuid' },
        szamla_id: { type: 'string', format: 'uuid' },
      },
      required: ['partner_id', 'szamla_id'],
    },
  },
  {
    nev: 'emlekezteto_kuldes',
    leiras: 'Egy elkészített emlékeztető-tervezet tényleges kiküldése.',
    igenyelJovahagyast: true,
    muveletTipus: 'emlekezteto',
    bemenetSchema: {
      type: 'object',
      properties: { tervezet_id: { type: 'string', format: 'uuid' } },
      required: ['tervezet_id'],
    },
  },
  {
    nev: 'dokumentum_kiolvasas',
    leiras: 'Feltöltött dokumentum (pl. számlafotó) adatainak kiolvasása — a bizonytalan mezők megjelölésével. Nem a jóváhagyási kapun megy át, hanem a felhasználó soronként erősíti meg (5. sarkalatos szabály).',
    igenyelJovahagyast: false,
    bemenetSchema: {
      type: 'object',
      properties: { fajl_id: { type: 'string', format: 'uuid' } },
      required: ['fajl_id'],
    },
  },
  {
    nev: 'napi_osszefoglalo',
    leiras: 'A napi összefoglaló lekérdezése — naponta egyszer generálva és tárolva, nem képernyő-megnyitásonként (6.3 költségszabály).',
    igenyelJovahagyast: false,
    bemenetSchema: { type: 'object', properties: {} },
  },
];

/** Az eszköz definíciója névvel — hibát dob, ha nincs ilyen eszköz. */
export function eszkozLekeres(nev) {
  const eszkoz = ESZKOZOK.find((e) => e.nev === nev);
  if (!eszkoz) throw new Error(`Ismeretlen eszköz: „${nev}".`);
  return eszkoz;
}

/** Igényel-e jóváhagyást a megnevezett eszköz. */
export function eszkozIgenyelJovahagyast(nev) {
  return eszkozLekeres(nev).igenyelJovahagyast;
}

/**
 * A jóváhagyási kapu állapotgépe — pontosan az a szabály, amit a
 * `javasolt_muveletek_atmenet` trigger kényszerít ki az adatbázisban:
 *
 *   javasolt ──► jovahagyott ──► vegrehajtott
 *       │              │
 *       ├──► kihagyott └──► elvetett
 *       └──► elvetett
 *
 * Itt, alkalmazás-oldalon ismételve azért van, hogy egy hibás hívás már
 * a szerver kódjában elakadjon, ne csak egy adatbázis-hibaüzenetben —
 * de a valódi kikényszerítés mindig az adatbázisé marad.
 */
const ENGEDELYEZETT_ATMENETEK = {
  javasolt: ['jovahagyott', 'kihagyott', 'elvetett'],
  jovahagyott: ['vegrehajtott', 'elvetett'],
  vegrehajtott: [],
  kihagyott: [],
  elvetett: [],
};

export function allapotatmenetErvenyesE(regiAllapot, ujAllapot) {
  if (!MUVELET_ALLAPOTOK.includes(regiAllapot) || !MUVELET_ALLAPOTOK.includes(ujAllapot)) {
    throw new Error(`Ismeretlen művelet-állapot: ${regiAllapot} vagy ${ujAllapot}.`);
  }
  return ENGEDELYEZETT_ATMENETEK[regiAllapot].includes(ujAllapot);
}
