import Link from "next/link";
import { Package } from "lucide-react";
import { szerverKliens } from "@/lib/supabase/server";
import { gombElsodleges, gombMasodlagos, gombVeszelyes, kartya } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";
import { csomagInaktivalasa } from "./actions";

export default async function Csomagok() {
  const supabase = await szerverKliens();
  const { data: csomagok } = await supabase
    .from("munkacsomagok")
    .select("*, munkacsomag_tetelek(id)")
    .eq("aktiv", true)
    .order("nev");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Package size={22} className="text-cta" aria-hidden />
            Munkacsomagok
          </h1>
          <p className="text-muted mt-1">
            Egy munkatípus tételei egy csomagban — az AI-dobozban elég annyi: „50 m² térkövezés”.
          </p>
        </div>
        <Link href="/arlista/csomagok/uj" className={gombElsodleges}>
          + Új csomag
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        <Link href="/arlista" className={gombMasodlagos}>
          ← Árlista
        </Link>
      </div>

      <div className={`${kartya} divide-y divide-line`}>
        {!csomagok?.length && (
          <EmptyState>
            Még nincs munkacsomag. Egy csomag az árlista tételeiből áll, tételenként megadva,
            mennyi kell belőle a munka egy egységére.
          </EmptyState>
        )}
        {csomagok?.map((c) => (
          <div key={c.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{c.nev}</div>
              <div className="text-sm text-muted truncate">
                {c.munkacsomag_tetelek.length} tétel · egység: {c.mertekegyseg}
                {c.leiras && ` · ${c.leiras}`}
              </div>
            </div>
            <Link href={`/arlista/csomagok/${c.id}`} className={gombMasodlagos}>
              Szerkesztés
            </Link>
            <form action={csomagInaktivalasa.bind(null, c.id)}>
              <button type="submit" className={gombVeszelyes}>
                Inaktiválom
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
