import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // A hangfelvétel (HangGomb → hangAtirasAction) FormData-ban, fájlként megy a
  // Server Action-be; az alap 1 MB-os korlát egy 15 mp-es felvételnél is
  // bőven elég, de hagyunk rá helyet (multipart-fejlécek is beleszámítanak).
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  turbopack: {
    // A repó gyökeréig kell felmenni, mert a webapp a `mag/`-ból importál
    // (lásd `src/lib/mag.ts`) — a Turbopack a root-on kívüli fájlokat nem
    // oldja fel.
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
