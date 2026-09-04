import { norm } from "./szandek";

/**
 * Ékezet- és kisbetű-független listaszűrés — ugyanaz a `norm()`, amit az
 * AI-doboz szándékfelismerője használ, így "kovacs" megtalálja a "Kovács
 * Építő Kft."-t, ahogy a parancsokban is. Szándékosan a szerver oldalon,
 * az RLS-szel már cégre szűrt lista fölött, JS-ben: egy kisvállalkozás
 * listái tíz-száz elemesek, ehhez nem kell adatbázis-szintű keresés, és
 * így a beágyazott mezőkre (pl. ajánlat partnerének neve) is ugyanaz az
 * egyszerű szabály érvényes.
 */
export function keresoSzo(ertek: string | string[] | undefined): string {
  return (typeof ertek === "string" ? ertek : "").trim();
}

export function illeszkedik(q: string, ...mezok: (string | number | null | undefined)[]): boolean {
  const cel = norm(q);
  if (!cel) return true;
  return mezok.some((m) => m != null && norm(String(m)).includes(cel));
}
