"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { ertelmezSzoveg, norm } from "@/lib/szandek";
import { budapestMaDatum, budapestIdopontIso, napszoDatumma } from "@/lib/het";
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
  | { allapot: "naptar_letrehozva"; esemenyId: string; cim: string; kezdetSzoveg: string };

/**
 * A szöveges AI-doboz szándékfelismerése.
 *
 * Az ajánlat-szándéknál csak OLVAS, nem ír semmit — a tényleges ajánlat a
 * `aiJavaslatJovahagyasa`-val, külön jóváhagyás után jön létre (lásd
 * `JovahagyoLap`), mert egy ajánlat valódi pénzügyi adatot hordoz, amit
 * érdemes átnézni létrehozás előtt.
 *
 * A naptár-szándéknál (vízió-dokumentum "Wow #2") NINCS külön jóváhagyó
 * lap — az esemény azonnal létrejön, és a válasz megmutatja, mit értett a
 * rendszer. Ez szándékos, nem következetlenség: a `naptar_esemenyek`
 * tábla saját maga sem megy a `javasolt_muveletek` kapun (lásd
 * db/migraciok/0006_naptar.sql) — belső, bármikor szabadon szerkeszthető/
 * törölhető nyilvántartás, nem külső hatású művelet, mint egy ajánlat
 * kiküldése.
 */
export async function aiErtelmezes(nyersSzoveg: string): Promise<AiEredmeny> {
  const ertelmezes = ertelmezSzoveg(nyersSzoveg);
  if (ertelmezes.szandek === "ismeretlen") return { allapot: "ismeretlen" };

  if (ertelmezes.szandek === "naptar_esemeny") {
    const supabase = await szerverKliens();

    const { data: partnerek } = await supabase
      .from("partnerek")
      .select("id, nev")
      .eq("archivalt", false);
    const cel = norm(ertelmezes.partnerSzoveg);
    const partner = partnerek?.find((p) => {
      const nev = norm(p.nev);
      return nev.includes(cel) || cel.includes(nev);
    });
    if (!partner) {
      return {
        allapot: "hiba",
        uzenet: `Nem találtam "${ertelmezes.partnerSzoveg}" nevű partnert. Vedd fel előbb a Partnerek között, vagy pontosítsd a nevet.`,
      };
    }

    const datum = napszoDatumma(ertelmezes.napszo, budapestMaDatum());
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

  const supabase = await szerverKliens();

  const { data: partnerek } = await supabase
    .from("partnerek")
    .select("id, nev, kedvezmeny_szazalek")
    .eq("archivalt", false);
  const cel = norm(ertelmezes.partnerSzoveg);
  const partner = partnerek?.find((p) => {
    const nev = norm(p.nev);
    return nev.includes(cel) || cel.includes(nev);
  });
  if (!partner) {
    return {
      allapot: "hiba",
      uzenet: `Nem találtam "${ertelmezes.partnerSzoveg}" nevű partnert. Vedd fel előbb a Partnerek között, vagy pontosítsd a nevet.`,
    };
  }

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

  const tetelBemenetek: TetelBemenet[] = m2Termekek.map((t) => ({
    termekId: t.id,
    mennyiseg: ertelmezes.m2,
  }));

  const elonezet = await ajanlatSzamitas(supabase, partner.id, tetelBemenetek);
  if ("hiba" in elonezet) return { allapot: "hiba", uzenet: elonezet.hiba };

  const hu = new Intl.NumberFormat("hu-HU");
  const feltetelezesek = [
    `${hu.format(ertelmezes.m2)} m² alapján számoltam, az árlistád m²-ben árazott tételeivel (${elonezet.tetelek.map((t) => t.megnevezes).join(", ")}).`,
    ...(partner.kedvezmeny_szazalek > 0
      ? [`${partner.kedvezmeny_szazalek}% törzsvásárlói kedvezményt alkalmaztam ${partner.nev} adatlapja alapján.`]
      : []),
    "Ha más tétel is kell (pl. bontás, szegély), jóváhagyás után a kézi ajánlatűrlapon még módosíthatod.",
  ];

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
