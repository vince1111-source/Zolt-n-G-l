import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { partnerArchivalasa } from "./actions";

export default async function Partnerek() {
  const supabase = await szerverKliens();
  const { data: partnerek } = await supabase
    .from("partnerek")
    .select("*")
    .eq("archivalt", false)
    .order("nev");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Partnerek</h1>
          <p className="text-muted mt-1">{partnerek?.length ?? 0} partner</p>
        </div>
        <Link
          href="/partnerek/uj"
          className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 whitespace-nowrap"
        >
          + Új partner
        </Link>
      </div>

      <div className="bg-surface border border-line rounded-xl divide-y divide-line">
        {!partnerek?.length && (
          <p className="p-5 text-muted text-sm">Még nincs felvett partner.</p>
        )}
        {partnerek?.map((p) => (
          <div key={p.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold flex items-center gap-2">
                {p.nev}
                {p.szallito && (
                  <span className="text-xs font-mono uppercase tracking-wider text-muted border border-line rounded-full px-2 py-0.5">
                    szállító
                  </span>
                )}
              </div>
              <div className="text-sm text-muted truncate">
                {p.kapcsolattarto}
                {p.kedvezmeny_szazalek > 0 &&
                  ` · ${p.kedvezmeny_szazalek}% kedvezmény`}
              </div>
            </div>
            <Link
              href={`/partnerek/${p.id}`}
              className="text-sm px-3 py-2 rounded-lg border border-line hover:border-cta"
            >
              Szerkesztés
            </Link>
            <form action={partnerArchivalasa.bind(null, p.id)}>
              <button
                type="submit"
                className="text-sm px-3 py-2 rounded-lg text-kritikus hover:bg-kritikus-soft"
              >
                Archiválom
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
