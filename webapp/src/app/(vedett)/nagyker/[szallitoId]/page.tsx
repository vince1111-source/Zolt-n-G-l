import { notFound } from "next/navigation";
import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { Ft } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { gombElsodleges, gombMasodlagos, kartya } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NagykerKatalogus({
  params,
}: PageProps<"/nagyker/[szallitoId]">) {
  const { szallitoId } = await params;
  const supabase = await szerverKliens();

  const [{ data: szallito }, { data: tetelek }, { data: fuggoJavaslat }] = await Promise.all([
    supabase
      .from("partnerek")
      .select("nev, weboldal")
      .eq("id", szallitoId)
      .eq("szallito", true)
      .maybeSingle(),
    supabase
      .from("nagyker_tetelek")
      .select("*, termekek(nev)")
      .eq("szallito_id", szallitoId)
      .order("nev"),
    supabase
      .from("javasolt_muveletek")
      .select("id")
      .eq("tipus", "arfrissites")
      .eq("hivatkozott_tabla", "nagyker_tetelek")
      .eq("hivatkozott_id", szallitoId)
      .eq("allapot", "javasolt")
      .maybeSingle(),
  ]);

  if (!szallito) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{szallito.nev}</h1>
          <p className="text-muted mt-1 flex items-center gap-2">
            {tetelek?.length ?? 0} tétel
            {szallito.weboldal && (
              <>
                {" · "}
                <a href={szallito.weboldal} target="_blank" rel="noreferrer" className="underline">
                  Weboldal / katalógus megnyitása
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/nagyker/${szallitoId}/uj`} className={gombMasodlagos}>
            + Új tétel
          </Link>
          <Link href={`/nagyker/${szallitoId}/arfrissites`} className={gombElsodleges}>
            Árfrissítés
          </Link>
        </div>
      </div>

      {fuggoJavaslat && (
        <div className="bg-figyelem-soft text-figyelem rounded-lg p-4 flex items-center justify-between gap-3">
          <span>Egy árfrissítési javaslat jóváhagyásra vár.</span>
          <Link href={`/nagyker/arfrissitesek/${fuggoJavaslat.id}`} className="underline font-semibold">
            Megnézem
          </Link>
        </div>
      )}

      <div className={`${kartya} divide-y divide-line`}>
        {!tetelek?.length && <EmptyState>Még nincs felvett tétel ehhez a beszállítóhoz.</EmptyState>}
        {tetelek?.map((t) => (
          <Link
            key={t.id}
            href={`/nagyker/${szallitoId}/${t.id}`}
            className="p-4 flex flex-wrap items-center gap-3 hover:bg-line/10"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold flex items-center gap-2">
                {t.nev}
                {!t.aktiv && <Badge>inaktív</Badge>}
              </div>
              <div className="text-sm text-muted">
                {t.mertekegyseg}
                {t.termekek?.nev && ` · saját tétel: ${t.termekek.nev}`}
              </div>
            </div>
            <div className="font-semibold tabular-nums">{Ft(t.beszerzesi_ar)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
