"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";

export type FeladatAllapot = { hiba?: string };

export async function feladatLetrehozasa(
  _elozo: FeladatAllapot,
  adat: FormData,
): Promise<FeladatAllapot> {
  const cim = String(adat.get("cim") ?? "").trim();
  if (!cim) return { hiba: "A cím kötelező." };

  const partnerId = String(adat.get("partner_id") ?? "") || null;
  const hatarido = String(adat.get("hatarido") ?? "") || null;

  const supabase = await szerverKliens();
  const { error } = await supabase.from("feladatok").insert({
    cim,
    leiras: String(adat.get("leiras") ?? "").trim() || null,
    hatarido,
    surgos: adat.get("surgos") === "on",
    partner_id: partnerId,
    forras: "kezi",
  });

  if (error) return { hiba: error.message };

  revalidatePath("/feladatok");
  revalidatePath("/");
  redirect("/feladatok");
}

export async function feladatKeszre(id: string) {
  const supabase = await szerverKliens();
  await supabase.from("feladatok").update({ allapot: "kesz" }).eq("id", id);
  revalidatePath("/feladatok");
  revalidatePath("/");
}

export async function feladatTorlese(id: string) {
  const supabase = await szerverKliens();
  await supabase.from("feladatok").update({ allapot: "torolve" }).eq("id", id);
  revalidatePath("/feladatok");
  revalidatePath("/");
}
