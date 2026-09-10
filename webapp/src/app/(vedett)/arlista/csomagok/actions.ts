"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { flashUzenet } from "@/lib/flash";

export type CsomagAllapot = { hiba?: string };

type CsomagMezok = {
  nev: string;
  mertekegyseg: string;
  leiras: string | null;
  tetelek: { termek_id: string; mennyiseg_egysegre: number; sorrend: number; alap: "terulet" | "kerulet" }[];
};

function csomagMezokFormbol(adat: FormData): CsomagMezok | { hiba: string } {
  const nev = String(adat.get("nev") ?? "").trim();
  if (!nev) return { hiba: "A csomag neve kötelező." };
  const mertekegyseg = String(adat.get("mertekegyseg") ?? "").trim() || "m2";

  const termekIdk = adat.getAll("tetel_termek").map(String);
  const mennyisegek = adat.getAll("tetel_mennyiseg").map((m) => Number(String(m).replace(",", ".")));
  const alapok = adat.getAll("tetel_alap").map(String);
  if (termekIdk.length !== mennyisegek.length || (alapok.length > 0 && alapok.length !== termekIdk.length)) {
    return { hiba: "Az űrlap sorai nem párosíthatók — töltsd újra az oldalt." };
  }

  const tetelek = termekIdk
    .map((termek_id, i) => ({
      termek_id,
      mennyiseg_egysegre: mennyisegek[i],
      sorrend: i,
      alap: alapok[i] === "kerulet" ? ("kerulet" as const) : ("terulet" as const),
    }))
    .filter((t) => t.termek_id);

  if (!tetelek.length) return { hiba: "Legalább egy tételt adj a csomaghoz." };
  if (tetelek.some((t) => !Number.isFinite(t.mennyiseg_egysegre) || !(t.mennyiseg_egysegre > 0))) {
    return { hiba: "Minden tételhez pozitív mennyiség kell (a csomag egy egységére vetítve)." };
  }
  if (new Set(tetelek.map((t) => t.termek_id)).size !== tetelek.length) {
    return { hiba: "Ugyanaz a tétel kétszer szerepel — vond össze egy sorba." };
  }

  return { nev, mertekegyseg, leiras: String(adat.get("leiras") ?? "").trim() || null, tetelek };
}

/**
 * Inaktív (vagy nem létező / más cégé — az RLS miatt nem látszó) termék
 * nem kerülhet csomagba: a csomag árazási törzsadat, egy inaktivált tétel
 * csendes becserélése az AI-doboz minden későbbi ajánlatát elrontaná.
 */
async function nemAktivTermekek(
  supabase: Awaited<ReturnType<typeof szerverKliens>>,
  termekIdk: string[],
): Promise<string[]> {
  const { data } = await supabase.from("termekek").select("id, nev, aktiv").in("id", termekIdk);
  const talalt = new Map((data ?? []).map((t) => [t.id, t]));
  return termekIdk.map((id) => {
    const t = talalt.get(id);
    if (!t) return "ismeretlen tétel";
    return t.aktiv ? null : t.nev;
  }).filter((x): x is string => x !== null);
}

export async function csomagLetrehozasa(
  _elozo: CsomagAllapot,
  adat: FormData,
): Promise<CsomagAllapot> {
  const mezok = csomagMezokFormbol(adat);
  if ("hiba" in mezok) return mezok;

  const supabase = await szerverKliens();
  const inaktivak = await nemAktivTermekek(supabase, mezok.tetelek.map((t) => t.termek_id));
  if (inaktivak.length) {
    return { hiba: `Inaktív tétel a csomagban: ${inaktivak.join(", ")} — aktiváld újra az Árlistán, vagy vedd ki.` };
  }

  const { data: csomag, error } = await supabase
    .from("munkacsomagok")
    .insert({ nev: mezok.nev, mertekegyseg: mezok.mertekegyseg, leiras: mezok.leiras })
    .select("id")
    .single();
  if (error || !csomag) {
    return { hiba: error?.code === "23505" ? "Már van ilyen nevű csomag." : (error?.message ?? "Nem sikerült.") };
  }

  const { error: tetelHiba } = await supabase
    .from("munkacsomag_tetelek")
    .insert(mezok.tetelek.map((t) => ({ ...t, csomag_id: csomag.id })));
  if (tetelHiba) {
    // Tétel nélküli csomag árva maradna — inkább visszavonjuk a fejet is.
    await supabase.from("munkacsomagok").delete().eq("id", csomag.id);
    return { hiba: tetelHiba.message };
  }

  await flashUzenet("siker", `Munkacsomag felvéve: ${mezok.nev}`);
  revalidatePath("/arlista/csomagok");
  redirect("/arlista/csomagok");
}

export async function csomagFrissitese(
  id: string,
  _elozo: CsomagAllapot,
  adat: FormData,
): Promise<CsomagAllapot> {
  const mezok = csomagMezokFormbol(adat);
  if ("hiba" in mezok) return mezok;

  const supabase = await szerverKliens();
  const inaktivak = await nemAktivTermekek(supabase, mezok.tetelek.map((t) => t.termek_id));
  if (inaktivak.length) {
    return { hiba: `Inaktív tétel a csomagban: ${inaktivak.join(", ")} — aktiváld újra az Árlistán, vagy vedd ki.` };
  }

  const { error } = await supabase
    .from("munkacsomagok")
    .update({ nev: mezok.nev, mertekegyseg: mezok.mertekegyseg, leiras: mezok.leiras })
    .eq("id", id);
  if (error) {
    return { hiba: error.code === "23505" ? "Már van ilyen nevű csomag." : error.message };
  }

  // A tételeket teljes egészében cseréljük — a csomag kicsi, és így a
  // sorrend és a törölt sorok is egyszerűen, pontosan követik az űrlapot.
  // Két külön hívás (törlés, beszúrás): egy közbeeső hiba üres csomagot
  // hagyhat, amit a mentés megismétlése helyrehoz — a csomag nem pénzügyi
  // bizonylat, ezért itt ez elfogadott.
  const { error: torlesHiba } = await supabase.from("munkacsomag_tetelek").delete().eq("csomag_id", id);
  if (torlesHiba) return { hiba: torlesHiba.message };
  const { error: tetelHiba } = await supabase
    .from("munkacsomag_tetelek")
    .insert(mezok.tetelek.map((t) => ({ ...t, csomag_id: id })));
  if (tetelHiba) return { hiba: tetelHiba.message };

  await flashUzenet("siker", `Munkacsomag mentve: ${mezok.nev}`);
  revalidatePath("/arlista/csomagok");
  revalidatePath(`/arlista/csomagok/${id}`);
  redirect("/arlista/csomagok");
}

export async function csomagInaktivalasa(id: string) {
  const supabase = await szerverKliens();
  await supabase.from("munkacsomagok").update({ aktiv: false }).eq("id", id);
  revalidatePath("/arlista/csomagok");
}
