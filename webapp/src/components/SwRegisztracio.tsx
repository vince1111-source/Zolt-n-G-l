"use client";

import { useEffect } from "react";

/**
 * A `public/sw.js` service worker regisztrálása. Csak éles buildben —
 * fejlesztés közben a Next.js HMR-je és egy service worker cache
 * rendszeresen egymásnak megy, és órákat lehet elveszíteni egy "miért a
 * régi kódot látom" hibán. Éles ellenőrzés: `next build && next start`.
 */
export function SwRegisztracio() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ha nem sikerül (pl. privát mód), az app service worker nélkül is
      // teljes értékű — a telepíthetőség és az offline-oldal marad el.
    });
  }, []);
  return null;
}
