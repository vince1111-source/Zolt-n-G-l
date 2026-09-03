import Link from "next/link";
import { Truck } from "lucide-react";
import { szerverKliens } from "@/lib/supabase/server";
import { kartya } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function Nagyker() {
  const supabase = await szerverKliens();
  const { data: szallitok } = await supabase
    .from("partnerek")
    .select("id, nev, nagyker_tetelek(id)")
    .eq("szallito", true)
    .eq("archivalt", false)
    .order("nev");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Truck size={22} className="text-cta" aria-hidden />Nagyker</h1>
        <p className="text-muted mt-1">
          A beszállítóid katalógusa — a „szállító" jelölésű partnerek.
        </p>
      </div>

      <div className={`${kartya} divide-y divide-line`}>
        {!szallitok?.length && (
          <EmptyState>
            Még nincs szállítóként megjelölt partnered. A Partnerek oldalon
            jelölj meg egyet szállítóként, hogy itt megjelenjen.
          </EmptyState>
        )}
        {szallitok?.map((sz) => (
          <Link
            key={sz.id}
            href={`/nagyker/${sz.id}`}
            className="p-4 flex items-center justify-between gap-3 hover:bg-line/10"
          >
            <span className="font-semibold">{sz.nev}</span>
            <span className="text-sm text-muted">{sz.nagyker_tetelek.length} tétel</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
