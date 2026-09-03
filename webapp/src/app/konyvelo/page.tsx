import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatKonyveloVagyIranyitas } from "@/lib/sajat-konyvelo";
import { Card } from "@/components/ui/Card";
import { kartya } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function KonyveloDashboard() {
  const { felhasznalo } = await sajatKonyveloVagyIranyitas();
  const supabase = await szerverKliens();

  const { data: hozzaferesek } = await supabase
    .from("konyvelo_hozzaferes")
    .select("ceg_id, cegek(nev)")
    .is("visszavonva", null);

  const cegIdk = (hozzaferesek ?? []).map((h) => h.ceg_id);
  const harminNapja = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: dokumentumok } = cegIdk.length
    ? await supabase
        .from("dokumentumok")
        .select("ceg_id, feltoltve")
        .in("ceg_id", cegIdk)
    : { data: [] as { ceg_id: string; feltoltve: string }[] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Jó napot, {felhasznalo.nev}!
        </h1>
        <p className="text-muted mt-1">Az ügyfeleid dokumentumtára.</p>
      </div>

      <div className={`${kartya} divide-y divide-line`}>
        {!hozzaferesek?.length && (
          <EmptyState>
            Még nincs hozzáférésed egyetlen cég adataihoz sem — ezt a cég
            tulajdonosa állítja be a saját Cégadatok oldalán.
          </EmptyState>
        )}
        {hozzaferesek?.map((h) => {
          const cegDokumentumai = (dokumentumok ?? []).filter((d) => d.ceg_id === h.ceg_id);
          const ujabb30Nap = cegDokumentumai.filter((d) => d.feltoltve >= harminNapja).length;
          return (
            <Link
              key={h.ceg_id}
              href={`/konyvelo/${h.ceg_id}`}
              className="p-4 flex items-center justify-between gap-3 hover:bg-line/10"
            >
              <span className="font-semibold">{h.cegek?.nev ?? "Ismeretlen cég"}</span>
              <span className="text-sm text-muted">
                {cegDokumentumai.length} dokumentum
                {ujabb30Nap > 0 && ` · ${ujabb30Nap} új (30 nap)`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
