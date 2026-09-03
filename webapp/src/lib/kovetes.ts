/**
 * Utánkövetés — a vízió-dokumentum "Wow #6"-a: "Ezt az ajánlatot 4 napja
 * nem válaszolták meg → follow-up draft." Tiszta szövegsablon, nem küld
 * semmit (nincs e-mail-integráció) — csak felkínálja a szöveget
 * másolásra. A napok számítását a `mag/fizetesi_hatarido.mjs`
 * `napokEltelte`-je adja, ugyanaz a determinisztikus logika, amit a
 * fizetési határidőnél is használunk.
 */

export function kovetesSzoveg({
  partnerNev,
  sorszam,
  brutto,
  napok,
}: {
  partnerNev: string;
  sorszam: string;
  brutto: number;
  napok: number;
}): string {
  const hu = new Intl.NumberFormat("hu-HU");
  return `Kedves ${partnerNev}!\n\n${napok} napja küldtük ki a(z) ${sorszam} számú ajánlatunkat (${hu.format(brutto)} Ft). Szeretnénk megkérdezni, van-e még kérdése, vagy hogyan tudunk segíteni a döntésben?\n\nÜdvözlettel`;
}
