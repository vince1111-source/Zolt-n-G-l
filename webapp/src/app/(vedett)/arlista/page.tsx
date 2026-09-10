import Link from "next/link";
import { Suspense } from "react";
import { Tag } from "lucide-react";
import { szerverKliens } from "@/lib/supabase/server";
import { termekAktivalasa, termekInaktivalasa } from "./actions";
import { Ft } from "@/lib/format";
import { illeszkedik, keresoSzo } from "@/lib/kereses";
import { KeresoMezo } from "@/components/KeresoMezo";
import { Badge } from "@/components/ui/Badge";
import { gombElsodleges, gombMasodlagos, gombVeszelyes, kartya } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";

function arres(termek: { beszerzesi_ar: number; eladasi_ar: number }) {
  if (!(termek.eladasi_ar > 0)) return null;
  return Math.round(
    (100 * (termek.eladasi_ar - termek.beszerzesi_ar)) / termek.eladasi_ar,
  );
}

export default async function Arlista({ searchParams }: PageProps<"/arlista">) {
  const { q } = await searchParams;
  const kereses = keresoSzo(q);

  const supabase = await szerverKliens();
  const { data: mind } = await supabase.from("termekek").select("*").order("nev");
  // Az inaktív tételek is kellenek: a tévedésből inaktiváltat innen lehet
  // visszakapcsolni (a munkacsomag-szerkesztő hibaüzenete is ide küld).
  const termekek = (mind ?? []).filter((t) => t.aktiv);
  const inaktivak = (mind ?? []).filter((t) => !t.aktiv);

  const szurt = termekek.filter((t) =>
    illeszkedik(kereses, t.nev, t.cikkszam, t.mertekegyseg, t.kategoria),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Tag size={22} className="text-cta" aria-hidden />Árlista</h1>
          <p className="text-muted mt-1">
            {kereses ? `${szurt.length} találat / ${termekek.length} tétel` : `${termekek.length} tétel`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link href="/arlista/csomagok" className={gombMasodlagos}>
            Munkacsomagok
          </Link>
          <Link href="/arlista/uj" className={gombElsodleges}>
            + Új tétel
          </Link>
        </div>
      </div>

      <Suspense fallback={null}>
        <KeresoMezo placeholder="Keresés név, cikkszám vagy kategória szerint…" />
      </Suspense>

      <div className={`${kartya} divide-y divide-line`}>
        {!termekek.length && <EmptyState>Még nincs felvett tétel.</EmptyState>}
        {!!termekek.length && !szurt.length && (
          <EmptyState>Nincs találat a keresésre.</EmptyState>
        )}
        {szurt.map((t) => {
          const r = arres(t);
          return (
            <div key={t.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{t.nev}</div>
                <div className="text-sm text-muted">
                  {t.mertekegyseg}
                  {t.beszerzesi_ar > 0 &&
                    ` · beszerzés ${Ft(t.beszerzesi_ar)}`}
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="font-semibold tabular-nums">
                  {Ft(t.eladasi_ar)}
                </div>
                {r !== null && t.beszerzesi_ar > 0 && (
                  <div className="mt-1">
                    <Badge szin={r < 0 ? "kritikus" : r < 15 ? "figyelem" : "rendben"}>
                      {r}% árrés
                    </Badge>
                  </div>
                )}
              </div>
              <Link href={`/arlista/${t.id}`} className={gombMasodlagos}>
                Szerkesztés
              </Link>
              <form action={termekInaktivalasa.bind(null, t.id)}>
                <button type="submit" className={gombVeszelyes}>
                  Inaktiválom
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {!!inaktivak.length && (
        <details className={`${kartya} p-4`}>
          <summary className="cursor-pointer font-semibold">
            Inaktív tételek ({inaktivak.length})
          </summary>
          <p className="text-sm text-muted mt-2">
            Ezek nem jelennek meg az ajánlatkészítésben és a munkacsomagokban. Ha
            tévedésből inaktiváltad, itt visszakapcsolhatod.
          </p>
          <div className="divide-y divide-line mt-2">
            {inaktivak.map((t) => (
              <div key={t.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t.nev}</div>
                  <div className="text-sm text-muted">
                    {t.mertekegyseg} · {Ft(t.eladasi_ar)}
                  </div>
                </div>
                <form action={termekAktivalasa.bind(null, t.id)}>
                  <button type="submit" className={gombMasodlagos}>
                    Újraaktiválom
                  </button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
