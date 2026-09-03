import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
