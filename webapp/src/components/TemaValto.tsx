"use client";

import { useEffect, useState } from "react";
import { Sun, CloudSun } from "lucide-react";

const KULCS = "cegemai_napfeny";

/**
 * Napfény mód kapcsoló — a CLAUDE.md saját elvárása ("napfény üzemmód")
 * eddig csak a telefonos prototípusban létezett. Erős kültéri fényben a
 * halványszürke szövegek/szegélyek szinte eltűnnek — ez a kapcsoló
 * maximális kontrasztra vált (lásd globals.css `[data-napfeny="true"]`).
 * Tudatosan KÉZI, nem automatikus (fényérzékelő böngészőből nem
 * elérhető): a felhasználó dönti el, amikor kimegy a napra.
 */
export function TemaValto() {
  const [napfeny, setNapfeny] = useState(false);

  useEffect(() => {
    setNapfeny(document.documentElement.getAttribute("data-napfeny") === "true");
  }, []);

  function valt() {
    const uj = !napfeny;
    setNapfeny(uj);
    if (uj) {
      document.documentElement.setAttribute("data-napfeny", "true");
    } else {
      document.documentElement.removeAttribute("data-napfeny");
    }
    try {
      localStorage.setItem(KULCS, String(uj));
    } catch {
      // localStorage tiltva — a kapcsoló ettől még működik, csak nem emlékszik.
    }
  }

  return (
    <button
      type="button"
      onClick={valt}
      aria-pressed={napfeny}
      aria-label={napfeny ? "Napfény mód kikapcsolása" : "Napfény mód bekapcsolása"}
      title={napfeny ? "Napfény mód kikapcsolása" : "Napfény mód bekapcsolása"}
      className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-white/25 hover:bg-white/10"
    >
      {napfeny ? <Sun size={18} /> : <CloudSun size={18} />}
    </button>
  );
}
