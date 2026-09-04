"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { gombMasodlagos } from "./ui/classes";

/** Vágólapra másoló gomb — a KovetesLista mintája, újrahasználható alakban. */
export function MasoloGomb({ szoveg, cimke = "Másolom" }: { szoveg: string; cimke?: string }) {
  const [masolva, setMasolva] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(szoveg);
          setMasolva(true);
          setTimeout(() => setMasolva(false), 1500);
        } catch {
          // Vágólap tiltva (pl. beágyazott nézet) — a szöveg a képernyőn amúgy is ott van.
        }
      }}
      className={`${gombMasodlagos} inline-flex items-center gap-1.5`}
    >
      {masolva ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {masolva ? "Másolva!" : cimke}
    </button>
  );
}
