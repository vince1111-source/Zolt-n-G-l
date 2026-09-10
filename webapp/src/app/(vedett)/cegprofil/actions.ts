"use server";

import { revalidatePath } from "next/cache";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { flashUzenet } from "@/lib/flash";

export type CegprofilAllapot = { hiba?: string; siker?: boolean };

export async function cegprofilMentese(
  _elozo: CegprofilAllapot,
  adat: FormData,
): Promise<CegprofilAllapot> {
  const { ceg } = await sajatCegVagyIranyitas();
  if (!ceg) return { hiba: "Nem található a céged." };

  const supabase = await szerverKliens();

  const nev = String(adat.get("nev") ?? "").trim();
  if (!nev) return { hiba: "A cégnév kötelező." };

  const { error } = await supabase
    .from("cegek")
    .update({
      nev,
      adoszam: String(adat.get("adoszam") ?? "").trim() || null,
      cim: String(adat.get("cim") ?? "").trim() || null,
      bankszamla: String(adat.get("bankszamla") ?? "").trim() || null,
      email: String(adat.get("email") ?? "").trim() || null,
      telefon: String(adat.get("telefon") ?? "").trim() || null,
    })
    .eq("id", ceg.id);

  if (error) return { hiba: error.message };

  revalidatePath("/cegprofil");
  revalidatePath("/");
  return { siker: true };
}

/**
 * A cég logójának feltöltése — az ajánlat-dokumentum fejlécén jelenik meg
 * (lásd `ajanlatok/[id]/dokumentum/page.tsx`). A `ceg-logok` bucket
 * nyilvános (lásd db/migraciok/0016_ceg_logo.sql), de a feltöltés/csere
 * továbbra is csak a saját cégnek engedett — ezt a Storage RLS-policy
 * kényszeríti ki, nem ez a szerver-akció.
 */
export async function logoFeltoltese(
  _elozo: CegprofilAllapot,
  adat: FormData,
): Promise<CegprofilAllapot> {
  const { ceg } = await sajatCegVagyIranyitas();
  if (!ceg) return { hiba: "Nem található a céged." };

  const fajl = adat.get("logo");
  if (!(fajl instanceof File) || fajl.size === 0) {
    return { hiba: "Válassz egy képfájlt." };
  }
  if (!fajl.type.startsWith("image/")) {
    return { hiba: "Csak képfájl tölthető fel (pl. PNG vagy JPG)." };
  }
  if (fajl.size > 2 * 1024 * 1024) {
    return { hiba: "A kép legfeljebb 2 MB lehet." };
  }

  const supabase = await szerverKliens();
  const utvonal = `${ceg.id}/logo`;

  const { error: feltoltesHiba } = await supabase.storage
    .from("ceg-logok")
    .upload(utvonal, fajl, { upsert: true, contentType: fajl.type });
  if (feltoltesHiba) return { hiba: feltoltesHiba.message };

  const { data: publikus } = supabase.storage.from("ceg-logok").getPublicUrl(utvonal);
  // A cache-busterre azért van szükség, mert a fájl útvonala (és így a
  // publikus URL-je) csere után is UGYANAZ marad — enélkül a böngésző/CDN
  // a régi logót tartaná meg gyorsítótárban.
  const logoUrl = `${publikus.publicUrl}?v=${Date.now()}`;

  const { error: mentesHiba } = await supabase
    .from("cegek")
    .update({ logo_url: logoUrl })
    .eq("id", ceg.id);
  if (mentesHiba) return { hiba: mentesHiba.message };

  revalidatePath("/cegprofil");
  return { siker: true };
}

/**
 * Új, kitalálhatatlan naptár-feed tokent generál a cégnek — a régi
 * feed URL ettől kezdve érvénytelen (a naptáralkalmazás, ami rá volt
 * iratkozva, 404-et fog kapni). Erre akkor van szükség, ha a link
 * illetéktelen kézbe került.
 *
 * A tulajdonos-ellenőrzést a `naptar_feed_token_ujrageneralasa` SECURITY
 * DEFINER RPC végzi, adatbázis-szinten — nem elég, hogy a felület csak a
 * tulajdonosnak mutatja a gombot (lásd db/migraciok/
 * 0014_naptar_feed_biztonsagi_javitasok.sql).
 */
export async function naptarFeedTokenUjrageneralasa() {
  const supabase = await szerverKliens();
  const { error } = await supabase.rpc("naptar_feed_token_ujrageneralasa");
  if (error) return { hiba: error.message };

  revalidatePath("/cegprofil");
  return {};
}

// ---------------------------------------------------------------------------
// Munkatárs meghívása (0022): a tulajdonos felvesz egy e-mailt, a meghívott
// a saját címével regisztrál, és a rendszer a megerősítés után ehhez a
// céghez köti — nem jön létre neki üres saját cég, és senki nem ad kézbe
// jelszót. Az írásjogot az RLS is a tulajdonosra szűkíti; az itteni
// ellenőrzés a barátságos hibaüzenetért van.
// ---------------------------------------------------------------------------

export type MeghivasAllapot = { hiba?: string };

export async function munkatarsMeghivasa(
  _elozo: MeghivasAllapot,
  adat: FormData,
): Promise<MeghivasAllapot> {
  const { ceg, felhasznalo } = await sajatCegVagyIranyitas();
  if (!ceg) return { hiba: "Nem található a céged." };
  if (felhasznalo.szerep !== "tulajdonos") return { hiba: "Csak a tulajdonos hívhat meg munkatársat." };

  const email = String(adat.get("email") ?? "").trim().toLowerCase();
  const nev = String(adat.get("nev") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { hiba: "Adj meg egy érvényes e-mail címet." };

  const supabase = await szerverKliens();
  const { error } = await supabase
    .from("felhasznalok")
    .insert({ ceg_id: ceg.id, nev: nev || email, email, szerep: "munkatars" });
  if (error) {
    return {
      hiba:
        error.code === "23505"
          ? "Ez az e-mail már meg van hívva, vagy már tagja a cégnek."
          : error.message,
    };
  }

  await flashUzenet("siker", `Meghívva: ${email} — ha ezzel a címmel regisztrál, ide kerül.`);
  revalidatePath("/cegprofil");
  return {};
}

export async function meghivasVisszavonasa(id: string) {
  const { felhasznalo } = await sajatCegVagyIranyitas();
  if (felhasznalo.szerep !== "tulajdonos") return;
  const supabase = await szerverKliens();
  // Az RLS csak a még nem regisztrált (auth_user_id is null) sort engedi törölni.
  await supabase.from("felhasznalok").delete().eq("id", id).is("auth_user_id", null);
  revalidatePath("/cegprofil");
}
