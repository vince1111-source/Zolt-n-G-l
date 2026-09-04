import type { MetadataRoute } from "next";

/**
 * Web App Manifest — a CLAUDE.md "telepíthető PWA" ígéretének első fele
 * (a másik a `public/sw.js` service worker). A Next.js ebből
 * `/manifest.webmanifest`-et szolgál ki, a `layout.tsx` metadata-ja
 * hivatkozik rá.
 *
 * `display: "standalone"` — telepítve saját ablakban, böngésző-UI nélkül
 * fut, ami a helyszíni, egykezes használatnak a lényege.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CÉGEM.AI",
    short_name: "CÉGEM.AI",
    description: "Vállalkozói asszisztens kisvállalkozásoknak",
    lang: "hu",
    start_url: "/",
    display: "standalone",
    background_color: "#16171c",
    theme_color: "#16171c",
    icons: [
      { src: "/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
