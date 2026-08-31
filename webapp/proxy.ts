import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Minden oldalbetöltés előtt frissíti a Supabase-munkamenetet, és a nem
 * bejelentkezett felhasználót a bejelentkezés oldalra tereli — a védett
 * oldalak nem is próbálnak meg adatot kérni bejelentkezés nélkül.
 *
 * A tényleges adatvédelem nem itt van, hanem az adatbázis sorszintű
 * biztonságán (RLS): ez a proxy csak kényelmi terelés, nem a kapu maga.
 */
export async function proxy(request: NextRequest) {
  let valasz = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(sutikListaja) {
          sutikListaja.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          valasz = NextResponse.next({ request });
          sutikListaja.forEach(({ name, value, options }) =>
            valasz.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const nyiltUtvonal =
    pathname.startsWith("/bejelentkezes") ||
    pathname.startsWith("/regisztracio") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (!user && !nyiltUtvonal) {
    const url = request.nextUrl.clone();
    url.pathname = "/bejelentkezes";
    return NextResponse.redirect(url);
  }

  return valasz;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
