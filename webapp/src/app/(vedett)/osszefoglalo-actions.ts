"use server";

import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { kintlevosegOsszesites, napokEltelte } from "@/lib/mag";
import { budapestMaDatum, budapestIdoString } from "@/lib/het";
import { ajanlatLejartE } from "@/lib/ajanlat-allapot";
import { aiBekotve } from "@/lib/ai/openai";
import { aiNaplozas, napiPlafonElerve } from "@/lib/ai/naplo";
import { napiOsszefoglaloSzovege, type NapiTenyek } from "@/lib/ai/osszefoglalo";
import type { Json } from "@/lib/supabase/types";

export type NapiOsszefoglaloEredmeny =
  | { allapot: "nincs_bekotve" }
  | { allapot: "hiba"; uzenet: string }
  | { allapot: "kesz"; szoveg: string; modell: string; datum: string; friss: boolean };

const UTANKOVETES_KUSZOB_NAP = 3;

/**
 * A "Ma" képernyő determinisztikus tényei — ugyanazok a lekérdezések, mint a
 * (vedett)/page.tsx-ben, egy helyre gyűjtve a modell bemenetéhez. (A page.tsx
 * saját példánya egyelőre megmaradt; ha bővül, érdemes erre a helperre
 * átállni, hogy a kettő ne csússzon szét.)
 */
async function maiTenyek(
  supabase: Awaited<ReturnType<typeof szerverKliens>>,
  nev: string,
  ma: string,
): Promise<NapiTenyek> {
  const napEleje = `${ma}T00:00:00+02:00`;
  const napVege = `${ma}T23:59:59+02:00`;

  const [
    { data: fuggoAjanlatok },
    { data: teendok, count: teendokSzama },
    { count: nyitottMunkakSzama },
    { data: nyitottSzamlak },
    { data: kikuldveAjanlatok },
    { data: kikuldesek },
    { data: esemenyek },
  ] = await Promise.all([
    supabase.from("ajanlatok").select("allapot, ervenyes_ig").in("allapot", ["piszkozat", "kikuldve"]),
    supabase
      .from("feladatok")
      .select("cim, surgos", { count: "exact" })
      .eq("allapot", "nyitott")
      .order("surgos", { ascending: false })
      .limit(3),
    supabase.from("munkak").select("*", { count: "exact", head: true }).neq("allapot", "befejezve"),
    supabase.from("szamlak").select("brutto, fizetesi_hatarido, allapot, partnerek(nev)").eq("irany", "kimeno"),
    supabase.from("ajanlatok").select("id, sorszam, partnerek(nev)").eq("allapot", "kikuldve"),
    supabase
      .from("javasolt_muveletek")
      .select("hivatkozott_id, vegrehajtva")
      .eq("tipus", "ajanlat_kikuldes")
      .eq("hivatkozott_tabla", "ajanlatok")
      .eq("allapot", "vegrehajtott"),
    supabase.from("naptar_esemenyek").select("cim, kezdet").gte("kezdet", napEleje).lte("kezdet", napVege).order("kezdet"),
  ]);

  const kintlevoseg = kintlevosegOsszesites(
    (nyitottSzamlak ?? []).map((sz) => ({
      partner: sz.partnerek?.nev ?? "Ismeretlen",
      brutto: sz.brutto ?? 0,
      hatarido: sz.fizetesi_hatarido ?? ma,
      allapot: sz.allapot,
    })),
    ma,
  );

  const kikuldesIdopontok = new Map(
    (kikuldesek ?? []).filter((k) => k.vegrehajtva).map((k) => [k.hivatkozott_id, k.vegrehajtva as string]),
  );
  const regotaVarakozo = (kikuldveAjanlatok ?? [])
    .map((a) => {
      const kikuldve = kikuldesIdopontok.get(a.id);
      if (!kikuldve) return null;
      const napok = napokEltelte(kikuldve.slice(0, 10), ma);
      return { partner: a.partnerek?.nev ?? "Ismeretlen", sorszam: a.sorszam, napok };
    })
    .filter((v): v is { partner: string; sorszam: string; napok: number } => v !== null && v.napok >= UTANKOVETES_KUSZOB_NAP)
    .sort((a, b) => b.napok - a.napok)
    .slice(0, 3);

  return {
    nev,
    datum: ma,
    napNeve: new Date(`${ma}T12:00:00`).toLocaleDateString("hu-HU", { weekday: "long" }),
    nyitottMunka: nyitottMunkakSzama ?? 0,
    fuggoAjanlat: (fuggoAjanlatok ?? []).filter((a) => !ajanlatLejartE(a, ma)).length,
    nyitottTeendo: teendokSzama ?? 0,
    surgosTeendok: (teendok ?? []).filter((t) => t.surgos).map((t) => t.cim),
    kintlevosegFt: kintlevoseg.nyitottOsszesen,
    kintlevosegDarab: kintlevoseg.nyitottDarab,
    lejartFt: kintlevoseg.lejartOsszesen,
    regotaVarakozo,
    maiEsemenyek: (esemenyek ?? []).map((e) => ({ ido: budapestIdoString(e.kezdet), cim: e.cim })),
  };
}

/**
 * A mai összefoglaló: ha ma már készült, a tároltat adja; ha nem, most
 * generálja és tárolja (naponta EGYSZER cégenként — CLAUDE.md). Két
 * párhuzamos megnyitásnál a második beszúrás a kulcson elbukik, és a
 * tároltat olvassa vissza — nem generál kétszer.
 */
export async function napiOsszefoglaloLekerese(): Promise<NapiOsszefoglaloEredmeny> {
  if (!aiBekotve()) return { allapot: "nincs_bekotve" };

  const supabase = await szerverKliens();
  const ma = budapestMaDatum();

  const { data: meglevo } = await supabase
    .from("napi_osszefoglalok")
    .select("szoveg, modell, datum")
    .eq("datum", ma)
    .maybeSingle();
  if (meglevo) return { allapot: "kesz", szoveg: meglevo.szoveg, modell: meglevo.modell, datum: meglevo.datum, friss: false };

  if (await napiPlafonElerve(supabase)) {
    return { allapot: "hiba", uzenet: "A mai modellhívás-keret elfogyott." };
  }

  const { felhasznalo } = await sajatCegVagyIranyitas();
  const tenyek = await maiTenyek(supabase, felhasznalo.nev, ma);
  const valasz = await napiOsszefoglaloSzovege(tenyek);
  if (!valasz.ok) return { allapot: "hiba", uzenet: valasz.uzenet };

  await aiNaplozas(supabase, {
    muvelet: "napi_osszefoglalo",
    reteg: 2,
    modell: valasz.modell,
    bemenet: tenyek as unknown as Json,
    kimenet: { szoveg: valasz.adat },
    tokenBe: valasz.tokenBe,
    tokenKi: valasz.tokenKi,
    tokenCache: valasz.tokenCache,
    felhasznaloId: felhasznalo.id,
  });

  const { error } = await supabase.from("napi_osszefoglalok").insert({
    datum: ma,
    szoveg: valasz.adat,
    bemenet: tenyek as unknown as Json,
    modell: valasz.modell,
    token_be: valasz.tokenBe,
    token_ki: valasz.tokenKi,
  });
  if (error && error.code === "23505") {
    const { data: masik } = await supabase.from("napi_osszefoglalok").select("szoveg, modell, datum").eq("datum", ma).maybeSingle();
    if (masik) return { allapot: "kesz", szoveg: masik.szoveg, modell: masik.modell, datum: masik.datum, friss: false };
  }

  return { allapot: "kesz", szoveg: valasz.adat, modell: valasz.modell, datum: ma, friss: true };
}
