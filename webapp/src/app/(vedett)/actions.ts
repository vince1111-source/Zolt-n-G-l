"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { ertelmezSzoveg, norm, partnerKereses, csomagKereses, M2_ALIASOK } from "@/lib/szandek";
import { budapestMaDatum, budapestIdopontIso, napszoDatumma } from "@/lib/het";
import { kintlevosegOsszesites } from "@/lib/mag";
import { csomagTetelBemenetek } from "@/lib/munkacsomag";
import { ajanlatLejartE } from "@/lib/ajanlat-allapot";
import {
  ajanlatSzamitas,
  ajanlatMentese,
  type TetelBemenet,
  type AjanlatSzamitasSiker,
} from "@/lib/ajanlat-szamitas";

export async function kijelentkezes() {
  const supabase = await szerverKliens();
  await supabase.auth.signOut();
  redirect("/bejelentkezes");
}

export type AiEredmeny =
  | { allapot: "ismeretlen" }
  | { allapot: "hiba"; uzenet: string }
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
    };

function partnerHiba(kereses: { tobb: { nev: string }[] } | { nincs: true }, szoveg: string): AiEredmeny {
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
 * A szöveges AI-doboz szándékfelismerése.
 *
 * Az ajánlat-szándéknál csak OLVAS, nem ír semmit — a tényleges ajánlat a
 * `aiJavaslatJovahagyasa`-val, külön jóváhagyás után jön létre (lásd
 * `JovahagyoLap`), mert egy ajánlat valódi pénzügyi adatot hordoz, amit
 * érdemes átnézni létrehozás előtt.
 *
 * A naptár- és teendő-szándéknál (vízió-dokumentum "Wow #2", ill. a
 * prototípus `feladat` parancsa) NINCS külön jóváhagyó lap — a sor azonnal
 * létrejön, és a válasz megmutatja, mit értett a rendszer. Ez szándékos,
 * nem következetlenség: ezek a táblák maguk sem mennek a
 * `javasolt_muveletek` kapun (lásd db/migraciok/0006_naptar.sql) — belső,
 * bármikor szabadon szerkeszthető/törölhető nyilvántartások, nem külső
 * hatású műveletek, mint egy ajánlat kiküldése.
 *
 * A partner-helyzet ("Hogy állunk Kovácssal?") csak olvas.
 *
 * Partner- és csomagnév-illesztés: `partnerKereses` / `csomagKereses`
 * (lib/szandek.ts) — több jelöltnél kérdez, nem választ; a "tipp"
 * szintű partner-találatot a válasz kimondja, a teendő pedig csak biztos
 * találatot köt partnerhez.
 */
export async function aiErtelmezes(nyersSzoveg: string): Promise<AiEredmeny> {
  const ertelmezes = ertelmezSzoveg(nyersSzoveg);
  if (ertelmezes.szandek === "ismeretlen") return { allapot: "ismeretlen" };

  const supabase = await szerverKliens();
  const ma = budapestMaDatum();

  if (ertelmezes.szandek === "feladat_felvetel") {
    // A partner opcionális, és CSAK biztos találatnál kötjük hozzá: a teendő
    // címe szabad szöveg ("nagyon fontos a beton" nem a Nagy Kft.-ről szól).
    const { data: partnerek } = await supabase.from("partnerek").select("id, nev").eq("archivalt", false);
    const kereses = partnerKereses(partnerek ?? [], ertelmezes.cim);
    const partner = "partner" in kereses && kereses.biztos ? kereses.partner : null;

    const hatarido = ertelmezes.napszo ? napszoDatumma(ertelmezes.napszo, ma) : null;

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
    const partner = kereses.partner; // tipp is elfogadható: a válasz a cím­ben visszamondja a nevet

    const datum = napszoDatumma(ertelmezes.napszo, ma);
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
    .eq("archivalt", false);
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
    .select("id, nev, mertekegyseg, munkacsomag_tetelek(termek_id, mennyiseg_egysegre, termekek(nev, aktiv))")
    .eq("aktiv", true)
    .order("nev");
  const csomagCel = ertelmezes.leiras?.trim() ?? "";
  const csomagTalalat = csomagCel ? csomagKereses(csomagok ?? [], csomagCel) : { nincs: true as const };

  if ("tobb" in csomagTalalat) {
    return {
      allapot: "hiba",
      uzenet: `Több munkacsomag is illik a „${csomagCel}” leírásra: ${csomagTalalat.tobb.map((c) => c.nev).join(", ")}. Írd a csomag teljes nevét, hogy ne találgassak.`,
    };
  }

  if ("csomag" in csomagTalalat) {
    const csomag = csomagTalalat.csomag;
    // A mondatban m² van (AJANLAT_MINTA csak azt ismeri) — egy fm/db alapú
    // csomagot nem számolunk át csendben.
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
    tetelBemenetek = csomagTetelBemenetek(csomag.munkacsomag_tetelek, ertelmezes.m2);
    feltetelezesek.push(`${hu.format(ertelmezes.m2)} m² „${csomag.nev}” munkacsomag alapján számoltam, a csomag tételarányaival.`);
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
  feltetelezesek.push("Jóváhagyás után az ajánlat piszkozat marad — a Szerkesztés gombbal még módosíthatod, mielőtt kiküldöd.");

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
) {
  const { ceg } = await sajatCegVagyIranyitas();
  if (!ceg) return { hiba: "Nem található a céged." } as const;

  const supabase = await szerverKliens();
  const szamitas = await ajanlatSzamitas(supabase, partnerId, tetelBemenetek);
  if ("hiba" in szamitas) return { hiba: szamitas.hiba } as const;

  const eredmeny = await ajanlatMentese(supabase, ceg.id, partnerId, szamitas);
  if ("hiba" in eredmeny) return eredmeny;

  revalidatePath("/ajanlatok");
  revalidatePath("/");
  return eredmeny;
}
