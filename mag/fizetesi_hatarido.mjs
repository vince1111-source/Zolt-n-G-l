/**
 * CÉGEM.AI — fizetési határidő.
 *
 * Ugyanaz a szabály, mint az árkalkulációnál: amit ki lehet számolni,
 * azt ne a modell találja ki, és ne írja külön szöveg a prototípus sem.
 * A határidő a partner adatlapján rögzített napszámból (`partnerek.
 * fizetesi_hatarido_nap`) és a kiállítás dátumából adódik — egyetlen
 * forrás, amiből a számla, az ajánlat és a felület egyaránt olvas.
 */

const NAP_EZREDMASODPERCBEN = 24 * 60 * 60 * 1000;

/** ISO dátum (`YYYY-MM-DD`) → `Date`, éjfélre rögzítve UTC-ben. */
function datumma(iso) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Érvénytelen dátum: ${iso}`);
  return d;
}

/** `Date` → ISO dátum (`YYYY-MM-DD`). */
function isodatum(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * A fizetési határidő dátuma.
 *
 * @param {object} p
 * @param {string} p.kelt                  a kiállítás dátuma, ISO formátumban
 * @param {number} p.fizetesiHataridoNap    a partner adatlapjáról — hány nap
 * @returns {string} a határidő, ISO formátumban
 */
export function fizetesiHatarido({ kelt, fizetesiHataridoNap }) {
  if (!(fizetesiHataridoNap >= 0)) {
    throw new Error('A fizetési határidő napokban csak nemnegatív szám lehet.');
  }
  const napokEzredmasodpercben = fizetesiHataridoNap * NAP_EZREDMASODPERCBEN;
  return isodatum(new Date(datumma(kelt).getTime() + napokEzredmasodpercben));
}

/**
 * Hány nap telt el `kezdo` óta `ma`-ig. Negatív, ha `kezdo` a jövőben van.
 * Ugyanez adja meg, hány napja jár le egy határidő (`ma` - `hatarido`),
 * és hány nap múlva esedékes egy még nyitott tétel (`hatarido` - `ma`,
 * vagyis `napokEltelte(ma, hatarido)`).
 */
export function napokEltelte(kezdo, ma) {
  return Math.round((datumma(ma).getTime() - datumma(kezdo).getTime()) / NAP_EZREDMASODPERCBEN);
}

/** Lejárt-e a határidő `ma` napon — a lejárat napja maga még nem számít lejártnak. */
export function lejartE(hatarido, ma) {
  return napokEltelte(hatarido, ma) > 0;
}
