"use server";

import { revalidatePath } from "next/cache";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";

export type CegprofilAllapot = { hiba?: string; siker?: boolean };

export async function cegprofilMentese(
  _elozo: CegprofilAllapot,
  adat: FormData,
): Promise<CegprofilAllapot> {
  const { ceg } = await sajatCegVagyIranyitas();
  if (!ceg) return { hiba: "Nem található a céged." };

  const supabase = await szerverKliens();

  const nev = String(adat.get("nev") ?? "").trim();
  if (!nev) return { hiba: "A cégnév kötelező." };

  const { error } = await supabase
    .from("cegek")
    .update({
      nev,
      adoszam: String(adat.get("adoszam") ?? "").trim() || null,
      cim: String(adat.get("cim") ?? "").trim() || null,
      bankszamla: String(adat.get("bankszamla") ?? "").trim() || null,
      email: String(adat.get("email") ?? "").trim() || null,
      telefon: String(adat.get("telefon") ?? "").trim() || null,
    })
    .eq("id", ceg.id);

  if (error) return { hiba: error.message };

  revalidatePath("/cegprofil");
  revalidatePath("/");
  return { siker: true };
}
