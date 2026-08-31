import Link from "next/link";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { kijelentkezes } from "./actions";

export default async function VedettElrendezes({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ceg, felhasznalo } = await sajatCegVagyIranyitas();

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-brand text-brand-ink sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-base sm:text-lg tracking-tight">
              CÉGEM<span className="text-cta">.AI</span>
            </div>
            <div className="text-xs opacity-70 truncate">{ceg?.nev}</div>
          </div>
          <form action={kijelentkezes}>
            <button
              type="submit"
              className="text-xs px-3 py-2 rounded-lg border border-white/25 hover:bg-white/10 whitespace-nowrap"
            >
              Kilépés
            </button>
          </form>
        </div>
        <nav className="flex items-center gap-1 text-sm px-4 sm:px-5 pb-2 sm:pb-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href="/"
            className="px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap flex-shrink-0"
          >
            Áttekintés
          </Link>
          <Link
            href="/partnerek"
            className="px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap flex-shrink-0"
          >
            Partnerek
          </Link>
          <Link
            href="/ajanlatok"
            className="px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap flex-shrink-0"
          >
            Ajánlatok
          </Link>
          <Link
            href="/arlista"
            className="px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap flex-shrink-0"
          >
            Árlista
          </Link>
          <Link
            href="/cegprofil"
            className="px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap flex-shrink-0"
          >
            Cégadatok
          </Link>
          <span className="ml-auto pl-3 text-xs opacity-70 whitespace-nowrap flex-shrink-0">
            {felhasznalo.nev}
          </span>
        </nav>
      </header>
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-5 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
