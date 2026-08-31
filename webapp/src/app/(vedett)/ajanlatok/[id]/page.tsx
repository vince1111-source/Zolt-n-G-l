import { notFound } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { Ft } from "@/lib/format";
import { ajanlatAllapotValtas } from "../actions";

export default async function AjanlatReszletei({
  params,
}: PageProps<"/ajanlatok/[id]">) {
  const { id } = await params;
  const supabase = await szerverKliens();

  const { data: ajanlat } = await supabase
    .from("ajanlatok")
    .select("*, partnerek(nev, kapcsolattarto, email)")
    .eq("id", id)
    .maybeSingle();

  if (!ajanlat) notFound();

  const { data: tetelek } = await supabase
    .from("ajanlat_tetelek")
    .select("*")
    .eq("ajanlat_id", id)
    .order("sorrend");

  const kovetkezoLepesek: Record<string, [string, string][]> = {
    piszkozat: [["kikuldve", "Kiküldöm"]],
    kikuldve: [
      ["elfogadva", "Elfogadták"],
      ["elutasitva", "Elutasították"],
    ],
    elfogadva: [],
    elutasitva: [],
    lejart: [],
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {ajanlat.partnerek?.nev}
        </h1>
        <p className="text-muted mt-1">
          {ajanlat.sorszam} · {new Date(ajanlat.kelt).toLocaleDateString("hu-HU")}
        </p>
      </div>

      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="divide-y divide-line">
          {tetelek?.map((t) => (
            <div key={t.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{t.megnevezes}</div>
                <div className="text-sm text-muted tabular-nums">
                  {t.mennyiseg} {t.mertekegyseg} × {Ft(t.egysegar)}
                </div>
              </div>
              <div className="font-semibold tabular-nums">{Ft(t.netto)}</div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-line/10 flex flex-col gap-1 text-sm">
          {ajanlat.kedvezmeny_szazalek > 0 && (
            <div className="flex justify-between text-muted">
              <span>Törzsvevői kedvezmény</span>
              <span>{ajanlat.kedvezmeny_szazalek}%</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>Nettó</span>
            <span className="tabular-nums">{Ft(ajanlat.netto)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Áfa</span>
            <span className="tabular-nums">{Ft(ajanlat.afa)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t border-line mt-1">
            <span>Bruttó összesen</span>
            <span className="tabular-nums">{Ft(ajanlat.brutto)}</span>
          </div>
        </div>
      </div>

      {kovetkezoLepesek[ajanlat.allapot]?.length > 0 && (
        <div className="flex gap-2">
          {kovetkezoLepesek[ajanlat.allapot].map(([cel, cimke]) => (
            <form key={cel} action={ajanlatAllapotValtas.bind(null, id, cel)}>
              <button
                type="submit"
                className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3"
              >
                {cimke}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
