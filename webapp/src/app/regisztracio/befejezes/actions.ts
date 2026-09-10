"use server";

import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";

export type BefejezesAllapot = { hiba?: string };

/**
 * A `sajat_ceg_letrehozasa` RPC dönt (0022): ha az e-mailre meghívás vár,
 * ahhoz a céghez köt (a cégnév ilyenkor érdektelen); különben új céget hoz
 * létre, és a cégnév kötelező — ezt az RPC maga ellenőrzi.
 */
export async function ceglétrehozasBefejezese(
  _elozo: BefejezesAllapot,
  adat: FormData,
): Promise<BefejezesAllapot> {
  const cegNev = String(adat.get("ceg_nev") ?? "").trim();
  const sajatNev = String(adat.get("sajat_nev") ?? "").trim();

  const supabase = await szerverKliens();
  const { error } = await supabase.rpc("sajat_ceg_letrehozasa", {
    p_ceg_nev: cegNev,
    p_felhasznalo_nev: sajatNev,
  });

  if (error) {
    return {
      hiba:
        error.code === "23505"
          ? "Ehhez a fiókhoz már tartozik cég — próbálj bejelentkezni."
          : error.code === "23514"
            ? "A cégnév kötelező."
            : error.code === "42501"
              ? error.message
              : "A cég létrehozása sikertelen. Próbáld újra, és ha ismétlődik, jelezd nekünk.",
    };
  }

  redirect("/");
}
