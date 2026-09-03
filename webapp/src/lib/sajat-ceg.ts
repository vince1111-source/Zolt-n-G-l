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

  // A könyvelőnek nincs "saját cége" (lásd sajat-konyvelo.ts) — ha ide
  // téved, a saját felületére irányítjuk, nem próbálunk (sikertelenül)
  // egy nemlétező céget betölteni neki. Ez után a `ceg_id` garantáltan
  // nem NULL (a `felhasznalok_konyvelo_ceg_nelkul` DB-kényszer szerint
  // kizárólag 'konyvelo' szerepnél lehet az) — a generált típus ezt nem
  // tudja kifejezni, innen a `!`.
  if (felhasznalo.szerep === "konyvelo") {
    redirect("/konyvelo");
  }

  const { data: ceg } = await supabase
    .from("cegek")
    .select("*")
    .eq("id", felhasznalo.ceg_id!)
    .single();

  return { user, felhasznalo, ceg };
}
