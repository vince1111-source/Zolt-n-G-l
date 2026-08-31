import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { szerverKliens } from "@/lib/supabase/server";

/**
 * A Supabase e-mail megerősítő linkje ide mutat vissza. Sikeres
 * megerősítés után — ha ez az első bejelentkezése — most jön létre a
 * cége, ugyanabból a `ceg_nev`/`sajat_nev`-ből, amit regisztrációkor
 * megadott (ez a signUp `options.data`-jában utazott).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const tipus = searchParams.get("type") as EmailOtpType | null;
  const cel = searchParams.get("next") ?? "/";

  if (tokenHash && tipus) {
    const supabase = await szerverKliens();
    const { data, error } = await supabase.auth.verifyOtp({
      type: tipus,
      token_hash: tokenHash,
    });

    if (!error && data.user) {
      const { data: felhasznalo } = await supabase
        .from("felhasznalok")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (!felhasznalo) {
        const meta = data.user.user_metadata as {
          ceg_nev?: string;
          sajat_nev?: string;
        };
        await supabase.rpc("sajat_ceg_letrehozasa", {
          p_ceg_nev: meta.ceg_nev ?? "Az én cégem",
          p_felhasznalo_nev: meta.sajat_nev ?? "",
        });
      }

      return NextResponse.redirect(`${origin}${cel}`);
    }
  }

  return NextResponse.redirect(`${origin}/bejelentkezes?hiba=ervenytelen_link`);
}
