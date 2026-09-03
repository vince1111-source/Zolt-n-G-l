"use server";

import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";

export type BefejezesAllapot = { hiba?: string };

export async function ceglétrehozasBefejezese(
  _elozo: BefejezesAllapot,
  adat: FormData,
): Promise<BefejezesAllapot> {
  const cegNev = String(adat.get("ceg_nev") ?? "").trim();
  const sajatNev = String(adat.get("sajat_nev") ?? "").trim();

  if (!cegNev) return { hiba: "A cégnév kötelező." };

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
          : "A cég létrehozása sikertelen. Próbáld újra, és ha ismétlődik, jelezd nekünk.",
    };
  }

  redirect("/");
}
