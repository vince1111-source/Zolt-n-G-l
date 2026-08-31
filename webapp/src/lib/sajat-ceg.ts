import { redirect } from "next/navigation";
import { szerverKliens } from "./supabase/server";

/**
 * A bejelentkezett felhasználó cége és saját felhasznalok-sora.
 *
 * Ha valaki megerősítette az e-mailjét, de valamiért (megszakadt kérés,
 * régi munkamenet) még nincs `felhasznalok` sora, visszairányítjuk a
 * regisztrációra — inkább kérdez, mint hogy kitalál egy céget.
 */
export async function sajatCegVagyIranyitas() {
  const supabase = await szerverKliens();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/bejelentkezes");
  }

  const { data: felhasznalo } = await supabase
    .from("felhasznalok")
    .select("id, nev, ceg_id, szerep")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!felhasznalo) {
    redirect("/regisztracio/ellenorizd-az-e-mailt");
  }

  const { data: ceg } = await supabase
    .from("cegek")
    .select("*")
    .eq("id", felhasznalo.ceg_id)
    .single();

  return { user, felhasznalo, ceg };
}
