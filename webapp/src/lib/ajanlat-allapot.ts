import type { Enums } from "./supabase/types";

/**
 * Az ajánlat "lejárt" állapota SZÁRMAZTATOTT, nem tárolt: egy kiküldött
 * ajánlat, aminek az érvényessége (`ervenyes_ig`) a mai nap előtt volt.
 * Így nincs szükség időzített feladatra vagy egy GET közbeni írásra —
 * a lista és a részletező ugyanabból a szabályból számol, és a "függő
 * ajánlat" számláló sem számolja bele. Piszkozat nem jár le: azt nem
 * küldtük ki, nincs mihez képest.
 */
export function ajanlatLejartE(
  a: { allapot: Enums<"ajanlat_allapot">; ervenyes_ig: string | null },
  ma: string,
): boolean {
  return a.allapot === "kikuldve" && !!a.ervenyes_ig && a.ervenyes_ig < ma;
}

export function megjelenoAllapot(
  a: { allapot: Enums<"ajanlat_allapot">; ervenyes_ig: string | null },
  ma: string,
): Enums<"ajanlat_allapot"> {
  return ajanlatLejartE(a, ma) ? "lejart" : a.allapot;
}
