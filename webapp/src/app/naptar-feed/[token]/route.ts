import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { esemenyekIcsSzoveg } from "@/lib/ics";

/**
 * A cég .ics naptár-feedje — nyilvános, kizárólag a kitalálhatatlan
 * tokenen keresztül elérhető (lásd
 * db/migraciok/0013_naptar_feed_szinkron.sql). Ez a végpont SZÁNDÉKOSAN
 * a `(vedett)` útvonalcsoporton kívül van: a naptáralkalmazás, ami ezt
 * lekéri (Google/Apple/Outlook), nyilvánvalóan nem hordoz Supabase-
 * munkamenetet, ezért itt egy sima, munkamenet nélküli klienst
 * használunk, nem a cookie-alapú `szerverKliens()`-t.
 */

const UUID_MINTA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!UUID_MINTA.test(token)) {
    return new NextResponse("Érvénytelen naptár-token.", { status: 404 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: cegNev, error: cegHiba } = await supabase.rpc("naptar_feed_ceg_neve", {
    p_token: token,
  });
  if (cegHiba || !cegNev) {
    return new NextResponse("Ismeretlen vagy visszavont naptár-token.", { status: 404 });
  }

  const { data: esemenyek, error: esemenyHiba } = await supabase.rpc("naptar_feed_esemenyei", {
    p_token: token,
  });
  if (esemenyHiba) {
    return new NextResponse("Hiba a naptár lekérdezésekor.", { status: 500 });
  }

  const ics = esemenyekIcsSzoveg(cegNev, esemenyek ?? []);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="naptar.ics"',
      "Cache-Control": "private, max-age=900",
    },
  });
}
