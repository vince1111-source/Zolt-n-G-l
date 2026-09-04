import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { kijelentkezes } from "./actions";
import { Nav } from "./Nav";
import { TemaValto } from "@/components/TemaValto";
import { ToastProvider } from "@/components/Toast";
import { flashOlvasas } from "@/lib/flash";

export default async function VedettElrendezes({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ceg } = await sajatCegVagyIranyitas();
  // Az átirányítást túlélő, egyszeri visszajelzés (lib/flash.ts) — itt és
  // nem a gyökér-layoutban olvassuk, hogy a nyilvános oldalak (belépés,
  // regisztráció) statikusak maradhassanak: a süti-olvasás dinamikussá tenne.
  const flash = await flashOlvasas();

  return (
    <ToastProvider kezdo={flash}>
      <div className="min-h-full flex flex-col">
        <header className="bg-brand text-brand-ink sticky top-0 z-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-base sm:text-lg tracking-tight">
                CÉGEM<span className="text-cta">.AI</span>
              </div>
              <div className="text-xs opacity-70 truncate">{ceg?.nev}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <TemaValto />
              <form action={kijelentkezes}>
                <button
                  type="submit"
                  className="text-xs px-3 py-2 rounded-lg border border-white/25 hover:bg-white/10 whitespace-nowrap"
                >
                  Kilépés
                </button>
              </form>
            </div>
          </div>
          <Nav />
        </header>
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-5 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
