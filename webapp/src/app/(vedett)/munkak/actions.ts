"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import type { Enums } from "@/lib/supabase/types";

export type MunkaAllapot = { hiba?: string };

function munkaAdatokFormbol(adat: FormData) {
  return {
    partner_id: String(adat.get("partner_id") ?? "") || null,
    cim: String(adat.get("cim") ?? "").trim(),
    leiras: String(adat.get("leiras") ?? "").trim() || null,
    hatarido: String(adat.get("hatarido") ?? "").trim() || null,
  };
}

export async function munkaLetrehozasa(
  _elozo: MunkaAllapot,
  adat: FormData,
): Promise<MunkaAllapot> {
  const mezok = munkaAdatokFormbol(adat);
  if (!mezok.cim) return { hiba: "A helyszín (cím) kötelező." };

  const supabase = await szerverKliens();
  const { error } = await supabase.from("munkak").insert(mezok);
  if (error) return { hiba: error.message };

  revalidatePath("/munkak");
  revalidatePath("/");
  redirect("/munkak");
}

export async function munkaFrissitese(
  id: string,
  _elozo: MunkaAllapot,
  adat: FormData,
): Promise<MunkaAllapot> {
  const mezok = munkaAdatokFormbol(adat);
  if (!mezok.cim) return { hiba: "A helyszín (cím) kötelező." };

  const supabase = await szerverKliens();
  const { error } = await supabase.from("munkak").update(mezok).eq("id", id);
  if (error) return { hiba: error.message };

  revalidatePath("/munkak");
  revalidatePath(`/munkak/${id}`);
  redirect(`/munkak/${id}`);
}

export async function munkaAllapotValtas(
  id: string,
  ujAllapot: Enums<"munka_allapot">,
) {
  const supabase = await szerverKliens();
  await supabase.from("munkak").update({ allapot: ujAllapot }).eq("id", id);
  revalidatePath(`/munkak/${id}`);
  revalidatePath("/munkak");
  revalidatePath("/");
}

export type FotoAllapot = { hiba?: string; siker?: boolean };

/**
 * Munka-fotódokumentáció feltöltése — a HANDOVER 8.1-ben még hiányzóként
 * jelölt terepi funkció a valódi backendben. A `munka-fotok` bucket
 * PRIVÁT (lásd db/migraciok/0015_munka_fotok.sql), ezért a megjelenítés
 * mindig aláírt URL-en megy (lásd `alairtFotoUrlek` lent), sosem publikus
 * linken — ellentétben a cég logójával, egy munkahelyszín fotója valós
 * ügyféladat.
 */
export async function fotoFeltoltese(
  munkaId: string,
  _elozo: FotoAllapot,
  adat: FormData,
): Promise<FotoAllapot> {
  const { ceg, felhasznalo } = await sajatCegVagyIranyitas();
  if (!ceg) return { hiba: "Nem található a céged." };

  const fajl = adat.get("foto");
  if (!(fajl instanceof File) || fajl.size === 0) return { hiba: "Válassz egy fotót." };
  if (!fajl.type.startsWith("image/")) return { hiba: "Csak képfájl tölthető fel." };
  if (fajl.size > 10 * 1024 * 1024) return { hiba: "A fotó legfeljebb 10 MB lehet." };

  const supabase = await szerverKliens();
  const kiterjesztes = fajl.name.includes(".") ? fajl.name.split(".").pop() : "jpg";
  const utvonal = `${ceg.id}/${munkaId}/${crypto.randomUUID()}.${kiterjesztes}`;

  const { error: feltoltesHiba } = await supabase.storage
    .from("munka-fotok")
    .upload(utvonal, fajl, { contentType: fajl.type });
  if (feltoltesHiba) return { hiba: feltoltesHiba.message };

  const { error: mentesHiba } = await supabase.from("munka_fotok").insert({
    munka_id: munkaId,
    storage_utvonal: utvonal,
    feltoltotte_id: felhasznalo.id,
  });
  if (mentesHiba) {
    // A tábla-sor nélkül a fotó árva maradna — inkább töröljük vissza a
    // már feltöltött fájlt is, mint hogy csendben félkész állapotot hagyjunk.
    await supabase.storage.from("munka-fotok").remove([utvonal]);
    return { hiba: mentesHiba.message };
  }

  revalidatePath(`/munkak/${munkaId}`);
  return { siker: true };
}

export async function fotoTorlese(fotoId: string, storageUtvonal: string, munkaId: string) {
  const supabase = await szerverKliens();
  await supabase.storage.from("munka-fotok").remove([storageUtvonal]);
  await supabase.from("munka_fotok").delete().eq("id", fotoId);
  revalidatePath(`/munkak/${munkaId}`);
}
