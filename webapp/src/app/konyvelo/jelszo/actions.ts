"use server";

import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";

export type JelszoAllapot = { hiba?: string };

export async function jelszoBeallitasa(
  _elozo: JelszoAllapot,
  adat: FormData,
): Promise<JelszoAllapot> {
  const jelszo = String(adat.get("jelszo") ?? "");
  const nev = String(adat.get("nev") ?? "").trim();

  if (jelszo.length < 8) return { hiba: "A jelszó legalább 8 karakter legyen." };
  if (!nev) return { hiba: "A neved megadása kötelező." };

  const supabase = await szerverKliens();

  const { error: jelszoHiba } = await supabase.auth.updateUser({ password: jelszo });
  if (jelszoHiba) return { hiba: jelszoHiba.message };

  const { error: nevHiba } = await supabase.rpc("sajat_nev_frissitese", { p_nev: nev });
  if (nevHiba) return { hiba: nevHiba.message };

  redirect("/konyvelo");
}
