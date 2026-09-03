import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role kliens — ez a Supabase Auth Admin API-t hívja (jelenleg
 * kizárólag `inviteUserByEmail`, a könyvelő-meghíváshoz), NEM a
 * felhasználó nevében fut, hanem a teljes projektet éri el.
 *
 * ⚠ SOSEM importálható kliens komponensbe — az `import "server-only"`
 * build-hibát dob, ha ez mégis megtörténne. Csak Server Actionből hívd,
 * és csak azért, mert az `inviteUserByEmail`-hez nincs más út — minden
 * TÉNYLEGES adatírás (a `felhasznalok`/`konyvelo_hozzaferes` sorok)
 * a `konyvelo_meghivas_veglegesitese` SECURITY DEFINER RPC-n megy, a
 * meghívó tulajdonos saját, RLS alá eső munkamenetéből, nem ezen a
 * kliensen.
 */
export function szolgaltatasKliens() {
  const kulcs = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!kulcs) {
    throw new Error(
      "Hiányzik a SUPABASE_SERVICE_ROLE_KEY környezeti változó — a könyvelő-meghíváshoz kell (lásd .env.local.example).",
    );
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, kulcs, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
