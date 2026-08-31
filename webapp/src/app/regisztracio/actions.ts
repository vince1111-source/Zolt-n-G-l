"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";

export type RegisztracioAllapot = { hiba?: string };

async function sajatOrigin() {
  const fejlecek = await headers();
  const host = fejlecek.get("host") ?? "localhost:3000";
  const protokoll = host.startsWith("localhost") ? "http" : "https";
  return `${protokoll}://${host}`;
}

export async function regisztracio(
  _elozo: RegisztracioAllapot,
  adat: FormData,
): Promise<RegisztracioAllapot> {
  const email = String(adat.get("email") ?? "").trim();
  const jelszo = String(adat.get("jelszo") ?? "");
  const cegNev = String(adat.get("ceg_nev") ?? "").trim();
  const sajatNev = String(adat.get("sajat_nev") ?? "").trim();

  if (!email || !jelszo) {
    return { hiba: "Add meg az e-mail címed és egy jelszót." };
  }
  if (jelszo.length < 8) {
    return { hiba: "A jelszó legalább 8 karakter legyen." };
  }
  if (!cegNev) {
    return { hiba: "A cégnév kötelező." };
  }

  const supabase = await szerverKliens();
  const origin = await sajatOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: jelszo,
    options: {
      data: { ceg_nev: cegNev, sajat_nev: sajatNev },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return {
      hiba:
        error.code === "user_already_exists"
          ? "Ezzel az e-mail címmel már van fiók — jelentkezz be."
          : error.message,
    };
  }

  // Ha a projekt automatikusan megerősíti az e-mailt, azonnal van
  // munkamenetünk — ilyenkor most hozzuk létre a céget, nem várunk a
  // megerősítő linkre (amit ez esetben Supabase nem is küld ki).
  if (data.session) {
    const { error: cegHiba } = await supabase.rpc("sajat_ceg_letrehozasa", {
      p_ceg_nev: cegNev,
      p_felhasznalo_nev: sajatNev,
    });
    if (cegHiba) return { hiba: cegHiba.message };
    redirect("/");
  }

  redirect("/regisztracio/ellenorizd-az-e-mailt");
}
