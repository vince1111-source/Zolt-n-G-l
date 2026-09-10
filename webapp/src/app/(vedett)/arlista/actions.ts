"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { flashUzenet } from "@/lib/flash";
import type { Enums } from "@/lib/supabase/types";

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
    // Üres string esetén NULL, nem 0 — a kettő más jelentésű: a 0 azt
    // mondaná, hogy "azonnal kész", a NULL azt, hogy "nincs megadva".
    normaido_perc_egyseg: (() => {
      const nyers = String(adat.get("normaido_perc_egyseg") ?? "").trim();
      return nyers ? Number(nyers) : null;
    })(),
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
  const { data } = await supabase
    .from("termekek")
    .update({ aktiv: false })
    .eq("id", id)
    .select("nev")
    .maybeSingle();
  if (data) {
    await flashUzenet(
      "siker",
      `Inaktiválva: ${data.nev}. Ha tévedés volt, a lista alján, az „Inaktív tételek” alatt visszakapcsolhatod.`,
    );
  }
  revalidatePath("/arlista");
}

export async function termekAktivalasa(id: string) {
  const supabase = await szerverKliens();
  const { data } = await supabase
    .from("termekek")
    .update({ aktiv: true })
    .eq("id", id)
    .select("nev")
    .maybeSingle();
  if (data) await flashUzenet("siker", `Újra aktív: ${data.nev}`);
  revalidatePath("/arlista");
}
