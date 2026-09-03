import { notFound } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { Ft } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { gombElsodleges, gombMasodlagos, gombVeszelyes } from "@/components/ui/classes";
import { arfrissitesJovahagyasa, arfrissitesElvetese, type ArfrissitesSor } from "../../actions";

export default async function ArfrissitesReview({
  params,
}: PageProps<"/nagyker/arfrissitesek/[javaslatId]">) {
  const { javaslatId } = await params;
  const supabase = await szerverKliens();

  const { data: javaslat } = await supabase
    .from("javasolt_muveletek")
    .select("*")
    .eq("id", javaslatId)
    .eq("tipus", "arfrissites")
    .maybeSingle();

  if (!javaslat) notFound();

  const tartalom = javaslat.javaslat as { szallito: string | null; sorok: ArfrissitesSor[] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Árfrissítés — {tartalom.szallito ?? "beszállító"}
        </h1>
        <p className="text-muted mt-1">
          {new Date(javaslat.javasolva).toLocaleString("hu-HU")}
        </p>
      </div>

      <Card className="p-5 divide-y divide-line">
        {tartalom.sorok.map((s) => (
          <div key={s.tetelId} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="font-medium">{s.nev}</span>
            <span className="tabular-nums">
              {Ft(s.regiBeszerzesiAr)} → <strong>{Ft(s.ujBeszerzesiAr)}</strong>
              {s.ujEladasiAr !== null && (
                <span className="text-muted">
                  {" "}
                  (eladási: {Ft(s.regiEladasiAr ?? 0)} → {Ft(s.ujEladasiAr)})
                </span>
              )}
            </span>
          </div>
        ))}
      </Card>

      {javaslat.allapot === "javasolt" ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <form action={arfrissitesJovahagyasa.bind(null, javaslatId, "teljes")}>
            <button type="submit" className={gombElsodleges}>
              Átvezetem — az árrésem marad
            </button>
          </form>
          <form action={arfrissitesJovahagyasa.bind(null, javaslatId, "csak_beszerzes")}>
            <button type="submit" className={gombMasodlagos}>
              Csak a beszerzési árat
            </button>
          </form>
          <form action={arfrissitesElvetese.bind(null, javaslatId)}>
            <button type="submit" className={gombVeszelyes}>
              Elvetem
            </button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Állapot: <strong>{javaslat.allapot}</strong>
          {javaslat.vegrehajtva && ` · ${new Date(javaslat.vegrehajtva).toLocaleString("hu-HU")}`}
        </p>
      )}
    </div>
  );
}
