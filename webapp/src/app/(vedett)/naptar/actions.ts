"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { budapestIdopontIso } from "@/lib/het";

export type EsemenyAllapot = { hiba?: string };

type EsemenyMezokVagyHiba =
  | { hiba: string }
  | { cim: string; kezdet: string; veg: string | null; munka_id: string | null };

function esemenyMezokFormbol(adat: FormData): EsemenyMezokVagyHiba {
  const cim = String(adat.get("cim") ?? "").trim();
  if (!cim) return { hiba: "A cím kötelező." };

  const kezdetDatum = String(adat.get("kezdet_datum") ?? "");
  const kezdetIdo = String(adat.get("kezdet_ido") ?? "");
  if (!kezdetDatum || !kezdetIdo) return { hiba: "A kezdés dátuma és ideje kötelező." };

  const vegDatum = String(adat.get("veg_datum") ?? "");
  const vegIdo = String(adat.get("veg_ido") ?? "");
  const munkaId = String(adat.get("munka_id") ?? "") || null;

  const kezdet = budapestIdopontIso(kezdetDatum, kezdetIdo);
  const veg = vegDatum && vegIdo ? budapestIdopontIso(vegDatum, vegIdo) : null;
  if (veg && veg <= kezdet) {
    return { hiba: "A befejezés csak a kezdés után lehet." };
  }

  return { cim, kezdet, veg, munka_id: munkaId };
}

export async function esemenyLetrehozasa(
  _elozo: EsemenyAllapot,
  adat: FormData,
): Promise<EsemenyAllapot> {
  const mezok = esemenyMezokFormbol(adat);
  if ("hiba" in mezok) return mezok;

  const supabase = await szerverKliens();
  const { error } = await supabase.from("naptar_esemenyek").insert(mezok);
  if (error) return { hiba: error.message };

  revalidatePath("/naptar");
  if (mezok.munka_id) revalidatePath(`/munkak/${mezok.munka_id}`);
  redirect("/naptar");
}

export async function esemenyFrissitese(
  id: string,
  _elozo: EsemenyAllapot,
  adat: FormData,
): Promise<EsemenyAllapot> {
  const mezok = esemenyMezokFormbol(adat);
  if ("hiba" in mezok) return mezok;

  const supabase = await szerverKliens();
  const { error } = await supabase.from("naptar_esemenyek").update(mezok).eq("id", id);
  if (error) return { hiba: error.message };

  revalidatePath("/naptar");
  revalidatePath(`/naptar/${id}`);
  if (mezok.munka_id) revalidatePath(`/munkak/${mezok.munka_id}`);
  redirect("/naptar");
}

export async function esemenyTorlese(id: string) {
  const supabase = await szerverKliens();
  const { data: esemeny } = await supabase
    .from("naptar_esemenyek")
    .select("munka_id")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("naptar_esemenyek").delete().eq("id", id);
  revalidatePath("/naptar");
  if (esemeny?.munka_id) revalidatePath(`/munkak/${esemeny.munka_id}`);
}
