/**
 * 1. RÉTEG — olcsó modell, szigorú sémával.
 *
 * Csak azt kapja meg, amit a 0. réteg nem tudott biztosan eldönteni.
 * A dolga kizárólag a megértés: melyik művelet ez, és milyen paraméterekkel.
 * SEMMIT nem számol és semmit nem hajt végre — a kalkuláció determinisztikus
 * kód marad, a végrehajtás pedig jóváhagyási kapun megy át.
 *
 * A séma zárt (`additionalProperties: false`, felsorolt szándékok), így a
 * modell nem tud kitalált műveletet visszaadni.
 */

export const SZANDEKOK = [
  'osszefoglalo',
  'teendo',
  'ajanlat',
  'lejart',
  'fizetendo',
  'feladat',
  'felszolitas',
  'partner',
  'arlista',
  'szerzodes',
  'agent',
  'szamla_rogzites',
  'anyagszukseglet',
  'ismeretlen',
];

export const SEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['szandek', 'partner', 'mennyiseg', 'hatarido', 'hianyzik', 'visszakerdezes'],
  properties: {
    szandek: { type: 'string', enum: SZANDEKOK },
    partner: { type: 'string', description: 'A megnevezett partner, ahogy elhangzott. Üres, ha nincs.' },
    mennyiseg: { type: 'string', description: 'Mennyiség számjeggyel, mértékegység nélkül. Üres, ha nincs.' },
    hatarido: { type: 'string', description: 'Az elhangzott időpont, ahogy mondták (pl. „jövő kedden”). Üres, ha nincs.' },
    hianyzik: {
      type: 'array',
      items: { type: 'string', enum: ['partner', 'mennyiseg', 'hatarido'] },
      description: 'Amit a művelet elindításához meg kellene kérdezni.',
    },
    visszakerdezes: {
      type: 'string',
      description: 'Egy rövid magyar kérdés a hiányzó adatra, vagy üres, ha minden megvan.',
    },
  },
};

export const UTASITAS = `Egy magyar építőipari kisvállalkozó mond egy parancsot a telefonjába.
A te dolgod egyetlen dolog: eldönteni, melyik műveletet kéri, és milyen adatokkal.

Szabályok:
- Csak a felsorolt szándékok közül válassz. Ha egyik sem illik rá, "ismeretlen".
- Semmit ne számolj ki és semmit ne találj ki. Ha egy adat nem hangzott el,
  hagyd üresen, és vedd fel a hianyzik listába.
- A mennyiség számjeggyel kerüljön vissza akkor is, ha kimondva hangzott el
  ("nyolcszáz négyzetméter" → "800").
- A beszélt nyelv pongyola: tegeződik, félbehagy, tájszólással beszél,
  a cégnevet röviden mondja ("Kovácsék", "a Zöldnél"). Ez normális.
- A visszakerdezes akkor kell, ha hiányzik valami: egyetlen rövid, konkrét
  magyar kérdés, amit a felhasználó egy szóval megválaszolhat.

A szándékok jelentése:
  osszefoglalo     — hogy áll a cég, mi a helyzet
  teendo           — mi a mai dolgom
  ajanlat          — árajánlat készítése (kell: partner, mennyiség)
  lejart           — ki tartozik nekem, kintlévőség
  fizetendo        — mit kell kifizetnem, bejövő számlák
  feladat          — emlékeztető, teendő rögzítése (kell: határidő)
  felszolitas      — fizetési felszólítás küldése (kell: partner)
  partner          — egy partner adatlapjának megnyitása (kell: partner)
  arlista          — mennyibe kerül valami, árlista
  szerzodes        — szerződés vagy dokumentum kivonata
  agent            — intézd el a mai ügyeket, végigvezetés
  szamla_rogzites  — bejövő számla fotózása, feltöltése
  anyagszukseglet  — mennyi anyag kell egy adott felülethez
  ismeretlen       — nem tartozik a rendszer feladatai közé`;
