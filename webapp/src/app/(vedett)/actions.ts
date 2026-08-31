"use server";

import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";

export async function kijelentkezes() {
  const supabase = await szerverKliens();
  await supabase.auth.signOut();
  redirect("/bejelentkezes");
}
