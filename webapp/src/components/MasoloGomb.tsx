"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { gombMasodlagos } from "./ui/classes";
import { vagolapra } from "@/lib/vagolap";

/**
 * Vágólapra másoló gomb. Ha a másolás nem sikerül (tiltott vágólap, egyes
 * alkalmazáson belüli böngészők), nem hallgat el: a szöveg megjelenik egy
 * kijelölhető mezőben. Csendes hibánál a felhasználó a vágólap RÉGI
 * tartalmát illesztené be az ügyfélnek szóló üzenetbe.
 */
export function MasoloGomb({ szoveg, cimke = "Másolom" }: { szoveg: string; cimke?: string }) {
  const [allapot, setAllapot] = useState<"alap" | "masolva" | "hiba">("alap");
  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        type="button"
        onClick={async () => {
          if (await vagolapra(szoveg)) {
            setAllapot("masolva");
            setTimeout(() => setAllapot((a) => (a === "masolva" ? "alap" : a)), 1500);
          } else {
            setAllapot("hiba");
          }
        }}
        className={`${gombMasodlagos} inline-flex items-center gap-1.5`}
      >
        {allapot === "masolva" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        {allapot === "masolva" ? "Másolva!" : cimke}
      </button>
      {allapot === "hiba" && (
        <label className="text-sm text-figyelem flex flex-col gap-1 self-stretch">
          Nem sikerült automatikusan másolni — jelöld ki és másold innen:
          <textarea
            readOnly
            value={szoveg}
            rows={Math.min(8, szoveg.split("\n").length + 1)}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-xs"
          />
        </label>
      )}
    </div>
  );
}
