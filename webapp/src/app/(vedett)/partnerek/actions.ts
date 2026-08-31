"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";

export type PartnerAllapot = { hiba?: string };

function partnerAdatokFormbol(adat: FormData) {
  return {
    nev: String(adat.get("nev") ?? "").trim(),
    adoszam: String(adat.get("adoszam") ?? "").trim() || null,
    cim: String(adat.get("cim") ?? "").trim() || null,
    kapcsolattarto: String(adat.get("kapcsolattarto") ?? "").trim() || null,
    email: String(adat.get("email") ?? "").trim() || null,
    telefon: String(adat.get("telefon") ?? "").trim() || null,
    fizetesi_hatarido_nap: Number(adat.get("fizetesi_hatarido_nap") ?? 15) || 15,
    kedvezmeny_szazalek: Number(adat.get("kedvezmeny_szazalek") ?? 0) || 0,
    szallito: adat.get("szallito") === "on",
    megjegyzes: String(adat.get("megjegyzes") ?? "").trim() || null,
  };
}

export async function partnerLetrehozasa(
  _elozo: PartnerAllapot,
  adat: FormData,
): Promise<PartnerAllapot> {
  const mezok = partnerAdatokFormbol(adat);
  if (!mezok.nev) return { hiba: "A név kötelező." };

  const supabase = await szerverKliens();
  const { error } = await supabase.from("partnerek").insert(mezok);
  if (error) return { hiba: error.message };

  revalidatePath("/partnerek");
  redirect("/partnerek");
}

export async function partnerFrissitese(
  id: string,
  _elozo: PartnerAllapot,
  adat: FormData,
): Promise<PartnerAllapot> {
  const mezok = partnerAdatokFormbol(adat);
  if (!mezok.nev) return { hiba: "A név kötelező." };

  const supabase = await szerverKliens();
  const { error } = await supabase.from("partnerek").update(mezok).eq("id", id);
  if (error) return { hiba: error.message };

  revalidatePath("/partnerek");
  redirect("/partnerek");
}

export async function partnerArchivalasa(id: string) {
  const supabase = await szerverKliens();
  await supabase.from("partnerek").update({ archivalt: true }).eq("id", id);
  revalidatePath("/partnerek");
}
