"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import {
  ertelmezSzoveg,
  norm,
  partnerKereses,
  csomagKereses,
  M2_ALIASOK,
  type Ertelmezes,
} from "@/lib/szandek";
import { budapestMaDatum, budapestIdopontIso, napszoDatumma, budapestIdoString } from "@/lib/het";
import { kintlevosegOsszesites, keruletBecsles } from "@/lib/mag";
import { csomagTetelBemenetek, vanKeruletesTetel } from "@/lib/munkacsomag";
import { ajanlatLejartE } from "@/lib/ajanlat-allapot";
import { aiBekotve } from "@/lib/ai/openai";
import { aiNaplozas, napiPlafonElerve } from "@/lib/ai/naplo";
import { reteg1Felismeres, reteg1Ertelmezesse, reteg1Bemenet } from "@/lib/ai/reteg1";
import {
  ajanlatSzamitas,
  ajanlatMentese,
  type TetelBemenet,
  type AjanlatSzamitasSiker,
} from "@/lib/ajanlat-szamitas";
import type { Json } from "@/lib/supabase/types";

export async function kijelentkezes() {
  const supabase = await szerverKliens();
  await supabase.auth.signOut();
  redirect("/bejelentkezes");
}

/** Melyik réteg felelt — a felület mindig kiírja (AI Act 50. cikk, CLAUDE.md 5–6. szabály). */
export type AiForras = { reteg: 0 | 1; modell?: string };

export type AiEredmenyAlap =
  | { allapot: "ismeretlen" }
  | { allapot: "hiba"; uzenet: string }
  | { allapot: "kerdes"; uzenet: string }
  | {
      allapot: "javaslat";
      partnerId: string;
      partnerNev: string;
      tetelBemenetek: TetelBemenet[];
      elonezet: AjanlatSzamitasSiker;
      feltetelezesek: string[];
    }
  | { allapot: "naptar_letrehozva"; esemenyId: string; cim: string; kezdetSzoveg: string }
  | {
      allapot: "partner_helyzet";
      partnerId: string;
      partnerNev: string;
      fuggoAjanlat: number;
      utolsoAjanlat: { id: string; sorszam: string; brutto: number; allapot: string } | null;
      nyitottMunka: number;
      nyitottSzamlaDarab: number;
      nyitottSzamlaOsszeg: number;
      lejartSzamlaOsszeg: number;
    }
  | {
      allapot: "feladat_letrehozva";
      feladatId: string;
      cim: string;
      hataridoSzoveg: string | null;
      partnerNev: string | null;
    }
  | {
      allapot: "teendok";
      teendok: { id: string; cim: string; hatarido: string | null; surgos: boolean; partnerNev: string | null }[];
      esemenyek: { id: string; ido: string; cim: string }[];
      /** Egy-két mondat, amit a felület fel is olvashat. */
      felolvasas: string;
    };

export type AiEredmeny = AiEredmenyAlap & AiForras;

type Supabase = Awaited<ReturnType<typeof szerverKliens>>;

function partnerHiba(kereses: { tobb: { nev: string }[] } | { nincs: true }, szoveg: string): AiEredmenyAlap {
  if ("tobb" in kereses) {
    return {
      allapot: "hiba",
      uzenet: `Több partner is illik a "${szoveg}" névre: ${kereses.tobb.map((p) => p.nev).join(", ")}. Írd a teljes nevet, hogy ne találgassak.`,
    };
  }
  return {
    allapot: "hiba",
    uzenet: `Nem találtam "${szoveg}" nevű partnert. Vedd fel előbb a Partnerek között, vagy pontosítsd a nevet.`,
  };
}

/**
 * A szöveges AI-doboz — a lépcsős AI-réteg (CLAUDE.md költségszabály):
 *
 *   0. réteg  determinisztikus minta (lib/szandek.ts)      0 Ft
 *   1. réteg  olcsó modell, zárt sémával (lib/ai/reteg1.ts) csak ha a 0. nem
 *             ismerte fel; naplózva az ai_naplo-ba; napi plafonnal;
 *             hiányzó adatnál KÉRDEZ, nem találgat
 *
 * Mindkét réteg ugyanabba az `Ertelmezes` alakba fordít, és onnan UGYANAZ a
 * determinisztikus kód fut (`vegrehajt`): partner-illesztés, árkalkuláció,
 * jóváhagyás. A modell megért, nem számol.
 *
 * Az ajánlat-szándéknál csak OLVAS — a tényleges ajánlat a
 * `aiJavaslatJovahagyasa`-val, külön jóváhagyás után jön létre. A naptár-
 * és teendő-szándék azonnal ír (belső nyilvántartás, nem külső hatású
 * művelet — lásd db/migraciok/0006_naptar.sql). A partner-helyzet csak olvas.
 */
export async function aiErtelmezes(nyersSzoveg: string): Promise<AiEredmeny> {
  const supabase = await szerverKliens();
  const ma = budapestMaDatum();

  let ertelmezes: Ertelmezes = ertelmezSzoveg(nyersSzoveg);
  let forras: AiForras = { reteg: 0 };

  if (ertelmezes.szandek === "ismeretlen") {
    if (!aiBekotve()) return { allapot: "ismeretlen", reteg: 0 };
    if (await napiPlafonElerve(supabase)) {
      return {
        allapot: "hiba",
        reteg: 0,
        uzenet: "A mai modellhívás-keret elfogyott (védelem elszabadult költség ellen) — holnap újra, vagy fogalmazd a fenti minták szerint.",
      };
    }

    const [{ data: partnerek }, { data: csomagok }, { felhasznalo }] = await Promise.all([
      supabase.from("partnerek").select("nev").eq("archivalt", false).order("nev").limit(60),
      supabase.from("munkacsomagok").select("nev").eq("aktiv", true).order("nev").limit(30),
      sajatCegVagyIranyitas(),
    ]);
    const bemenetAdatok = {
      szoveg: nyersSzoveg,
      ma,
      maNapNeve: new Date(`${ma}T12:00:00`).toLocaleDateString("hu-HU", { weekday: "long" }),
      partnerNevek: (partnerek ?? []).map((p) => p.nev),
      csomagNevek: (csomagok ?? []).map((c) => c.nev),
    };

    const valasz = await reteg1Felismeres(bemenetAdatok);
    if (!valasz.ok) {
      return { allapot: "hiba", reteg: 1, uzenet: `A modell most nem válaszolt (${valasz.uzenet}). Próbáld a fenti minták szerint.` };
    }
    // 2. sarkalatos szabály: mit látott a modell, mit adott vissza, mennyiért.
    await aiNaplozas(supabase, {
      muvelet: "szandek_felismeres",
      reteg: 1,
      modell: valasz.modell,
      bemenet: { utasitas: "RETEG1_UTASITAS", bemenet: reteg1Bemenet(bemenetAdatok) },
      kimenet: valasz.adat as unknown as Json,
      tokenBe: valasz.tokenBe,
      tokenKi: valasz.tokenKi,
      tokenCache: valasz.tokenCache,
      felhasznaloId: felhasznalo?.id ?? null,
    });
    forras = { reteg: 1, modell: valasz.modell };

    const lekepezes = reteg1Ertelmezesse(valasz.adat);
    if (lekepezes.szandek === "kerdes") return { allapot: "kerdes", uzenet: lekepezes.kerdes, ...forras };
    if (lekepezes.szandek === "ismeretlen") return { allapot: "ismeretlen", ...forras };
    ertelmezes = lekepezes;
  }

  // Ide csak konkrét szándékkal jutunk: a fenti ág minden más úton visszatért.
  const eredmeny = await vegrehajt(supabase, ertelmezes, ma);
  return { ...eredmeny, ...forras };
}

async function vegrehajt(
  supabase: Supabase,
  ertelmezes: Exclude<Ertelmezes, { szandek: "ismeretlen" }>,
  ma: string,
): Promise<AiEredmenyAlap> {
  if (ertelmezes.szandek === "feladat_felvetel") {
    // A partner opcionális, és CSAK biztos találatnál kötjük hozzá: a teendő
    // címe szabad szöveg ("nagyon fontos a beton" nem a Nagy Kft.-ről szól).
    const { data: partnerek } = await supabase.from("partnerek").select("id, nev").eq("archivalt", false);
    const kereses = partnerKereses(partnerek ?? [], ertelmezes.cim);
    const partner = "partner" in kereses && kereses.biztos ? kereses.partner : null;

    const hatarido =
      ertelmezes.datumIso ?? (ertelmezes.napszo ? napszoDatumma(ertelmezes.napszo, ma) : null);

    const { data: feladat, error } = await supabase
      .from("feladatok")
      .insert({ cim: ertelmezes.cim, hatarido, partner_id: partner?.id ?? null, forras: "ai_doboz" })
      .select("id, cim, hatarido")
      .single();
    if (error || !feladat) {
      return { allapot: "hiba", uzenet: error?.message ?? "A teendő létrehozása sikertelen." };
    }

    revalidatePath("/feladatok");
    revalidatePath("/");

    return {
      allapot: "feladat_letrehozva",
      feladatId: feladat.id,
      cim: feladat.cim,
      hataridoSzoveg: feladat.hatarido
        ? new Date(feladat.hatarido).toLocaleDateString("hu-HU", { weekday: "long", month: "long", day: "numeric" })
        : null,
      partnerNev: partner?.nev ?? null,
    };
  }

  if (ertelmezes.szandek === "teendok") {
    // "Mik a teendőim?" — csak olvas; a válasz egy-két felolvasható mondat a
    // saját adatokból (nyitott teendők + mai időpontok), nem modell-szöveg.
    const [{ data: teendok }, { data: esemenyek }] = await Promise.all([
      supabase
        .from("feladatok")
        .select("id, cim, hatarido, surgos, partnerek(nev)")
        .eq("allapot", "nyitott")
        .order("surgos", { ascending: false })
        .order("hatarido", { ascending: true, nullsFirst: false })
        .limit(10),
      supabase
        .from("naptar_esemenyek")
        .select("id, cim, kezdet")
        .gte("kezdet", `${ma}T00:00:00+02:00`)
        .lte("kezdet", `${ma}T23:59:59+02:00`)
        .order("kezdet"),
    ]);
    const t = (teendok ?? []).map((x) => ({
      id: x.id,
      cim: x.cim,
      hatarido: x.hatarido,
      surgos: x.surgos,
      partnerNev: x.partnerek?.nev ?? null,
    }));
    const e = (esemenyek ?? []).map((x) => ({ id: x.id, ido: budapestIdoString(x.kezdet), cim: x.cim }));
    const surgos = t.filter((x) => x.surgos).length;
    const mondatok = [
      t.length
        ? `Ma ${t.length} nyitott teendőd van${surgos ? `, ebből ${surgos} sürgős` : ""}: ${t.slice(0, 3).map((x) => x.cim).join(", ")}${t.length > 3 ? ` és még ${t.length - 3}` : ""}.`
        : "Ma nincs nyitott teendőd.",
      e.length ? `A naptárban ma: ${e.map((x) => `${x.ido} ${x.cim}`).join(", ")}.` : "Mai időpontod nincs.",
    ];
    return { allapot: "teendok", teendok: t, esemenyek: e, felolvasas: mondatok.join(" ") };
  }

  if (ertelmezes.szandek === "partner_helyzet") {
    const { data: partnerek } = await supabase.from("partnerek").select("id, nev").eq("archivalt", false);
    const kereses = partnerKereses(partnerek ?? [], ertelmezes.partnerSzoveg);
    if (!("partner" in kereses)) return partnerHiba(kereses, ertelmezes.partnerSzoveg);
    const partner = kereses.partner; // tipp is elfogadható: a kártya kimondja a nevet, és csak olvasunk

    const [{ data: ajanlatok }, { count: nyitottMunka }, { data: szamlak }] = await Promise.all([
      supabase
        .from("ajanlatok")
        .select("id, sorszam, brutto, allapot, ervenyes_ig")
        .eq("partner_id", partner.id)
        .order("kelt", { ascending: false }),
      supabase
        .from("munkak")
        .select("*", { count: "exact", head: true })
        .eq("partner_id", partner.id)
        .neq("allapot", "befejezve"),
      supabase
        .from("szamlak")
        .select("brutto, fizetesi_hatarido, allapot")
        .eq("partner_id", partner.id)
        .eq("irany", "kimeno"),
    ]);

    const fuggoAjanlat = (ajanlatok ?? []).filter(
      (a) => (a.allapot === "piszkozat" || a.allapot === "kikuldve") && !ajanlatLejartE(a, ma),
    ).length;
    const utolso = ajanlatok?.[0] ?? null;
    const kintlevoseg = kintlevosegOsszesites(
      (szamlak ?? []).map((sz) => ({
        partner: partner.nev,
        brutto: sz.brutto ?? 0,
        hatarido: sz.fizetesi_hatarido ?? ma,
        allapot: sz.allapot,
      })),
      ma,
    );

    return {
      allapot: "partner_helyzet",
      partnerId: partner.id,
      partnerNev: partner.nev,
      fuggoAjanlat,
      utolsoAjanlat: utolso
        ? {
            id: utolso.id,
            sorszam: utolso.sorszam,
            brutto: utolso.brutto,
            allapot: ajanlatLejartE(utolso, ma) ? "lejart" : utolso.allapot,
          }
        : null,
      nyitottMunka: nyitottMunka ?? 0,
      nyitottSzamlaDarab: kintlevoseg.nyitottDarab,
      nyitottSzamlaOsszeg: kintlevoseg.nyitottOsszesen,
      lejartSzamlaOsszeg: kintlevoseg.lejartOsszesen,
    };
  }

  if (ertelmezes.szandek === "naptar_esemeny") {
    const { data: partnerek } = await supabase.from("partnerek").select("id, nev").eq("archivalt", false);
    const kereses = partnerKereses(partnerek ?? [], ertelmezes.partnerSzoveg);
    if (!("partner" in kereses)) return partnerHiba(kereses, ertelmezes.partnerSzoveg);
    const partner = kereses.partner; // tipp is elfogadható: a válasz a címben visszamondja a nevet

    const datum =
      ertelmezes.datumIso ?? (ertelmezes.napszo ? napszoDatumma(ertelmezes.napszo, ma) : null);
    if (!datum) return { allapot: "hiba", uzenet: "Nem sikerült értelmezni, melyik napra gondoltál." };

    const kezdetIso = budapestIdopontIso(datum, ertelmezes.oraSzoveg);
    const cim = ertelmezes.leiras
      ? `${ertelmezes.leiras.charAt(0).toUpperCase()}${ertelmezes.leiras.slice(1)} — ${partner.nev}`
      : `Találkozó — ${partner.nev}`;

    const { data: esemeny, error } = await supabase
      .from("naptar_esemenyek")
      .insert({ cim, kezdet: kezdetIso })
      .select("id, cim, kezdet")
      .single();
    if (error || !esemeny) {
      return { allapot: "hiba", uzenet: error?.message ?? "Az esemény létrehozása sikertelen." };
    }

    revalidatePath("/naptar");
    revalidatePath("/");

    return {
      allapot: "naptar_letrehozva",
      esemenyId: esemeny.id,
      cim: esemeny.cim,
      kezdetSzoveg: new Date(esemeny.kezdet).toLocaleString("hu-HU", {
        timeZone: "Europe/Budapest",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }

  // ---- ajánlat ----------------------------------------------------------

  const { data: partnerek } = await supabase
    .from("partnerek")
    .select("id, nev, kedvezmeny_szazalek")
    .eq("archivalt", false)
    // Ajánlatot ügyfélnek adunk: a beszállító (pl. Kovács Tüzép) nem jelölt —
    // a kézi ajánlatűrlap partnerlistája is így szűr.
    .eq("szallito", false);
  const kereses = partnerKereses(partnerek ?? [], ertelmezes.partnerSzoveg);
  if (!("partner" in kereses)) return partnerHiba(kereses, ertelmezes.partnerSzoveg);
  const partner = kereses.partner;

  const hu = new Intl.NumberFormat("hu-HU");
  const feltetelezesek: string[] = [];
  let tetelBemenetek: TetelBemenet[];

  // A mondat vége ("… 50 m²-re térkövezés") egy MUNKACSOMAG neve lehet
  // (vízió-dokumentum "Wow #1"). Pontos vagy egyértelmű részleges egyezésnél
  // a csomag tételeit vesszük a saját arányaikkal; több jelöltnél kérdezünk;
  // ha nincs ilyen csomag, marad a régi, őszinte közelítés (minden m²-es
  // tétel), és a feltételezés kimondja, hogy a csomagot nem találtuk.
  const { data: csomagok } = await supabase
    .from("munkacsomagok")
    .select("id, nev, mertekegyseg, munkacsomag_tetelek(termek_id, mennyiseg_egysegre, alap, termekek(nev, aktiv, mertekegyseg))")
    .eq("aktiv", true)
    .order("nev");
  const csomagCel = ertelmezes.leiras?.trim() ?? "";
  let csomagTalalat = csomagCel ? csomagKereses(csomagok ?? [], csomagCel) : { nincs: true as const };

  // Ha a mondat NEM nevez meg munkacsomagot: egyetlen m²-alapú csomagnál
  // azzal számolunk (a feltételezés kimondja), többnél rákérdezünk — nem
  // találgatunk (CLAUDE.md 5.). Csomag nélkül marad a régi közelítés.
  const m2Csomagok = (csomagok ?? []).filter((c) => M2_ALIASOK.has(norm(c.mertekegyseg)));
  let alapertelmezettCsomag = false;
  if (!csomagCel && m2Csomagok.length === 1) {
    csomagTalalat = { csomag: m2Csomagok[0] };
    alapertelmezettCsomag = true;
  }
  if (!csomagCel && m2Csomagok.length > 1) {
    return {
      allapot: "kerdes",
      uzenet: `Melyik munkára készüljön az ajánlat: ${m2Csomagok.map((c) => c.nev).join(", ")}? Mondd a munka nevét a mondat végén.`,
    };
  }

  if ("tobb" in csomagTalalat) {
    return {
      allapot: "hiba",
      uzenet: `Több munkacsomag is illik a „${csomagCel}” leírásra: ${csomagTalalat.tobb.map((c) => c.nev).join(", ")}. Írd a csomag teljes nevét, hogy ne találgassak.`,
    };
  }

  if ("csomag" in csomagTalalat) {
    const csomag = csomagTalalat.csomag;
    // A mondatban m² van — egy fm/db alapú csomagot nem számolunk át csendben.
    if (!M2_ALIASOK.has(norm(csomag.mertekegyseg))) {
      return {
        allapot: "hiba",
        uzenet: `A „${csomag.nev}” csomag alapegysége ${csomag.mertekegyseg}, te viszont ${hu.format(ertelmezes.m2)} m²-t mondtál — nem számolok át. Add meg ${csomag.mertekegyseg}-ben a kézi űrlapon (Munkacsomagból), vagy válassz m²-alapú csomagot.`,
      };
    }
    if (!csomag.munkacsomag_tetelek.length) {
      return { allapot: "hiba", uzenet: `A „${csomag.nev}” csomagban még nincs tétel — töltsd fel az Árlista → Munkacsomagok alatt.` };
    }
    const inaktivak = csomag.munkacsomag_tetelek.filter((t) => !t.termekek?.aktiv).map((t) => t.termekek?.nev ?? "?");
    if (inaktivak.length) {
      return {
        allapot: "hiba",
        uzenet: `A „${csomag.nev}” csomag inaktív tételre hivatkozik (${inaktivak.join(", ")}) — aktiváld újra az Árlistán, vagy vedd ki a csomagból, és próbáld újra.`,
      };
    }
    tetelBemenetek = csomagTetelBemenetek(
      csomag.munkacsomag_tetelek.map((t) => ({ ...t, mertekegyseg: t.termekek?.mertekegyseg })),
      ertelmezes.m2,
    );
    feltetelezesek.push(
      alapertelmezettCsomag
        ? `${hu.format(ertelmezes.m2)} m²-re a „${csomag.nev}” munkacsomaggal számoltam, mert ez az egyetlen munkacsomagod.`
        : `${hu.format(ertelmezes.m2)} m² „${csomag.nev}” munkacsomag alapján számoltam, a csomag tételarányaival.`,
    );
    if (vanKeruletesTetel(csomag.munkacsomag_tetelek)) {
      feltetelezesek.push(
        `A kerülethez arányos tételeket, például a szegélyt, ${keruletBecsles(ertelmezes.m2)} fm becsült kerülettel számoltam, négyzet alakú területet feltételezve. Ha más az alak, a piszkozatban módosítsd a mennyiséget.`,
      );
    }
  } else {
    // Nem tudjuk, pontosan melyik munkára gondolt a mondat — ezért az
    // árlista m²-ben árazott tételeit használjuk, ahogy a "feltételezések"
    // sávon is látszik. Ez őszintén jelzi, mit tett fel a rendszer, nem
    // próbál kitalálni egy konkrét munkatípust.
    const { data: m2Termekek } = await supabase
      .from("termekek")
      .select("id")
      .eq("aktiv", true)
      .eq("mertekegyseg", "m2");
    if (!m2Termekek?.length) {
      return {
        allapot: "hiba",
        uzenet: "Nincs m²-ben árazott tételed az árlistában — vegyél fel legalább egyet, hogy legyen miből számolnom.",
      };
    }
    tetelBemenetek = m2Termekek.map((t) => ({ termekId: t.id, mennyiseg: ertelmezes.m2 }));
    if (csomagCel) {
      feltetelezesek.push(`„${csomagCel}” nevű munkacsomagot nem találtam, ezért az árlistád m²-ben árazott tételeivel számoltam.`);
    } else {
      feltetelezesek.push(`${hu.format(ertelmezes.m2)} m² alapján számoltam, az árlistád m²-ben árazott tételeivel.`);
      if (csomagok?.length) {
        feltetelezesek.push(`Ha egy munkacsomagra gondoltál (${csomagok.map((c) => c.nev).join(", ")}), írd a mondat végére, és a csomag tételeivel számolok.`);
      }
    }
  }

  const elonezet = await ajanlatSzamitas(supabase, partner.id, tetelBemenetek);
  if ("hiba" in elonezet) return { allapot: "hiba", uzenet: elonezet.hiba };

  feltetelezesek[0] += ` Tételek: ${elonezet.tetelek.map((t) => t.megnevezes).join(", ")}.`;
  if (!kereses.biztos) {
    feltetelezesek.push(`„${ertelmezes.partnerSzoveg}” alapján ${partner.nev} partnert választottam — ha másra gondoltál, zárd be, és írd a teljes nevet.`);
  }
  if (partner.kedvezmeny_szazalek > 0) {
    feltetelezesek.push(`${partner.kedvezmeny_szazalek}% törzsvásárlói kedvezményt alkalmaztam ${partner.nev} adatlapja alapján.`);
  }
  // A "piszkozat marad" figyelmeztetés a jóváhagyó lap állandó szövege, nem
  // feltételezés — ezért nincs itt: a feltételezések az ajánlatra is rákerülnek.

  return {
    allapot: "javaslat",
    partnerId: partner.id,
    partnerNev: partner.nev,
    tetelBemenetek,
    elonezet,
    feltetelezesek,
  };
}

/**
 * A jóváhagyó lapon a "Jóváhagyom és létrehozom" gomb — a kliens csak azt
 * küldi vissza, MIT választott (partner + tétel/mennyiség), az árat a
 * szerver mindig újraszámolja az `ajanlatSzamitas`-on keresztül. Ugyanaz
 * az elv, mint a kézi ajánlatűrlapnál.
 */
export async function aiJavaslatJovahagyasa(
  partnerId: string,
  tetelBemenetek: TetelBemenet[],
  feltetelezesek: unknown = [],
) {
  const { ceg } = await sajatCegVagyIranyitas();
  if (!ceg) return { hiba: "Nem található a céged." } as const;

  const supabase = await szerverKliens();
  const szamitas = await ajanlatSzamitas(supabase, partnerId, tetelBemenetek);
  if ("hiba" in szamitas) return { hiba: szamitas.hiba } as const;

  // Amit a jóváhagyó lap "Amit feltételeztem" dobozában látott, az ajánlaton
  // is megmarad (CLAUDE.md 2. és 5. szabály). Szövegként jön a klienstől,
  // ezért méretkorlát: legfeljebb 10 tétel, tételenként 600 karakter.
  const feltetelezesLista = (Array.isArray(feltetelezesek) ? feltetelezesek : [])
    .filter((f): f is string => typeof f === "string")
    .slice(0, 10)
    .map((f) => f.slice(0, 600));
  const eredmeny = await ajanlatMentese(supabase, ceg.id, partnerId, szamitas, feltetelezesLista);
  if ("hiba" in eredmeny) return eredmeny;

  revalidatePath("/ajanlatok");
  revalidatePath("/");
  return eredmeny;
}
