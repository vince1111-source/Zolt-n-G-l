"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastTipus = "siker" | "hiba" | "info";
type Toast = { id: number; tipus: ToastTipus; szoveg: string };

type FlashKezdo = { tipus: ToastTipus; szoveg: string; nonce: number } | null;

const ToastContext = createContext<{ mutat: (tipus: ToastTipus, szoveg: string) => void } | null>(null);

/** Kliens komponensekből: `const { mutat } = useToast(); mutat("siker", "Mentve.")` */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast csak ToastProvider-en belül használható.");
  return ctx;
}

const STILUS: Record<ToastTipus, { doboz: string; Ikon: typeof CheckCircle2 }> = {
  siker: { doboz: "bg-rendben-soft text-rendben border-rendben/30", Ikon: CheckCircle2 },
  hiba: { doboz: "bg-kritikus-soft text-kritikus border-kritikus/30", Ikon: AlertCircle },
  info: { doboz: "bg-figyelem-soft text-figyelem border-figyelem/30", Ikon: Info },
};

const ELTUNES_MS = 4500;
const FLASH_SUTI = "cegemai_flash";

/**
 * Globális visszajelzés (toast) — a telefon-első elv szerint alul, egy
 * kézzel elérhető helyen, min. 56 px magas, koppintásra is eltűnik.
 * A `kezdo` a szerver oldali flash-süti (lib/flash.ts): átirányítás után
 * ezen keresztül jön a "Mentve." — a kliens megjeleníti, majd törli a
 * sütit, hogy frissítésre ne jöjjön elő újra.
 */
export function ToastProvider({ kezdo, children }: { kezdo: FlashKezdo; children: React.ReactNode }) {
  const [toastok, setToastok] = useState<Toast[]>([]);
  const kovetkezoId = useRef(1);
  const utolsoNonce = useRef<number | null>(null);

  const mutat = useCallback((tipus: ToastTipus, szoveg: string) => {
    const id = kovetkezoId.current++;
    setToastok((t) => [...t, { id, tipus, szoveg }]);
    window.setTimeout(() => setToastok((t) => t.filter((x) => x.id !== id)), ELTUNES_MS);
  }, []);

  useEffect(() => {
    if (!kezdo || utolsoNonce.current === kezdo.nonce) return;
    utolsoNonce.current = kezdo.nonce;
    mutat(kezdo.tipus, kezdo.szoveg);
    document.cookie = `${FLASH_SUTI}=; max-age=0; path=/`;
  }, [kezdo, mutat]);

  return (
    <ToastContext.Provider value={{ mutat }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none"
      >
        {toastok.map((t) => {
          const { doboz, Ikon } = STILUS[t.tipus];
          return (
            <div
              key={t.id}
              role="status"
              onClick={() => setToastok((x) => x.filter((y) => y.id !== t.id))}
              className={`pointer-events-auto min-h-14 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-[var(--shadow-kartya-hover)] text-sm font-medium cursor-pointer ${doboz}`}
            >
              <Ikon size={20} aria-hidden className="flex-shrink-0" />
              <span className="flex-1">{t.szoveg}</span>
              <X size={16} aria-hidden className="flex-shrink-0 opacity-60" />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
