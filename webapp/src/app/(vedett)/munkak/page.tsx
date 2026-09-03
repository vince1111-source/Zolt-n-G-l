import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { gombElsodleges, kartya } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Enums } from "@/lib/supabase/types";

const ALLAPOT_CIMKE: Record<Enums<"munka_allapot">, string> = {
  elokeszites: "előkészítés",
  folyamatban: "folyamatban",
  befejezve: "befejezve",
};

const ALLAPOT_SZIN: Record<Enums<"munka_allapot">, "muted" | "figyelem" | "rendben"> = {
  elokeszites: "muted",
  folyamatban: "figyelem",
  befejezve: "rendben",
};

export default async function Munkak() {
  const supabase = await szerverKliens();
  const { data: munkak } = await supabase
    .from("munkak")
    .select("*, partnerek(nev)")
    .order("letrehozva", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Munkák</h1>
          <p className="text-muted mt-1">{munkak?.length ?? 0} munka</p>
        </div>
        <Link href="/munkak/uj" className={gombElsodleges}>
          + Új munka
        </Link>
      </div>

      <div className={`${kartya} divide-y divide-line`}>
        {!munkak?.length && (
          <EmptyState>
            Még nincs felvett munka. Elfogadott ajánlatból automatikusan
            létrejön, vagy felveheted kézzel is.
          </EmptyState>
        )}
        {munkak?.map((m) => (
          <Link
            key={m.id}
            href={`/munkak/${m.id}`}
            className="p-4 flex flex-wrap items-center gap-3 hover:bg-line/10"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold">
                {m.partnerek?.nev ?? "Nincs partner megadva"}
              </div>
              <div className="text-sm text-muted truncate">
                {m.cim ?? "Nincs megadva a helyszín"}
                {m.hatarido &&
                  ` · határidő: ${new Date(m.hatarido).toLocaleDateString("hu-HU")}`}
              </div>
            </div>
            <Badge szin={ALLAPOT_SZIN[m.allapot]}>{ALLAPOT_CIMKE[m.allapot]}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
