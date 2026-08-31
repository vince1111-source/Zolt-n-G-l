import { redirect } from "next/navigation";
import { szerverKliens } from "./supabase/server";

/**
 * A bejelentkezett felhasználó cége és saját felhasznalok-sora.
 *
 * Ha valaki idáig eljutott, a munkamenete már érvényes — az e-mailje
 * tehát megerősítve. Ha ennek ellenére nincs `felhasznalok` sora (mert a
 * megerősítő link nem a várt alakban futott le, és a cég soha nem jött
 * létre), a helyes irány a regisztráció BEFEJEZÉSE, nem az „ellenőrizd az
 * e-mailt" — azt a lapot csak a még be sem jelentkezett látja.
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
    redirect("/regisztracio/befejezes");
  }

  const { data: ceg } = await supabase
    .from("cegek")
    .select("*")
    .eq("id", felhasznalo.ceg_id)
    .single();

  return { user, felhasznalo, ceg };
}
