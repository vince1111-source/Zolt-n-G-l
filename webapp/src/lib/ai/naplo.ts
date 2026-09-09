import type { szerverKliens } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { budapestMaDatum } from "@/lib/het";

type Supabase = Awaited<ReturnType<typeof szerverKliens>>;

/**
 * Listaárak USD / 1M token. Forrás: developers.openai.com/api/docs/pricing,
 * 2026-09-04 — ha modellt cserélsz, ide is vedd fel, különben a napló
 * `koltseg_ft` mezője null lesz (ez szándékos: ismeretlen ár helyett inkább
 * "nem tudjuk", mint kitalált szám).
 */
export const MODELL_ARAK_USD_1M: Record<string, { be: number; cache: number; ki: number }> = {
  "gpt-5-nano": { be: 0.05, cache: 0.005, ki: 0.4 },
  "gpt-5.4-nano": { be: 0.2, cache: 0.02, ki: 1.25 },
  "gpt-5-mini": { be: 0.25, cache: 0.025, ki: 2.0 },
  "gpt-5.6-sol": { be: 4.0, cache: 0.4, ki: 20.0 },
  "gpt-6-astra": { be: 10.0, cache: 1.0, ki: 50.0 },
};

/** Beszédfelismerés, USD / perc (ugyanaz a forrás és dátum). */
export const HANG_ARAK_USD_PERC: Record<string, number> = {
  "gpt-4o-mini-transcribe": 0.003,
  "gpt-4o-transcribe": 0.006,
  "whisper-1": 0.006,
};

/** Árfolyam — a spike-kal azonos alapérték, `USD_HUF` env-vel felülírható. */
export const USD_HUF = Number(process.env.USD_HUF || 380);

/** Napi hívásplafon cégenként (1.+ réteg) — elszabadult hurok elleni fék. */
export const AI_NAPI_PLAFON = Number(process.env.AI_NAPI_PLAFON || 200);

export function koltsegFt(modell: string, tokenBe: number, tokenKi: number, tokenCache = 0): number | null {
  const ar = MODELL_ARAK_USD_1M[modell];
  if (!ar) return null;
  const nemCache = Math.max(0, tokenBe - tokenCache);
  const usd = (nemCache / 1e6) * ar.be + (tokenCache / 1e6) * ar.cache + (tokenKi / 1e6) * ar.ki;
  return Math.round(usd * USD_HUF * 100) / 100;
}

/**
 * MINDEN modellhívás ide kerül (CLAUDE.md 2. sarkalatos szabály): mit látott
 * a modell, mit adott vissza, melyik réteg, mennyi token, mennyi Ft.
 * A `ceg_id` a tábla alapértelmezéséből (`aktualis_ceg()`) jön.
 */
export async function aiNaplozas(
  supabase: Supabase,
  p: {
    muvelet: string;
    reteg: 1 | 2;
    modell: string;
    bemenet: Json;
    kimenet: Json;
    tokenBe: number;
    tokenKi: number;
    tokenCache?: number;
    felhasznaloId?: string | null;
    javasoltMuveletId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("ai_naplo").insert({
    muvelet: p.muvelet,
    reteg: p.reteg,
    modell: p.modell,
    bemenet: p.bemenet,
    kimenet: p.kimenet,
    token_be: p.tokenBe,
    token_ki: p.tokenKi,
    koltseg_ft: koltsegFt(p.modell, p.tokenBe, p.tokenKi, p.tokenCache ?? 0),
    felhasznalo_id: p.felhasznaloId ?? null,
    javasolt_muvelet_id: p.javasoltMuveletId ?? null,
  });
  if (error) console.error("ai_naplo írás sikertelen:", error.message);
}

export function koltsegFtPerc(modell: string, masodperc: number): number | null {
  const ar = HANG_ARAK_USD_PERC[modell];
  if (ar == null) return null;
  return Math.round((masodperc / 60) * ar * USD_HUF * 100) / 100;
}

/** Felhős hang-átirat naplózása — a hossz másodpercben a bemenetben, a díj percarányos. */
export async function aiNaplozasHang(
  supabase: Supabase,
  p: { modell: string; masodperc: number; mime: string; szoveg: string; felhasznaloId?: string | null },
): Promise<void> {
  const { error } = await supabase.from("ai_naplo").insert({
    muvelet: "hang_atirat",
    reteg: 1,
    modell: p.modell,
    bemenet: { masodperc: p.masodperc, mime: p.mime },
    kimenet: { szoveg: p.szoveg },
    token_be: null,
    token_ki: null,
    koltseg_ft: koltsegFtPerc(p.modell, p.masodperc),
    felhasznalo_id: p.felhasznaloId ?? null,
  });
  if (error) console.error("ai_naplo (hang) írás sikertelen:", error.message);
}

/** Igaz, ha a cég ma már elérte a modellhívás-plafont — a hívó ilyenkor ne hívjon. */
export async function napiPlafonElerve(supabase: Supabase): Promise<boolean> {
  const { count } = await supabase
    .from("ai_naplo")
    .select("*", { count: "exact", head: true })
    .gte("reteg", 1)
    .gte("ido", `${budapestMaDatum()}T00:00:00+02:00`);
  return (count ?? 0) >= AI_NAPI_PLAFON;
}
