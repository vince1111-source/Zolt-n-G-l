import { kijelentkezes } from "@/app/(vedett)/actions";

export default function KonyveloElrendezes({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-brand text-brand-ink sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 font-extrabold text-base sm:text-lg tracking-tight">
            CÉGEM<span className="text-cta">.AI</span> — könyvelői nézet
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
      </header>
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-5 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
