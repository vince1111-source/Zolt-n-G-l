import Link from "next/link";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { szerverKliens } from "@/lib/supabase/server";
import { Ft } from "@/lib/format";
import { illeszkedik, keresoSzo } from "@/lib/kereses";
import { budapestMaDatum } from "@/lib/het";
import { megjelenoAllapot } from "@/lib/ajanlat-allapot";
import { KeresoMezo } from "@/components/KeresoMezo";
import { Badge } from "@/components/ui/Badge";
import { gombElsodleges, kartya } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Enums } from "@/lib/supabase/types";

const ALLAPOT_CIMKE: Record<Enums<"ajanlat_allapot">, string> = {
  piszkozat: "piszkozat",
  kikuldve: "kiküldve",
  elfogadva: "elfogadva",
  elutasitva: "elutasítva",
  lejart: "lejárt",
};

const ALLAPOT_SZIN: Record<Enums<"ajanlat_allapot">, "muted" | "figyelem" | "rendben" | "kritikus"> = {
  piszkozat: "muted",
  kikuldve: "figyelem",
  elfogadva: "rendben",
  elutasitva: "kritikus",
  lejart: "kritikus",
};

export default async function Ajanlatok({ searchParams }: PageProps<"/ajanlatok">) {
  const { q } = await searchParams;
  const kereses = keresoSzo(q);

  const supabase = await szerverKliens();
  const { data: ajanlatok } = await supabase
    .from("ajanlatok")
    .select("*, partnerek(nev)")
    .order("letrehozva", { ascending: false });

  // A "lejárt" származtatott (lib/ajanlat-allapot.ts): kiküldve + az
  // érvényesség a mai nap előtt. A címke, a jelvény és a keresés is ezt
  // a megjelenő állapotot használja, nem a tárolt oszlopot.
  const ma = budapestMaDatum();
  const megjelenitett = (ajanlatok ?? []).map((a) => ({ ...a, megjelenoAllapot: megjelenoAllapot(a, ma) }));

  // Az állapot magyar címkéjére is keresünk ("elfogadva", "lejárt"), nem
  // csak az adatbázis-értékre — a felhasználó azt látja, arra gépel.
  const szurt = megjelenitett.filter((a) =>
    illeszkedik(kereses, a.partnerek?.nev, a.sorszam, ALLAPOT_CIMKE[a.megjelenoAllapot]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><FileText size={22} className="text-cta" aria-hidden />Ajánlatok</h1>
          <p className="text-muted mt-1">
            {kereses ? `${szurt.length} találat / ${ajanlatok?.length ?? 0} ajánlat` : `${ajanlatok?.length ?? 0} ajánlat`}
          </p>
        </div>
        <Link href="/ajanlatok/uj" className={gombElsodleges}>
          + Új ajánlat
        </Link>
      </div>

      <Suspense fallback={null}>
        <KeresoMezo placeholder="Keresés partner, sorszám vagy állapot szerint…" />
      </Suspense>

      <div className={`${kartya} divide-y divide-line`}>
        {!ajanlatok?.length && (
          <EmptyState>Még nincs kiadott ajánlat.</EmptyState>
        )}
        {!!ajanlatok?.length && !szurt.length && (
          <EmptyState>Nincs találat a keresésre.</EmptyState>
        )}
        {szurt.map((a) => (
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
              <div className="mt-1">
                <Badge szin={ALLAPOT_SZIN[a.megjelenoAllapot]}>{ALLAPOT_CIMKE[a.megjelenoAllapot]}</Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
