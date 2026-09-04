import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SwRegisztracio } from "@/components/SwRegisztracio";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CÉGEM.AI",
  description: "Vállalkozói asszisztens kisvállalkozásoknak",
  // PWA — a manifest (src/app/manifest.ts) és az iOS-es "kezdőképernyőre"
  // beállítások; a service worker regisztrációja a SwRegisztracio-ban.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CÉGEM.AI",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/ikon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#16171c",
  width: "device-width",
  initialScale: 1,
  // Helyszíni, egykezes használat: a felhasználó nagyíthasson, ha kell
  // (napfény, por, kesztyű) — a maximumScale korlátozása akadálymentességi
  // hiba lenne, ezért nincs.
};

// A napfény mód (lásd TemaValto.tsx, globals.css) villanás nélkül kell,
// hogy alkalmazódjon — ez a script a React-hidratáció előtt, közvetlenül
// a <head>-ben fut le, mielőtt bármi kirajzolódna.
const NAPFENY_ELOKESZITO = `
try {
  if (localStorage.getItem("cegemai_napfeny") === "true") {
    document.documentElement.setAttribute("data-napfeny", "true");
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hu"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // A `NAPFENY_ELOKESZITO` script a hidratáció ELŐTT írja rá a
      // `data-napfeny` attribútumot erre az elemre — enélkül React ezt
      // (helytelenül) hidratáció-eltérésnek jelezné.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NAPFENY_ELOKESZITO }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <SwRegisztracio />
      </body>
    </html>
  );
}
