"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types-helpers";

export type TermekAllapot = { hiba?: string };

function termekAdatokFormbol(adat: FormData) {
  return {
    nev: String(adat.get("nev") ?? "").trim(),
    cikkszam: String(adat.get("cikkszam") ?? "").trim() || null,
    mertekegyseg: String(adat.get("mertekegyseg") ?? "").trim(),
    beszerzesi_ar: Number(adat.get("beszerzesi_ar") ?? 0) || 0,
    eladasi_ar: Number(adat.get("eladasi_ar") ?? 0) || 0,
    afa_kulcs: Number(adat.get("afa_kulcs") ?? 27) || 27,
    kategoria: String(adat.get("kategoria") ?? "anyag") as Enums<"termek_kategoria">,
  };
}

export async function termekLetrehozasa(
  _elozo: TermekAllapot,
  adat: FormData,
): Promise<TermekAllapot> {
  const mezok = termekAdatokFormbol(adat);
  if (!mezok.nev) return { hiba: "A megnevezés kötelező." };
  if (!mezok.mertekegyseg) return { hiba: "A mennyiségi egység kötelező." };
  if (!(mezok.eladasi_ar > 0)) return { hiba: "Az eladási ár kötelező." };

  const supabase = await szerverKliens();
  const { error } = await supabase.from("termekek").insert(mezok);
  if (error) return { hiba: error.message };

  revalidatePath("/arlista");
  redirect("/arlista");
}

export async function termekFrissitese(
  id: string,
  _elozo: TermekAllapot,
  adat: FormData,
): Promise<TermekAllapot> {
  const mezok = termekAdatokFormbol(adat);
  if (!mezok.nev) return { hiba: "A megnevezés kötelező." };
  if (!mezok.mertekegyseg) return { hiba: "A mennyiségi egység kötelező." };
  if (!(mezok.eladasi_ar > 0)) return { hiba: "Az eladási ár kötelező." };

  const supabase = await szerverKliens();
  const { error } = await supabase.from("termekek").update(mezok).eq("id", id);
  if (error) return { hiba: error.message };

  revalidatePath("/arlista");
  redirect("/arlista");
}

export async function termekInaktivalasa(id: string) {
  const supabase = await szerverKliens();
  await supabase.from("termekek").update({ aktiv: false }).eq("id", id);
  revalidatePath("/arlista");
}
