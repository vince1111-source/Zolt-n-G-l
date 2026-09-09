"use server";

import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { aiBekotve } from "@/lib/ai/openai";
import { napiPlafonElerve, aiNaplozasHang } from "@/lib/ai/naplo";
import { hangAtiras } from "@/lib/ai/hang";

export type HangAtirasEredmeny =
  | { ok: true; szoveg: string; modell: string }
  | { ok: false; uzenet: string };

const MAX_MERET = 5 * 1024 * 1024;
const MAX_MASODPERC = 30;

/**
 * Felhős hang-átirat — a telefonon rögzített hang fájlként érkezik. Csak
 * átír: a szöveg ugyanabba a csőbe megy (0. → 1. réteg), mint a gépelt
 * parancs; naplózva, napi plafonnal, mint minden modellhívás.
 */
export async function hangAtirasAction(adat: FormData): Promise<HangAtirasEredmeny> {
  if (!aiBekotve()) return { ok: false, uzenet: "Felhős hangfelismerés nincs bekötve." };

  const fajl = adat.get("hang");
  if (!(fajl instanceof File) || fajl.size === 0) return { ok: false, uzenet: "Nem érkezett hang." };
  if (fajl.size > MAX_MERET) return { ok: false, uzenet: "Túl hosszú felvétel — legfeljebb pár mondat egyszerre." };
  if (fajl.type && !fajl.type.startsWith("audio/") && !fajl.type.startsWith("video/")) {
    return { ok: false, uzenet: "Nem hangfájl érkezett." };
  }
  const masodperc = Math.min(Math.max(Number(adat.get("masodperc")) || 0, 0), MAX_MASODPERC);

  const supabase = await szerverKliens();
  if (await napiPlafonElerve(supabase)) {
    return { ok: false, uzenet: "A mai modellhívás-keret elfogyott — gépeld be a parancsot." };
  }

  const valasz = await hangAtiras(fajl);
  if (!valasz.ok) return { ok: false, uzenet: valasz.uzenet };

  const { felhasznalo } = await sajatCegVagyIranyitas();
  await aiNaplozasHang(supabase, {
    modell: valasz.modell,
    masodperc,
    mime: fajl.type || "?",
    szoveg: valasz.adat,
    felhasznaloId: felhasznalo?.id ?? null,
  });

  return { ok: true, szoveg: valasz.adat, modell: valasz.modell };
}
