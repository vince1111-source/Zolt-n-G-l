"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";

export type AjanlatAllapot = { hiba?: string };

const forintra = (n: number) => Math.round(n);

/**
 * Egy ajánlat sorszáma a cégen belül folyamatos: AJ-{év}-{sorszám}.
 * A `unique (ceg_id, sorszam)` megkötést az adatbázis őrzi — ha két
 * kérés véletlenül ugyanazt a számot generálná, a beszúrás elutasítja,
 * nem csendben felülírja.
 */
async function kovetkezoSorszam(
  supabase: Awaited<ReturnType<typeof szerverKliens>>,
  cegId: string,
) {
  const ev = new Date().getFullYear();
  const { count } = await supabase
    .from("ajanlatok")
    .select("*", { count: "exact", head: true })
    .eq("ceg_id", cegId);
  return `AJ-${ev}-${String((count ?? 0) + 1).padStart(3, "0")}`;
}

export async function ajanlatLetrehozasa(
  _elozo: AjanlatAllapot,
  adat: FormData,
): Promise<AjanlatAllapot> {
  const partnerId = String(adat.get("partner_id") ?? "");
  if (!partnerId) return { hiba: "Válassz partnert." };

  const termekIdk = adat.getAll("tetel_termek").map(String);
  const mennyisegek = adat.getAll("tetel_mennyiseg").map(Number);

  const sorok = termekIdk
    .map((id, i) => ({ termekId: id, mennyiseg: mennyisegek[i] }))
    .filter((s) => s.termekId && s.mennyiseg > 0);

  if (!sorok.length) {
    return { hiba: "Legalább egy tételt adj meg mennyiséggel." };
  }

  const { ceg } = await sajatCegVagyIranyitas();
  if (!ceg) return { hiba: "Nem található a céged." };

  const supabase = await szerverKliens();

  // A kedvezmény a partner adatlapjából jön, nem a beküldött űrlapból —
  // ezt az ügyfél oldali kód nem írhatja felül.
  const { data: partner } = await supabase
    .from("partnerek")
    .select("kedvezmeny_szazalek")
    .eq("id", partnerId)
    .single();
  if (!partner) return { hiba: "A partner nem található." };

  // Az egységár a KANONIKUS árlistából jön, sosem a kliens beküldött
  // adatából — a modell/böngésző nem számol, a szerver a saját
  // árlistából olvas. Ez ugyanaz az elv, mint a mag/arkalkulacio.mjs-ben.
  const { data: termekek } = await supabase
    .from("termekek")
    .select("id, nev, mertekegyseg, eladasi_ar, afa_kulcs")
    .in(
      "id",
      sorok.map((s) => s.termekId),
    );
  if (!termekek || termekek.length !== sorok.length) {
    return { hiba: "Egy vagy több tétel már nem elérhető az árlistában." };
  }

  const tetelek = sorok.map((s, i) => {
    const t = termekek.find((x) => x.id === s.termekId)!;
    return {
      termek_id: t.id,
      megnevezes: t.nev,
      mennyiseg: s.mennyiseg,
      mertekegyseg: t.mertekegyseg,
      egysegar: t.eladasi_ar,
      netto: forintra(s.mennyiseg * t.eladasi_ar),
      sorrend: i,
      afa_kulcs: t.afa_kulcs,
    };
  });

  const listaar = tetelek.reduce((s, t) => s + t.netto, 0);
  const netto = forintra(listaar * (1 - partner.kedvezmeny_szazalek / 100));
  // Az áfakulcs tételenként eltérhetne, de az ajánlat fejlécén egy
  // összesített kulcs van — a legelső tétel kulcsát használjuk (a
  // gyakorlatban egy ajánlaton belül egységes szokott lenni).
  const afaKulcs = tetelek[0]?.afa_kulcs ?? 27;
  const afa = forintra(netto * (afaKulcs / 100));
  const brutto = forintra(netto * (1 + afaKulcs / 100));

  const sorszam = await kovetkezoSorszam(supabase, ceg.id);

  const { data: ujAjanlat, error: ajanlatHiba } = await supabase
    .from("ajanlatok")
    .insert({
      partner_id: partnerId,
      sorszam,
      netto,
      afa,
      brutto,
      kedvezmeny_szazalek: partner.kedvezmeny_szazalek,
    })
    .select("id")
    .single();

  if (ajanlatHiba || !ujAjanlat) {
    return { hiba: ajanlatHiba?.message ?? "Az ajánlat létrehozása sikertelen." };
  }

  const { error: tetelHiba } = await supabase.from("ajanlat_tetelek").insert(
    tetelek.map(({ afa_kulcs: _afa_kulcs, ...tetel }) => ({
      ...tetel,
      ajanlat_id: ujAjanlat.id,
    })),
  );

  if (tetelHiba) {
    // A fej már létrejött tétel nélkül — inkább ezt jelezzük, mint hogy
    // csendben félkész ajánlatot hagyjunk.
    return { hiba: `A tételek mentése sikertelen: ${tetelHiba.message}` };
  }

  revalidatePath("/ajanlatok");
  redirect(`/ajanlatok/${ujAjanlat.id}`);
}

export async function ajanlatAllapotValtas(id: string, ujAllapot: string) {
  const supabase = await szerverKliens();
  await supabase
    .from("ajanlatok")
    .update({ allapot: ujAllapot as "kikuldve" | "elfogadva" | "elutasitva" })
    .eq("id", id);
  revalidatePath(`/ajanlatok/${id}`);
  revalidatePath("/ajanlatok");
}
