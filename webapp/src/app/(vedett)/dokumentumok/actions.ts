"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";

export type DokumentumAllapot = { hiba?: string };

export async function dokumentumRogzitese(
  _elozo: DokumentumAllapot,
  adat: FormData,
): Promise<DokumentumAllapot> {
  const tipus = String(adat.get("tipus") ?? "").trim();
  const fajlUrl = String(adat.get("fajl_url") ?? "").trim();
  const eredetiNev = String(adat.get("eredeti_nev") ?? "").trim() || null;

  if (!tipus) return { hiba: "A dokumentum típusa kötelező." };
  if (!fajlUrl) return { hiba: "A fájl linkje kötelező." };

  const { felhasznalo } = await sajatCegVagyIranyitas();
  const supabase = await szerverKliens();
  const { error } = await supabase.from("dokumentumok").insert({
    tipus,
    fajl_url: fajlUrl,
    eredeti_nev: eredetiNev,
    feltoltotte_id: felhasznalo.id,
  });
  if (error) return { hiba: error.message };

  revalidatePath("/dokumentumok");
  redirect("/dokumentumok");
}

export async function dokumentumTorlese(id: string) {
  const supabase = await szerverKliens();
  await supabase.from("dokumentumok").delete().eq("id", id);
  revalidatePath("/dokumentumok");
}
