"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { ajanlatSzamitas, ajanlatMentese } from "@/lib/ajanlat-szamitas";

export type AjanlatAllapot = { hiba?: string };

export async function ajanlatLetrehozasa(
  _elozo: AjanlatAllapot,
  adat: FormData,
): Promise<AjanlatAllapot> {
  const partnerId = String(adat.get("partner_id") ?? "");
  if (!partnerId) return { hiba: "Válassz partnert." };

  const termekIdk = adat.getAll("tetel_termek").map(String);
  const mennyisegek = adat.getAll("tetel_mennyiseg").map(Number);
  const szorzok = adat.getAll("tetel_szorzo").map(Number);

  const tetelBemenetek = termekIdk
    .map((id, i) => ({
      termekId: id,
      mennyiseg: mennyisegek[i],
      munkaidoSzorzo: szorzok[i] > 0 ? szorzok[i] : 1,
    }))
    .filter((s) => s.termekId && s.mennyiseg > 0);

  const { ceg } = await sajatCegVagyIranyitas();
  if (!ceg) return { hiba: "Nem található a céged." };

  const supabase = await szerverKliens();
  const szamitas = await ajanlatSzamitas(supabase, partnerId, tetelBemenetek);
  if ("hiba" in szamitas) return { hiba: szamitas.hiba };

  const ujAjanlat = await ajanlatMentese(supabase, ceg.id, partnerId, szamitas);
  if ("hiba" in ujAjanlat) return { hiba: ujAjanlat.hiba };

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

  // Elfogadott ajánlatból automatikusan munka lesz — lásd
  // docs/termekvizio-2026-08-31.md "Wow #7". A cím/határidő szándékosan
  // üresen marad: nincs valós adat, amire alapozni lehetne, a
  // felhasználó tölti ki. A `munkak.ajanlat_id` unique megkötése adja az
  // idempotenciát, ha ez a hívás valamiért kétszer futna le.
  if (ujAllapot === "elfogadva") {
    const { data: ajanlat } = await supabase
      .from("ajanlatok")
      .select("sorszam, partner_id")
      .eq("id", id)
      .single();
    if (ajanlat) {
      const { error } = await supabase.from("munkak").insert({
        ajanlat_id: id,
        partner_id: ajanlat.partner_id,
        leiras: `Automatikusan létrehozva a ${ajanlat.sorszam} ajánlat elfogadásakor.`,
      });
      if (error && error.code !== "23505") {
        console.error("Munka létrehozása sikertelen:", error.message);
      }
    }
    revalidatePath("/munkak");
  }

  revalidatePath(`/ajanlatok/${id}`);
  revalidatePath("/ajanlatok");
  revalidatePath("/");
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

async function kovetkezoSzamlaSorszam(
  supabase: Awaited<ReturnType<typeof szerverKliens>>,
) {
  const ev = new Date().getFullYear();
  const { count } = await supabase
    .from("szamlak")
    .select("*", { count: "exact", head: true })
    .eq("irany", "kimeno");
  return `SZ-${ev}-${String((count ?? 0) + 1).padStart(3, "0")}`;
}

/**
 * Számla kiállítása egy elfogadott ajánlatból — a vízió-dokumentum
 * "elfogadott ajánlat → pénzügyi lánc" fonala. Ugyanaz a minta, mint az
 * `ajanlatKikuldese`-nél: a "Számla kiállítása" gombra kattintás MAGA a
 * jóváhagyás (nincs közbülső AI-javaslat), de a `javasolt_muveletek` sor
 * ugyanúgy javasolt → jóváhagyott → végrehajtott állapotokon megy át.
 *
 * ⚠ SZIMULÁLT: amíg nincs választott számlázó szolgáltató (Számlázz.hu
 * vagy Billingo) és valós API-kulcs, itt nem történik tényleges
 * számlakiállítás — csak egy `szamlak` sor jön létre `forras='szimulalt'`
 * jelöléssel (lásd db/migraciok/0017_szamla_lanc_enumok.sql). Ez a felület
 * felé is látszik, nem csak az adatban — lásd `ajanlatok/[id]/page.tsx`.
 */
export async function szamlaKiallitasa(id: string) {
  const { felhasznalo } = await sajatCegVagyIranyitas();
  const supabase = await szerverKliens();

  const { data: ajanlat } = await supabase
    .from("ajanlatok")
    .select("sorszam, netto, afa, brutto, partner_id, partnerek(nev, fizetesi_hatarido_nap)")
    .eq("id", id)
    .maybeSingle();
  if (!ajanlat) return;

  const { data: javaslat, error: javaslatHiba } = await supabase
    .from("javasolt_muveletek")
    .insert({
      tipus: "szamla_kiallitas",
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

  const ma = new Date().toISOString().slice(0, 10);
  const hataridoNap = ajanlat.partnerek?.fizetesi_hatarido_nap ?? 15;
  const hatarido = new Date(Date.now() + hataridoNap * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const sorszam = await kovetkezoSzamlaSorszam(supabase);
  const { error: szamlaHiba } = await supabase.from("szamlak").insert({
    irany: "kimeno",
    forras: "szimulalt",
    sorszam,
    ajanlat_id: id,
    partner_id: ajanlat.partner_id,
    kelt: ma,
    teljesites: ma,
    fizetesi_hatarido: hatarido,
    netto: ajanlat.netto,
    afa: ajanlat.afa,
    brutto: ajanlat.brutto,
  });
  // 23505 = már van számla ehhez az ajánlathoz — ez az idempotencia, nem hiba.
  if (szamlaHiba && szamlaHiba.code !== "23505") {
    console.error("Számla létrehozása sikertelen:", szamlaHiba.message);
  }

  revalidatePath(`/ajanlatok/${id}`);
  revalidatePath("/");
}
