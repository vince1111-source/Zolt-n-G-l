"use server";

import { revalidatePath } from "next/cache";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";

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
