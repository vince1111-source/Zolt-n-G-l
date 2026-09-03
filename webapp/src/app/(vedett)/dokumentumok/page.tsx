import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { gombElsodleges, gombVeszelyes, kartya } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";
import { dokumentumTorlese } from "./actions";

export default async function Dokumentumok() {
  const supabase = await szerverKliens();
  const { data: dokumentumok } = await supabase
    .from("dokumentumok")
    .select("*")
    .order("feltoltve", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dokumentumok</h1>
          <p className="text-muted mt-1">{dokumentumok?.length ?? 0} dokumentum</p>
        </div>
        <Link href="/dokumentumok/uj" className={gombElsodleges}>
          + Új dokumentum
        </Link>
      </div>

      <div className={`${kartya} divide-y divide-line`}>
        {!dokumentumok?.length && (
          <EmptyState>
            Még nincs rögzített dokumentum. Ha könyvelőt hívsz meg, ő ezeket
            fogja látni.
          </EmptyState>
        )}
        {dokumentumok?.map((d) => (
          <div key={d.id} className="p-4 flex flex-wrap items-center gap-3">
            <a
              href={d.fajl_url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-0 hover:text-cta"
            >
              <div className="font-medium">{d.eredeti_nev ?? d.tipus}</div>
              <div className="text-sm text-muted">
                {d.tipus} · {new Date(d.feltoltve).toLocaleDateString("hu-HU")}
              </div>
            </a>
            <form action={dokumentumTorlese.bind(null, d.id)}>
              <button type="submit" className={gombVeszelyes}>
                Törlöm
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
