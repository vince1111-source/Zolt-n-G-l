import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Szerver oldali Supabase-kliens (Server Component, Server Action,
 * Route Handler). A munkamenetet a bejövő cookie-kból olvassa — mindig
 * a bejelentkezett felhasználó jogán fut, sosem szolgáltatás-kulccsal.
 * A sorszintű izoláció (RLS) ezen a kliensen keresztül érvényesül.
 */
export async function szerverKliens() {
  const sutik = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return sutik.getAll();
        },
        setAll(sutikListaja) {
          try {
            sutikListaja.forEach(({ name, value, options }) =>
              sutik.set(name, value, options),
            );
          } catch {
            // Server Component-ből hívva a cookie-írás nem engedélyezett —
            // ez rendben van, amíg a proxy.ts frissíti a munkamenetet.
          }
        },
      },
    },
  );
}
