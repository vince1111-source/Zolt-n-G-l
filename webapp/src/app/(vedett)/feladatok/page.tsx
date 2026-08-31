import { szerverKliens } from "@/lib/supabase/server";
import { UjFeladatForm } from "./UjFeladatForm";
import { feladatKeszre, feladatTorlese } from "./actions";

export default async function Feladatok() {
  const supabase = await szerverKliens();
  const [{ data: feladatok }, { data: partnerek }] = await Promise.all([
    supabase
      .from("feladatok")
      .select("*, partnerek(nev)")
      .eq("allapot", "nyitott")
      .order("surgos", { ascending: false })
      .order("hatarido", { ascending: true, nullsFirst: false }),
    supabase.from("partnerek").select("*").eq("archivalt", false).order("nev"),
  ]);

  const ma = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Teendők</h1>
        <p className="text-muted mt-1">{feladatok?.length ?? 0} nyitott</p>
      </div>

      <UjFeladatForm partnerek={partnerek ?? []} />

      <div className="bg-surface border border-line rounded-xl divide-y divide-line">
        {!feladatok?.length && (
          <p className="p-5 text-muted text-sm">Nincs nyitott teendőd. 🎉</p>
        )}
        {feladatok?.map((f) => {
          const lejart = f.hatarido && f.hatarido < ma;
          return (
            <div key={f.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {f.cim}
                  {f.surgos && (
                    <span className="text-xs font-mono uppercase tracking-wider text-kritikus border border-kritikus rounded-full px-2 py-0.5">
                      sürgős
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted">
                  {f.partnerek?.nev}
                  {f.partnerek?.nev && f.hatarido && " · "}
                  {f.hatarido && (
                    <span className={lejart ? "text-kritikus font-medium" : ""}>
                      {lejart ? "lejárt: " : "határidő: "}
                      {new Date(f.hatarido).toLocaleDateString("hu-HU")}
                    </span>
                  )}
                </div>
              </div>
              <form action={feladatKeszre.bind(null, f.id)}>
                <button
                  type="submit"
                  className="text-sm px-3 py-2 rounded-lg border border-line hover:border-rendben hover:text-rendben"
                >
                  Kész
                </button>
              </form>
              <form action={feladatTorlese.bind(null, f.id)}>
                <button
                  type="submit"
                  className="text-sm px-3 py-2 rounded-lg text-kritikus hover:bg-kritikus-soft"
                >
                  Törlöm
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
