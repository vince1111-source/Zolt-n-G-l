"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Keresőmező a listaoldalakra — az értéket a `?q=` paraméterbe írja, a
 * szűrést a szerver végzi (lib/kereses.ts). Így a keresés megosztható
 * linkként, túléli a frissítést, és a lista sosem "ugrik" kliens oldali
 * újraszűréstől. Rövid késleltetéssel ír, hogy ne minden leütésre
 * kérjen új oldalt.
 */
export function KeresoMezo({ placeholder = "Keresés…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const kezdo = params.get("q") ?? "";
  const [ertek, setErtek] = useState(kezdo);
  const idozito = useRef<number | null>(null);

  useEffect(() => {
    if (ertek === kezdo) return;
    if (idozito.current) window.clearTimeout(idozito.current);
    idozito.current = window.setTimeout(() => {
      const uj = new URLSearchParams(params.toString());
      if (ertek.trim()) uj.set("q", ertek.trim());
      else uj.delete("q");
      const qs = uj.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => {
      if (idozito.current) window.clearTimeout(idozito.current);
    };
  }, [ertek, kezdo, params, pathname, router]);

  return (
    <div className="relative">
      <Search size={18} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input
        type="search"
        value={ertek}
        onChange={(e) => setErtek(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-10 pr-10 py-3"
      />
      {ertek && (
        <button
          type="button"
          onClick={() => setErtek("")}
          aria-label="Keresés törlése"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-foreground"
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}
