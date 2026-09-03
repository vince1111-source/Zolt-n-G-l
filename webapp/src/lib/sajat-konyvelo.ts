import { redirect } from "next/navigation";
import { szerverKliens } from "./supabase/server";

/**
 * A `sajatCegVagyIranyitas()` könyvelői megfelelője. A könyvelőnek nincs
 * "saját cége" — a `felhasznalok.ceg_id` nála mindig NULL (lásd
 * `db/migraciok/0011_konyvelo_hozzaferes.sql` CHECK-je) —, ezért egy
 * teljesen külön, `(vedett)`-en kívüli oldalcsoportot kap.
 */
export async function sajatKonyveloVagyIranyitas() {
  const supabase = await szerverKliens();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/bejelentkezes");

  const { data: felhasznalo } = await supabase
    .from("felhasznalok")
    .select("id, nev, email, szerep")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!felhasznalo || felhasznalo.szerep !== "konyvelo") {
    redirect("/");
  }

  // Amíg a `nev` a placeholder e-mail-cím (a meghívás pillanatában így
  // jön létre, lásd `konyvelo_meghivas_veglegesitese`), a könyvelőnek
  // előbb be kell állítania a jelszavát és a nevét.
  if (felhasznalo.nev === felhasznalo.email) {
    redirect("/konyvelo/jelszo");
  }

  return { user, felhasznalo };
}
