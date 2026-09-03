import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // A repó gyökeréig kell felmenni, mert a webapp a `mag/`-ból importál
    // (lásd `src/lib/mag.ts`) — a Turbopack a root-on kívüli fájlokat nem
    // oldja fel.
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
