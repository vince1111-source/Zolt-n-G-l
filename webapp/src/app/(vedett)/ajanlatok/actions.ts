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
      // Az ajánlat 30 napig érvényes, ha másképp nem szóltunk — ez kerül
      // rá az ügyfélnek szóló dokumentumra is.
      ervenyes_ig: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
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

/**
 * Az „elfogadták" / „elutasították" gombok — ezek nem küldenek semmit,
 * csak azt rögzítik, amit a partner amúgy is visszajelzett. Nem külső
 * hatású művelet, ezért nem megy a jóváhagyási kapun keresztül.
 * A kiküldést lásd külön: `ajanlatKikuldese`.
 */
export async function ajanlatAllapotValtas(id: string, ujAllapot: "elfogadva" | "elutasitva") {
  const supabase = await szerverKliens();
  await supabase.from("ajanlatok").update({ allapot: ujAllapot }).eq("id", id);
  revalidatePath(`/ajanlatok/${id}`);
  revalidatePath("/ajanlatok");
}

/**
 * Az ajánlat kiküldése — ez a fejlesztői specifikáció 6.2 fejezetében az
 * `ajanlat_kikuldes` eszköz, ami „→ JÓVÁHAGYÁS"-sal van jelölve: külső
 * hatású művelet, tehát a `javasolt_muveletek` kapun kell átmennie, nem
 * írhatja át közvetlenül az ajánlat állapotát.
 *
 * Mivel itt egy ember kattint a „Kiküldöm" gombra (nincs közbülső AI-
 * javaslat, amit külön jóvá kellene hagyni), a kattintás MAGA a
 * jóváhagyás — de a nyoma ugyanúgy megmarad: a javasolt_muveletek sor
 * javasolt → jóváhagyott → végrehajtott állapotokon megy át, mielőtt az
 * ajánlat allapot mezője ténylegesen kikuldve-re vált. Ha ezt valaha egy
 * AI-réteg indítja emberi jóváhagyás előtt, csak az első lépés (a
 * javasolt sor létrehozása) marad — a többi már egy külön jóváhagyó
 * lépésre vár.
 */
export async function ajanlatKikuldese(id: string) {
  const { felhasznalo } = await sajatCegVagyIranyitas();
  const supabase = await szerverKliens();

  const { data: ajanlat } = await supabase
    .from("ajanlatok")
    .select("sorszam, brutto, partnerek(nev)")
    .eq("id", id)
    .maybeSingle();
  if (!ajanlat) return;

  const { data: javaslat, error: javaslatHiba } = await supabase
    .from("javasolt_muveletek")
    .insert({
      tipus: "ajanlat_kikuldes",
      hivatkozott_tabla: "ajanlatok",
      hivatkozott_id: id,
      javaslat: {
        sorszam: ajanlat.sorszam,
        brutto: ajanlat.brutto,
        partner: ajanlat.partnerek?.nev ?? null,
      },
    })
    .select("id")
    .single();
  if (javaslatHiba || !javaslat) return;

  const most = new Date().toISOString();
  await supabase
    .from("javasolt_muveletek")
    .update({ allapot: "jovahagyott", jovahagyta_id: felhasznalo.id, jovahagyva: most })
    .eq("id", javaslat.id);

  await supabase
    .from("javasolt_muveletek")
    .update({ allapot: "vegrehajtott", vegrehajtva: most })
    .eq("id", javaslat.id);

  await supabase.from("ajanlatok").update({ allapot: "kikuldve" }).eq("id", id);

  revalidatePath(`/ajanlatok/${id}`);
  revalidatePath("/ajanlatok");
}
