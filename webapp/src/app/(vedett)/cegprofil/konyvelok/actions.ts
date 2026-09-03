"use server";

import { revalidatePath } from "next/cache";
import { szerverKliens } from "@/lib/supabase/server";
import { szolgaltatasKliens } from "@/lib/supabase/admin";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";

export type MeghivasAllapot = { hiba?: string; siker?: string };

export async function konyveloMeghivasa(
  _elozo: MeghivasAllapot,
  adat: FormData,
): Promise<MeghivasAllapot> {
  const email = String(adat.get("email") ?? "").trim();
  if (!email) return { hiba: "Az e-mail cím kötelező." };

  await sajatCegVagyIranyitas(); // csak a jogosultság-ellenőrzés kedvéért — a tényleges kényszer az RPC-ben/RLS-ben van
  const supabase = await szerverKliens();

  // 1) megnézzük, van-e már könyvelő-fiók erre az e-mailre — ha igen, az
  // RPC azonnal hozzáférést ad, nincs szükség új Auth-meghívóra.
  const { data: letezoKonyveloId, error: igenylesHiba } = await supabase.rpc(
    "konyvelo_hozzaferes_igenylese",
    { p_email: email },
  );
  if (igenylesHiba) return { hiba: igenylesHiba.message };

  if (letezoKonyveloId) {
    revalidatePath("/cegprofil/konyvelok");
    return { siker: "A könyvelő már használja a rendszert — hozzáférést kapott a cégedhez." };
  }

  // 2) nincs még fiókja — a Supabase Auth Admin API-val küldünk neki
  // meghívót. Ez az EGYETLEN hely, ahol a service-role kliens előkerül —
  // az adatírás (felhasznalok/konyvelo_hozzaferes sor) a lenti RPC-n
  // megy, a mi saját, RLS alá eső munkamenetünkből, nem ezen a kliensen.
  let ujFelhasznaloId: string;
  try {
    const admin = szolgaltatasKliens();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/konyvelo/jelszo`,
    });
    if (error || !data.user) return { hiba: error?.message ?? "A meghívó kiküldése sikertelen." };
    ujFelhasznaloId = data.user.id;
  } catch (e) {
    return { hiba: e instanceof Error ? e.message : "A meghívó kiküldése sikertelen." };
  }

  const { error: veglegesitesHiba } = await supabase.rpc("konyvelo_meghivas_veglegesitese", {
    p_auth_user_id: ujFelhasznaloId,
    p_email: email,
  });
  if (veglegesitesHiba) return { hiba: veglegesitesHiba.message };

  revalidatePath("/cegprofil/konyvelok");
  return { siker: "Meghívó kiküldve — a könyvelő e-mailben kap linket a belépéshez." };
}

export async function konyveloVisszavonasa(hozzaferesId: string) {
  const supabase = await szerverKliens();
  await supabase
    .from("konyvelo_hozzaferes")
    .update({ visszavonva: new Date().toISOString() })
    .eq("id", hozzaferesId);
  revalidatePath("/cegprofil/konyvelok");
}
