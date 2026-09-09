/**
 * Vékony OpenAI-kliens — a lépcsős AI-réteg egyetlen hálózati pontja.
 *
 * Szándékosan `fetch`, nem SDK: egy végpont (Responses API), két hívásmód
 * (strukturált JSON / sima szöveg), időkorlát, tokenszámok — ennyi kell,
 * és így a szolgáltató egy fájl cseréjével váltható. A kulcs csak
 * szerveren él (`OPENAI_API_KEY`, sosem NEXT_PUBLIC_), és ha nincs, a
 * hívók `nincs_kulcs`-ot kapnak: a webapp a 0. réteggel megy tovább.
 *
 * Modellek (2026-09 listaárak, USD / 1M token — lib/ai/naplo.ts):
 *   olcsó: gpt-5-nano   0,05 be / 0,40 ki  — zárt sémás szándékfelismerés
 *   erős:  gpt-5-mini   0,25 be / 2,00 ki  — rövid magyar szövegek
 * A csúcsmodellek (gpt-5.6 Sol, gpt-6 Astra) 16–200× drágábbak; ide nem
 * kellenek — a 6. (számlaolvasás) és 15. (jogi kivonat) modulnál jönnek
 * szóba, a spike-ok után.
 */

export const MODELL_OLCSO = process.env.OPENAI_MODELL_OLCSO ?? "gpt-5-nano";
export const MODELL_EROS = process.env.OPENAI_MODELL_EROS ?? "gpt-5-mini";

const VEGPONT = "https://api.openai.com/v1/responses";
const IDOKORLAT_MS = 20_000;

export type AiHiba = { ok: false; hiba: "nincs_kulcs" | "halozat" | "modell" | "sema"; uzenet: string };
export type AiSiker<T> = {
  ok: true;
  adat: T;
  modell: string;
  tokenBe: number;
  tokenKi: number;
  tokenCache: number;
};
export type AiHivasEredmeny<T> = AiSiker<T> | AiHiba;

export function aiBekotve(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

type NyersValasz = {
  status?: string;
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
  usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } };
  error?: { message?: string };
};

async function hivas(
  test: Record<string, unknown>,
): Promise<{ ok: true; szoveg: string; nyers: NyersValasz } | AiHiba> {
  const kulcs = process.env.OPENAI_API_KEY;
  if (!kulcs) return { ok: false, hiba: "nincs_kulcs", uzenet: "Nincs OPENAI_API_KEY beállítva." };

  const vezerlo = new AbortController();
  const idozito = setTimeout(() => vezerlo.abort(), IDOKORLAT_MS);
  let valasz: Response;
  try {
    valasz = await fetch(VEGPONT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${kulcs}` },
      body: JSON.stringify(test),
      signal: vezerlo.signal,
    });
  } catch (e) {
    clearTimeout(idozito);
    return { ok: false, hiba: "halozat", uzenet: e instanceof Error ? e.message : "Hálózati hiba." };
  }
  clearTimeout(idozito);

  const nyers = (await valasz.json().catch(() => ({}))) as NyersValasz;
  if (!valasz.ok) {
    return { ok: false, hiba: "modell", uzenet: nyers.error?.message ?? `HTTP ${valasz.status}` };
  }
  if (nyers.status && nyers.status !== "completed") {
    return { ok: false, hiba: "modell", uzenet: `A válasz nem teljes (${nyers.status}) — kevés a max_output_tokens?` };
  }

  const uzenet = nyers.output?.find((o) => o.type === "message");
  const tartalom = uzenet?.content?.[0];
  if (tartalom?.type === "refusal") {
    return { ok: false, hiba: "modell", uzenet: tartalom.refusal ?? "A modell visszautasította." };
  }
  const szoveg = tartalom?.type === "output_text" ? (tartalom.text ?? "") : "";
  if (!szoveg) return { ok: false, hiba: "modell", uzenet: "Üres válasz a modelltől." };
  return { ok: true, szoveg, nyers };
}

function hasznalat(nyers: NyersValasz) {
  return {
    tokenBe: nyers.usage?.input_tokens ?? 0,
    tokenKi: nyers.usage?.output_tokens ?? 0,
    tokenCache: nyers.usage?.input_tokens_details?.cached_tokens ?? 0,
  };
}

/**
 * Zárt sémás válasz (`strict: true`, `additionalProperties: false`, minden
 * mező kötelező — a séma írójának felelőssége). A modell így nem tud
 * kitalált mezőt vagy műveletet visszaadni.
 */
export async function strukturaltValasz<T>(p: {
  modell: string;
  utasitas: string;
  bemenet: string;
  semaNev: string;
  sema: Record<string, unknown>;
  maxKiToken?: number;
}): Promise<AiHivasEredmeny<T>> {
  const v = await hivas({
    model: p.modell,
    instructions: p.utasitas,
    input: p.bemenet,
    // A gpt-5 család gondolkodó modell: a max_output_tokens a gondolkodó
    // tokeneket IS tartalmazza — ezért bővebb keret, mint a puszta JSON.
    max_output_tokens: p.maxKiToken ?? 1200,
    // A gpt-5 család gondolkodó modell: szándékfelismeréshez a minimális
    // erőfeszítés is bőven elég, és ez adja a legkisebb késleltetést/költséget.
    reasoning: { effort: "minimal" },
    text: { format: { type: "json_schema", name: p.semaNev, strict: true, schema: p.sema } },
  });
  if (!v.ok) return v;
  try {
    return { ok: true, adat: JSON.parse(v.szoveg) as T, modell: p.modell, ...hasznalat(v.nyers) };
  } catch {
    return { ok: false, hiba: "sema", uzenet: "A modell válasza nem érvényes JSON." };
  }
}

/** Rövid szabad szöveg (összefoglaló, kísérőlevél). */
export async function szovegValasz(p: {
  modell: string;
  utasitas: string;
  bemenet: string;
  maxKiToken?: number;
}): Promise<AiHivasEredmeny<string>> {
  const v = await hivas({
    model: p.modell,
    instructions: p.utasitas,
    input: p.bemenet,
    max_output_tokens: p.maxKiToken ?? 1500,
    reasoning: { effort: "low" },
  });
  if (!v.ok) return v;
  return { ok: true, adat: v.szoveg.trim(), modell: p.modell, ...hasznalat(v.nyers) };
}
