/**
 * 0. RÉTEG — determinisztikus parancsfelismerő.
 *
 * A legolcsóbb AI az, amit el sem kell indítani. Ez a réteg mintaillesztéssel
 * dönt: nincs hálózati hívás, nincs token, nincs késleltetés. Amit felismer,
 * az ingyen van; amit nem, az megy tovább az 1. rétegre (olcsó modell).
 *
 * A `route()` visszaadja a szándékot és a kinyert adatokat, vagy null-t, ha
 * nem elég biztos benne. Bizonytalanság esetén NEM találgat — továbbadja.
 */

export const norm = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* A partnerlista a cég adatbázisából jön; itt a prototípus mintaadatai. */
export const PARTNEREK = [
  { id: 'kovacs', mintak: ['kovacs'] },
  { id: 'szabo', mintak: ['szabo'] },
  { id: 'nagy', mintak: ['nagy csalad', 'nagyek', 'nagy '] },
  { id: 'baumax', mintak: ['baumax', 'bau max'] },
  { id: 'zold', mintak: ['zold kert', 'zold'] },
];

/* Kimondott magyar számnevek. A hangfelismerő hol számjegyet ad vissza,
   hol betűvel írja ki — mindkettőt kezelni kell. */
const EGYESEK = { egy: 1, ket: 2, ketto: 2, harom: 3, negy: 4, ot: 5, hat: 6, het: 7, nyolc: 8, kilenc: 9 };
const TIZESEK = { tiz: 10, husz: 20, harminc: 30, negyven: 40, otven: 50, hatvan: 60, hetven: 70, nyolcvan: 80, kilencven: 90 };

export function szamKinyeres(szoveg) {
  const t = norm(szoveg);

  // 1. Számjeggyel írva, mértékegység mellett: "800 nm", "120 négyzetméter"
  const szamjegy = t.match(/(\d[\d\s.]*)\s*(negyzetmeter|negyzetre|negyzet|nm|m2|m²|folyometer|fm|meter)/);
  if (szamjegy) return String(parseInt(szamjegy[1].replace(/[\s.]/g, ''), 10));

  // 2. Betűvel kimondva: "nyolcszáz négyzetre", "kilencven méter"
  const betuvel = t.match(
    /((?:egy|ket|ketto|harom|negy|ot|hat|het|nyolc|kilenc)?(?:szaz)?(?:tiz|husz|harminc|negyven|otven|hatvan|hetven|nyolcvan|kilencven)?(?:egy|ket|kettő|harom|negy|ot|hat|het|nyolc|kilenc)?)\s*(negyzetmeter|negyzetre|negyzet|nm|m2|meter|folyometer)/
  );
  if (betuvel && betuvel[1]) {
    const ertek = szamnevErtek(betuvel[1]);
    if (ertek) return String(ertek);
  }

  // 3. Csupasz szám a mondatban, ha egyértelmű (pontosan egy szerepel)
  const csupasz = t.match(/\b(\d{2,5})\b/g);
  if (csupasz && csupasz.length === 1) return csupasz[0];

  return null;
}

function szamnevErtek(sz) {
  let maradek = sz;
  let ertek = 0;
  const szazIdx = maradek.indexOf('szaz');
  if (szazIdx >= 0) {
    const elotte = maradek.slice(0, szazIdx);
    ertek += (EGYESEK[elotte] || 1) * 100;
    maradek = maradek.slice(szazIdx + 4);
  }
  for (const [nev, v] of Object.entries(TIZESEK)) {
    if (maradek.startsWith(nev)) { ertek += v; maradek = maradek.slice(nev.length); break; }
  }
  if (EGYESEK[maradek]) ertek += EGYESEK[maradek];
  return ertek || null;
}

export function partnerKinyeres(szoveg) {
  const t = norm(szoveg);
  for (const p of PARTNEREK) if (p.mintak.some((m) => t.includes(m))) return p.id;
  return null;
}

const HATARIDOK = [
  [/jovo kedd/, 'jovo kedd'],
  [/jovo het/, 'jovo het'],
  [/holnap/, 'holnap'],
  [/hetfo/, 'hetfore'],
  [/kedde?n/, 'kedden'],
  [/szerda/, 'szerdan'],
  [/csutortok/, 'csutortokon'],
  [/pentek/, 'penteken'],
  [/ma /, 'ma'],
];

export function hataridoKinyeres(szoveg) {
  const t = norm(szoveg) + ' ';
  for (const [re, cimke] of HATARIDOK) if (re.test(t)) return cimke;
  return null;
}

/*
 * A szándékminták. Sorrend számít: az elsőként illeszkedő nyer, ezért a
 * szűkebb minta van elöl. Minden ág megmondja, milyen adat kell hozzá —
 * ha az hiányzik, a router visszakérdez ahelyett, hogy találgatna.
 */
const SZANDEKOK = [
  { id: 'agent',        re: /(intezd el|intezz el|csinald meg helyettem|surgos dolgaim|vegyuk sorra|mindent amit lehet)/ },
  // Ha a mondat konkrét partnert nevez meg, az erősebb jel, mint az általános
  // „hogy állunk” — ezért ez az ág megelőzi az összefoglalót.
  { id: 'partner',      re: /(mutasd|nyisd meg|nezzuk|hogy allunk a|mi a helyzet a|mennyivel tartozik|hozd fel)/,
    csak_ha: (a) => !!a.partner, kell: ['partner'] },
  { id: 'ajanlat',      re: /(ajanlat|arajanlat|adj arat|kalkulalj)/, kell: ['partner', 'mennyiseg'] },
  { id: 'anyagszukseglet', re: /(mennyi anyag|hany raklap|mennyi zuzottko|mennyi homok|anyagszukseglet|mennyi ko kell)/, kell: ['mennyiseg'] },
  { id: 'szamla_rogzites', re: /(fotozok egy szamlat|fotozom a szamlat|toltsd fel.*szamla|szallitoi szamla|bejovo szamlat rogzits|rogzitsd|beolvasnad|olvasd be|szkenneld)/ },
  { id: 'felszolitas',  re: /(felszolit|fizetesi emlek|szolj ra.*szamla|hogy fizessen|emlekeztetot.*hogy fizessen)/, kell: ['partner'] },
  { id: 'feladat',      re: /(emlekeztess|emlekezteto|jegyezd fel|ird fel|vegyel fel egy feladat|allits be|rogzits egy teendo|ne hagyd hogy elfelejtsem|ne felejtsem)/, kell: ['hatarido'] },
  { id: 'lejart',       re: /(lejart|kintlevo|kinnlevo|ki tartozik nekem|nem fizettek|nem fizetett|hatralek|penz all kint)/ },
  { id: 'fizetendo',    re: /(mennyit kell kifizet|mit kell utalni|utalni|bejovo szaml|kinek tartozom|mennyit fizetunk)/ },
  { id: 'teendo',       re: /(mai teendo|mi a dolgom|teendoim|mi van ma|mai feladat|napirend|mit kell ma)/ },
  { id: 'osszefoglalo', re: /(helyzet a cegemben|hogy allunk|foglald ossze|osszefoglal|hogy all a ceg|mi ujsag|vezetoi)/ },
  { id: 'arlista',      re: /(arlista|mennyibe kerul|mi az ara|listaar|mennyiert adom|mi a listaar)/ },
  { id: 'szerzodes',    re: /(szerzodes|kotber|mi a lenyeg|nezd at|elemezd|dokumentum)/ },
  // Partnernév nélküli megnyitási kérés: a szándék megvan, a partner hiányzik —
  // ilyenkor visszakérdezünk, nem találgatunk.
  { id: 'partner',      re: /(mutasd a|nyisd meg|hozd fel).*(kft|zrt|bt|ceg|partner|adatlap)/, kell: ['partner'] },
];

/**
 * @returns {{szandek: string, adatok: object, reteg: 0, hianyzik?: string[]} | null}
 *   null = nem ismerte fel, mehet az 1. rétegre.
 */
export function route(szoveg) {
  const t = norm(szoveg);
  if (!t.trim()) return null;

  const adatok = {};
  const partner = partnerKinyeres(szoveg);
  const mennyiseg = szamKinyeres(szoveg);
  const hatarido = hataridoKinyeres(szoveg);
  if (partner) adatok.partner = partner;
  if (mennyiseg) adatok.mennyiseg = mennyiseg;
  if (hatarido) adatok.hatarido = hatarido;

  for (const sz of SZANDEKOK) {
    if (!sz.re.test(t)) continue;
    if (sz.csak_ha && !sz.csak_ha(adatok)) continue;

    const hianyzik = (sz.kell || []).filter((k) => !adatok[k]);
    return { szandek: sz.id, adatok, reteg: 0, ...(hianyzik.length ? { hianyzik } : {}) };
  }
  return null;
}
