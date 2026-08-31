"use server";

import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";

export type BejelentkezesAllapot = { hiba?: string };

export async function bejelentkezes(
  _elozo: BejelentkezesAllapot,
  adat: FormData,
): Promise<BejelentkezesAllapot> {
  const email = String(adat.get("email") ?? "").trim();
  const jelszo = String(adat.get("jelszo") ?? "");

  if (!email || !jelszo) {
    return { hiba: "Add meg az e-mail címed és a jelszavad." };
  }

  const supabase = await szerverKliens();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: jelszo,
  });

  if (error) {
    return {
      hiba:
        error.code === "invalid_credentials"
          ? "Hibás e-mail cím vagy jelszó."
          : error.code === "email_not_confirmed"
            ? "Az e-mail címed még nincs megerősítve — nézd meg a postaládád."
            : error.message,
    };
  }

  redirect("/");
}
