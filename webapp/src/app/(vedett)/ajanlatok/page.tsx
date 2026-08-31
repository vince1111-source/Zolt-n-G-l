import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { Ft } from "@/lib/format";
import type { Enums } from "@/lib/supabase/types";

const ALLAPOT_CIMKE: Record<Enums<"ajanlat_allapot">, string> = {
  piszkozat: "piszkozat",
  kikuldve: "kiküldve",
  elfogadva: "elfogadva",
  elutasitva: "elutasítva",
  lejart: "lejárt",
};

const ALLAPOT_SZIN: Record<Enums<"ajanlat_allapot">, string> = {
  piszkozat: "bg-line/40 text-muted",
  kikuldve: "bg-amber-50 text-amber-700",
  elfogadva: "bg-rendben-soft text-rendben",
  elutasitva: "bg-kritikus-soft text-kritikus",
  lejart: "bg-kritikus-soft text-kritikus",
};

export default async function Ajanlatok() {
  const supabase = await szerverKliens();
  const { data: ajanlatok } = await supabase
    .from("ajanlatok")
    .select("*, partnerek(nev)")
    .order("letrehozva", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ajánlatok</h1>
          <p className="text-muted mt-1">{ajanlatok?.length ?? 0} ajánlat</p>
        </div>
        <Link
          href="/ajanlatok/uj"
          className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 whitespace-nowrap"
        >
          + Új ajánlat
        </Link>
      </div>

      <div className="bg-surface border border-line rounded-xl divide-y divide-line">
        {!ajanlatok?.length && (
          <p className="p-5 text-muted text-sm">Még nincs kiadott ajánlat.</p>
        )}
        {ajanlatok?.map((a) => (
          <Link
            key={a.id}
            href={`/ajanlatok/${a.id}`}
            className="p-4 flex flex-wrap items-center gap-3 hover:bg-line/10"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{a.partnerek?.nev}</div>
              <div className="text-sm text-muted">
                {a.sorszam} · {new Date(a.kelt).toLocaleDateString("hu-HU")}
              </div>
            </div>
            <div className="text-right whitespace-nowrap">
              <div className="font-semibold tabular-nums">{Ft(a.brutto)}</div>
              <div
                className={`text-xs font-mono rounded-full px-2 py-0.5 inline-block mt-1 ${ALLAPOT_SZIN[a.allapot]}`}
              >
                {ALLAPOT_CIMKE[a.allapot]}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
