"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { forintra } from "@/lib/mag";

export type NagykerAllapot = { hiba?: string };

function nagykerTetelAdatokFormbol(adat: FormData) {
  return {
    nev: String(adat.get("nev") ?? "").trim(),
    cikkszam: String(adat.get("cikkszam") ?? "").trim() || null,
    mertekegyseg: String(adat.get("mertekegyseg") ?? "").trim(),
    termek_id: String(adat.get("termek_id") ?? "") || null,
  };
}

export async function nagykerTetelLetrehozasa(
  szallitoId: string,
  _elozo: NagykerAllapot,
  adat: FormData,
): Promise<NagykerAllapot> {
  const mezok = nagykerTetelAdatokFormbol(adat);
  if (!mezok.nev) return { hiba: "A megnevezés kötelező." };
  if (!mezok.mertekegyseg) return { hiba: "A mennyiségi egység kötelező." };

  const kezdoAr = Number(adat.get("beszerzesi_ar") ?? 0) || 0;

  const supabase = await szerverKliens();
  const { error } = await supabase.from("nagyker_tetelek").insert({
    ...mezok,
    szallito_id: szallitoId,
    beszerzesi_ar: kezdoAr,
  });
  if (error) return { hiba: error.message };

  revalidatePath(`/nagyker/${szallitoId}`);
  redirect(`/nagyker/${szallitoId}`);
}

/**
 * Csak az ÁR NÉLKÜLI mezők szerkesztése — a beszerzési ár kizárólag az
 * árfrissítési jóváhagyási folyamaton keresztül változhat
 * (`arfrissitesJovahagyasa`), hogy ne legyen kerülőút a kapu mellett.
 */
export async function nagykerTetelFrissitese(
  szallitoId: string,
  id: string,
  _elozo: NagykerAllapot,
  adat: FormData,
): Promise<NagykerAllapot> {
  const mezok = nagykerTetelAdatokFormbol(adat);
  if (!mezok.nev) return { hiba: "A megnevezés kötelező." };
  if (!mezok.mertekegyseg) return { hiba: "A mennyiségi egység kötelező." };

  const supabase = await szerverKliens();
  const { error } = await supabase
    .from("nagyker_tetelek")
    .update({ ...mezok, aktiv: adat.get("aktiv") === "on" })
    .eq("id", id);
  if (error) return { hiba: error.message };

  revalidatePath(`/nagyker/${szallitoId}`);
  redirect(`/nagyker/${szallitoId}`);
}

export type ArfrissitesSor = {
  tetelId: string;
  nev: string;
  mertekegyseg: string;
  regiBeszerzesiAr: number;
  ujBeszerzesiAr: number;
  termekId: string | null;
  regiEladasiAr: number | null;
  ujEladasiAr: number | null;
};

/**
 * A tömeges árbeviteli űrlap beküldése — csak a TÉNYLEGESEN megváltozott
 * sorokból épül a javaslat, és semmi nem íródik a táblákba, amíg valaki
 * jóvá nem hagyja a review-lapon.
 */
export async function arfrissitesJavaslatLetrehozasa(
  szallitoId: string,
  _elozo: NagykerAllapot,
  adat: FormData,
): Promise<NagykerAllapot> {
  const supabase = await szerverKliens();

  const { data: tetelek } = await supabase
    .from("nagyker_tetelek")
    .select("id, nev, mertekegyseg, beszerzesi_ar, termek_id, termekek(eladasi_ar, beszerzesi_ar)")
    .eq("szallito_id", szallitoId)
    .eq("aktiv", true);

  if (!tetelek?.length) return { hiba: "Nincs aktív tétel ennél a beszállítónál." };

  const sorok: ArfrissitesSor[] = [];
  for (const t of tetelek) {
    const ujAr = Number(adat.get(`ar_${t.id}`) ?? "");
    if (!(ujAr >= 0) || ujAr === t.beszerzesi_ar) continue;

    let ujEladasiAr: number | null = null;
    if (t.termek_id && t.termekek && t.termekek.beszerzesi_ar > 0) {
      // Az árrés ARÁNYÁT tartjuk, nem a forint-különbséget — determinisztikus
      // kód, nem találgatás (mag/forintra).
      ujEladasiAr = forintra((ujAr * t.termekek.eladasi_ar) / t.termekek.beszerzesi_ar);
    }

    sorok.push({
      tetelId: t.id,
      nev: t.nev,
      mertekegyseg: t.mertekegyseg,
      regiBeszerzesiAr: t.beszerzesi_ar,
      ujBeszerzesiAr: ujAr,
      termekId: t.termek_id,
      regiEladasiAr: t.termekek?.eladasi_ar ?? null,
      ujEladasiAr,
    });
  }

  if (!sorok.length) return { hiba: "Egyik ár sem változott." };

  const { data: szallito } = await supabase
    .from("partnerek")
    .select("nev")
    .eq("id", szallitoId)
    .maybeSingle();

  const { data: javaslat, error } = await supabase
    .from("javasolt_muveletek")
    .insert({
      tipus: "arfrissites",
      hivatkozott_tabla: "nagyker_tetelek",
      hivatkozott_id: szallitoId,
      javaslat: { szallito: szallito?.nev ?? null, sorok },
    })
    .select("id")
    .single();
  if (error || !javaslat) return { hiba: error?.message ?? "A javaslat mentése sikertelen." };

  revalidatePath(`/nagyker/${szallitoId}`);
  revalidatePath("/");
  redirect(`/nagyker/arfrissitesek/${javaslat.id}`);
}

/**
 * A jóváhagyás — a `javasolt_muveletek` sor javasolt → jóváhagyott →
 * végrehajtott állapotokon megy át, mielőtt a tényleges árak írásra
 * kerülnének (ugyanaz az elv, mint `ajanlatKikuldese`-nél).
 */
export async function arfrissitesJovahagyasa(
  javaslatId: string,
  mod: "teljes" | "csak_beszerzes",
) {
  const { felhasznalo } = await sajatCegVagyIranyitas();
  const supabase = await szerverKliens();

  const { data: javaslat } = await supabase
    .from("javasolt_muveletek")
    .select("javaslat, allapot")
    .eq("id", javaslatId)
    .maybeSingle();
  if (!javaslat || javaslat.allapot !== "javasolt") return;

  const most = new Date().toISOString();
  await supabase
    .from("javasolt_muveletek")
    .update({ allapot: "jovahagyott", jovahagyta_id: felhasznalo.id, jovahagyva: most })
    .eq("id", javaslatId);
  await supabase
    .from("javasolt_muveletek")
    .update({ allapot: "vegrehajtott", vegrehajtva: most })
    .eq("id", javaslatId);

  const sorok = (javaslat.javaslat as { sorok: ArfrissitesSor[] }).sorok ?? [];
  for (const s of sorok) {
    await supabase
      .from("nagyker_tetelek")
      .update({ beszerzesi_ar: s.ujBeszerzesiAr, frissitve: most })
      .eq("id", s.tetelId);

    if (mod === "teljes" && s.termekId) {
      const frissites: { beszerzesi_ar: number; eladasi_ar?: number } = {
        beszerzesi_ar: s.ujBeszerzesiAr,
      };
      if (s.ujEladasiAr !== null) frissites.eladasi_ar = s.ujEladasiAr;
      await supabase.from("termekek").update(frissites).eq("id", s.termekId);
    } else if (s.termekId) {
      await supabase.from("termekek").update({ beszerzesi_ar: s.ujBeszerzesiAr }).eq("id", s.termekId);
    }
  }

  revalidatePath(`/nagyker/arfrissitesek/${javaslatId}`);
  revalidatePath("/nagyker");
  revalidatePath("/arlista");
  revalidatePath("/");
}

export async function arfrissitesElvetese(javaslatId: string) {
  const supabase = await szerverKliens();
  await supabase
    .from("javasolt_muveletek")
    .update({ allapot: "elvetett" })
    .eq("id", javaslatId)
    .eq("allapot", "javasolt");
  revalidatePath(`/nagyker/arfrissitesek/${javaslatId}`);
  revalidatePath("/");
}
