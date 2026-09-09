"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, CloudCog } from "lucide-react";
import type { HangAtirasEredmeny } from "@/app/(vedett)/hang-actions";

/**
 * Nyomva tartós mikrofon (push-to-talk) — a CLAUDE.md terepi elve: nincs
 * folyamatos figyelés, csak amíg nyomod. Két lépcső:
 *
 *   1. a böngésző saját felismerője (Web Speech API, hu-HU) — 0 Ft, nincs
 *      szerver; Android Chrome és iOS Safari tudja magyarul, Firefox nem;
 *   2. felhő-tartalék: MediaRecorder → szerver → OpenAI átírás — ha a
 *      böngésző nem tud hangot, vagy a felhasználó "zajos helyszín" módra
 *      kapcsol (zajban a felhő jobb).
 *
 * A gomb CSAK szöveget ad (`onAtirat`) — ugyanabba a csőbe megy, mint a
 * gépelt parancs. Legfeljebb 15 másodperc egy mondat.
 */

const MAX_MASODPERC = 15;
const MOD_KULCS = "cegemai_hang_mod";

type FelismeroEsemeny = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};
type Felismero = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: FelismeroEsemeny) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function bongeszoFelismero(): (new () => Felismero) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Felismero; webkitSpeechRecognition?: new () => Felismero };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function rezeg(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // nincs rezgés — nem baj
  }
}

type Allapot = "tetlen" | "hallgat" | "feldolgoz";

export function HangGomb({
  onAtirat,
  felhoAtiras,
  felhoElerheto,
  disabled,
}: {
  onAtirat: (szoveg: string) => void;
  felhoAtiras: (adat: FormData) => Promise<HangAtirasEredmeny>;
  felhoElerheto: boolean;
  disabled?: boolean;
}) {
  const [allapot, setAllapot] = useState<Allapot>("tetlen");
  const [koztes, setKoztes] = useState("");
  const [hiba, setHiba] = useState<string | null>(null);
  const [masodperc, setMasodperc] = useState(0);
  const [bongeszoVan, setBongeszoVan] = useState(false);
  const [mod, setMod] = useState<"bongeszo" | "felho">("bongeszo");

  const felismero = useRef<Felismero | null>(null);
  const rogzito = useRef<MediaRecorder | null>(null);
  const folyam = useRef<MediaStream | null>(null);
  const darabok = useRef<Blob[]>([]);
  const vegleges = useRef("");
  const kezdet = useRef(0);
  const idozito = useRef<number | null>(null);
  const szamlalo = useRef<number | null>(null);
  const lenyomva = useRef(false);

  useEffect(() => {
    const van = !!bongeszoFelismero();
    setBongeszoVan(van);
    let mentett: string | null = null;
    try {
      mentett = localStorage.getItem(MOD_KULCS);
    } catch {
      // tiltott tárolás — alapértelmezés marad
    }
    setMod(mentett === "felho" && felhoElerheto ? "felho" : van ? "bongeszo" : "felho");
  }, [felhoElerheto]);

  const felhoMod = mod === "felho" || !bongeszoVan;
  const elerheto = bongeszoVan || felhoElerheto;

  function modValtas() {
    const uj = felhoMod ? "bongeszo" : "felho";
    if (uj === "felho" && !felhoElerheto) return;
    if (uj === "bongeszo" && !bongeszoVan) return;
    setMod(uj);
    try {
      localStorage.setItem(MOD_KULCS, uj);
    } catch {
      // nem baj
    }
  }

  function idozitokLe() {
    if (idozito.current) window.clearTimeout(idozito.current);
    if (szamlalo.current) window.clearInterval(szamlalo.current);
    idozito.current = null;
    szamlalo.current = null;
  }

  function inditas() {
    if (disabled || allapot !== "tetlen" || !elerheto) return;
    lenyomva.current = true;
    setHiba(null);
    setKoztes("");
    vegleges.current = "";
    kezdet.current = Date.now();
    setMasodperc(0);
    szamlalo.current = window.setInterval(() => setMasodperc(Math.round((Date.now() - kezdet.current) / 1000)), 250);
    idozito.current = window.setTimeout(() => leallitas(), MAX_MASODPERC * 1000);
    rezeg(30);

    if (!felhoMod) {
      const Ctor = bongeszoFelismero();
      if (!Ctor) return;
      const f = new Ctor();
      f.lang = "hu-HU";
      f.continuous = true;
      f.interimResults = true;
      f.onresult = (e) => {
        let ideiglenes = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const t = r[0]?.transcript ?? "";
          if (r.isFinal) vegleges.current += t;
          else ideiglenes += t;
        }
        setKoztes((vegleges.current + " " + ideiglenes).trim());
      };
      f.onerror = (e) => {
        if (e.error === "no-speech") setHiba("Nem hallottam semmit — nyomd, és beszélj közben.");
        else if (e.error === "not-allowed") setHiba("A mikrofon le van tiltva ehhez az oldalhoz — engedélyezd a böngészőben.");
        else setHiba(`Hangfelismerési hiba: ${e.error}`);
      };
      f.onend = () => {
        idozitokLe();
        const szoveg = vegleges.current.trim();
        setAllapot("tetlen");
        setKoztes("");
        if (szoveg) onAtirat(szoveg);
      };
      felismero.current = f;
      try {
        f.start();
        setAllapot("hallgat");
      } catch {
        setHiba("Nem indult el a hangfelismerés.");
        idozitokLe();
      }
      return;
    }

    // Felhő: rögzítés, elengedéskor küldés.
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (!lenyomva.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        folyam.current = s;
        const tipusok = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
        const mime = tipusok.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
        const r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
        darabok.current = [];
        r.ondataavailable = (e) => {
          if (e.data.size) darabok.current.push(e.data);
        };
        r.onstop = async () => {
          s.getTracks().forEach((t) => t.stop());
          folyam.current = null;
          const hossz = Math.round((Date.now() - kezdet.current) / 1000);
          idozitokLe();
          const blob = new Blob(darabok.current, { type: r.mimeType || "audio/webm" });
          if (blob.size < 1000 || hossz < 1) {
            setAllapot("tetlen");
            setHiba("Túl rövid felvétel — tartsd nyomva, amíg beszélsz.");
            return;
          }
          setAllapot("feldolgoz");
          const kit = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
          const adat = new FormData();
          adat.append("hang", new File([blob], `hang.${kit}`, { type: blob.type }));
          adat.append("masodperc", String(hossz));
          try {
            const v = await felhoAtiras(adat);
            setAllapot("tetlen");
            if (v.ok) onAtirat(v.szoveg);
            else setHiba(v.uzenet);
          } catch {
            setAllapot("tetlen");
            setHiba("Az átírás nem sikerült — próbáld újra, vagy gépeld be.");
          }
        };
        rogzito.current = r;
        r.start();
        setAllapot("hallgat");
      })
      .catch(() => {
        idozitokLe();
        setAllapot("tetlen");
        setHiba("A mikrofon nem elérhető — engedélyezd a böngészőben.");
      });
  }

  function leallitas() {
    if (!lenyomva.current) return;
    lenyomva.current = false;
    rezeg(15);
    if (felismero.current) {
      try {
        felismero.current.stop();
      } catch {
        // már leállt
      }
      felismero.current = null;
      return;
    }
    if (rogzito.current && rogzito.current.state !== "inactive") {
      rogzito.current.stop();
      rogzito.current = null;
    } else {
      idozitokLe();
      folyam.current?.getTracks().forEach((t) => t.stop());
      folyam.current = null;
      setAllapot("tetlen");
    }
  }

  useEffect(() => () => idozitokLe(), []);

  if (!elerheto) {
    return (
      <p className="text-xs text-muted">
        Ebben a böngészőben nincs hangfelismerés (Chrome vagy Safari kell, vagy a felhős átírás bekötése).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || allapot === "feldolgoz"}
          onPointerDown={(e) => {
            e.preventDefault();
            inditas();
          }}
          onPointerUp={leallitas}
          onPointerLeave={leallitas}
          onPointerCancel={leallitas}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              inditas();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") leallitas();
          }}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Nyomva tartva beszélj"
          aria-pressed={allapot === "hallgat"}
          className={`relative flex items-center justify-center rounded-full w-16 h-16 select-none touch-none border-2 transition-colors
            ${allapot === "hallgat" ? "bg-kritikus text-white border-kritikus" : "bg-cta text-cta-ink border-cta"}
            disabled:opacity-50`}
          style={{ touchAction: "none" }}
        >
          <Mic size={26} aria-hidden />
          {allapot === "hallgat" && (
            <span className="absolute inset-0 rounded-full border-2 border-kritikus animate-ping" aria-hidden />
          )}
        </button>
        <div className="flex flex-col gap-0.5 text-sm min-w-0">
          <span className="font-semibold">
            {allapot === "hallgat"
              ? `Hallgatlak… ${masodperc} mp`
              : allapot === "feldolgoz"
                ? "Átírás…"
                : "Nyomva tartva beszélj"}
          </span>
          <span className="text-xs text-muted flex items-center gap-1.5">
            {felhoMod ? "felhős átírás" : "a böngésző felismerője"} · legfeljebb {MAX_MASODPERC} mp
            {bongeszoVan && felhoElerheto && (
              <button type="button" onClick={modValtas} className="underline inline-flex items-center gap-1">
                <CloudCog size={12} aria-hidden />
                {felhoMod ? "váltás böngészőre" : "zajos helyszín (felhő)"}
              </button>
            )}
          </span>
          {koztes && <span className="text-xs italic truncate">„{koztes}”</span>}
        </div>
      </div>
      {hiba && <p className="text-xs text-kritikus">{hiba}</p>}
    </div>
  );
}
