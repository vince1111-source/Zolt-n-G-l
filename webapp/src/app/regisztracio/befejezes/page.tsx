import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { BefejezesForm } from "./BefejezesForm";

/**
 * Ide kerül, akinek a munkamenete már érvényes (az e-mailje megerősítve),
 * de valamiért nem jött létre a cége — pl. mert a megerősítő link nem a
 * várt alakban futott le, és az `/auth/confirm` route nem tudta elindítani
 * a `sajat_ceg_letrehozasa` hívást. Itt, a saját munkamenetében, egy
 * gombnyomással pótolható.
 */
export default async function RegisztracioBefejezese() {
  const supabase = await szerverKliens();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/bejelentkezes");

  const { data: felhasznalo } = await supabase
    .from("felhasznalok")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (felhasznalo) redirect("/");

  const meta = user.user_metadata as { ceg_nev?: string; sajat_nev?: string };

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="font-extrabold text-2xl tracking-tight text-brand">
            CÉGEM<span className="text-cta bg-brand px-1 rounded">.AI</span>
          </div>
        </div>
        <div className="bg-surface border border-line rounded-xl p-6">
          <h1 className="font-bold text-lg mb-1">Már csak egy lépés</h1>
          <p className="text-muted text-sm mb-4">
            Az e-mail címed megerősítve — most hozzuk létre a céged.
          </p>
          <BefejezesForm
            cegNevAlapertelmezett={meta.ceg_nev ?? ""}
            sajatNevAlapertelmezett={meta.sajat_nev ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
