import type { AiHiba, AiSiker } from "./openai.ts";

/**
 * Felhős beszédfelismerés — a TARTALÉK a böngésző saját felismerője mellé
 * (CLAUDE.md: "beszédfelismerés bekötve: böngésző + felhőszolgáltató
 * tartalék"). Akkor kell, ha a böngésző nem tud hangot (Firefox, egyes
 * beágyazott nézetek), vagy a felhasználó zajos helyszínen a felhőt
 * választja. A hang a telefonon rögzül (MediaRecorder), ide már fájlként
 * jön; az átirat ugyanabba a szövegdobozba kerül, mint a gépelt parancs.
 */
export const MODELL_HANG = process.env.OPENAI_MODELL_HANG ?? "gpt-4o-mini-transcribe";

const VEGPONT = "https://api.openai.com/v1/audio/transcriptions";
const IDOKORLAT_MS = 30_000;

export async function hangAtiras(fajl: File): Promise<AiSiker<string> | AiHiba> {
  const kulcs = process.env.OPENAI_API_KEY;
  if (!kulcs) return { ok: false, hiba: "nincs_kulcs", uzenet: "Nincs OPENAI_API_KEY beállítva." };

  const adat = new FormData();
  adat.append("file", fajl, fajl.name || "hang.webm");
  adat.append("model", MODELL_HANG);
  adat.append("language", "hu");
  adat.append("response_format", "json");

  const vezerlo = new AbortController();
  const idozito = setTimeout(() => vezerlo.abort(), IDOKORLAT_MS);
  let valasz: Response;
  try {
    valasz = await fetch(VEGPONT, {
      method: "POST",
      headers: { Authorization: `Bearer ${kulcs}` },
      body: adat,
      signal: vezerlo.signal,
    });
  } catch (e) {
    clearTimeout(idozito);
    return { ok: false, hiba: "halozat", uzenet: e instanceof Error ? e.message : "Hálózati hiba." };
  }
  clearTimeout(idozito);

  const nyers = (await valasz.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!valasz.ok) return { ok: false, hiba: "modell", uzenet: nyers.error?.message ?? `HTTP ${valasz.status}` };

  const szoveg = (nyers.text ?? "").trim();
  if (!szoveg) return { ok: false, hiba: "modell", uzenet: "Nem hallottam szöveget — mondd újra, közelebb a mikrofonhoz." };

  return { ok: true, adat: szoveg, modell: MODELL_HANG, tokenBe: 0, tokenKi: 0, tokenCache: 0 };
}
