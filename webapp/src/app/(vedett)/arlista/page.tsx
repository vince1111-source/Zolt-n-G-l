import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { termekInaktivalasa } from "./actions";

const forint = new Intl.NumberFormat("hu-HU");

function arres(termek: { beszerzesi_ar: number; eladasi_ar: number }) {
  if (!(termek.eladasi_ar > 0)) return null;
  return Math.round(
    (100 * (termek.eladasi_ar - termek.beszerzesi_ar)) / termek.eladasi_ar,
  );
}

export default async function Arlista() {
  const supabase = await szerverKliens();
  const { data: termekek } = await supabase
    .from("termekek")
    .select("*")
    .eq("aktiv", true)
    .order("nev");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Árlista</h1>
          <p className="text-muted mt-1">{termekek?.length ?? 0} tétel</p>
        </div>
        <Link
          href="/arlista/uj"
          className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 whitespace-nowrap"
        >
          + Új tétel
        </Link>
      </div>

      <div className="bg-surface border border-line rounded-xl divide-y divide-line">
        {!termekek?.length && (
          <p className="p-5 text-muted text-sm">Még nincs felvett tétel.</p>
        )}
        {termekek?.map((t) => {
          const r = arres(t);
          return (
            <div key={t.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{t.nev}</div>
                <div className="text-sm text-muted">
                  {t.mertekegyseg}
                  {t.beszerzesi_ar > 0 &&
                    ` · beszerzés ${forint.format(t.beszerzesi_ar)} Ft`}
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="font-semibold tabular-nums">
                  {forint.format(t.eladasi_ar)} Ft
                </div>
                {r !== null && t.beszerzesi_ar > 0 && (
                  <div
                    className={`text-xs font-mono rounded-full px-2 py-0.5 inline-block mt-1 ${
                      r < 0
                        ? "bg-kritikus-soft text-kritikus"
                        : r < 15
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rendben-soft text-rendben"
                    }`}
                  >
                    {r}% árrés
                  </div>
                )}
              </div>
              <Link
                href={`/arlista/${t.id}`}
                className="text-sm px-3 py-2 rounded-lg border border-line hover:border-cta"
              >
                Szerkesztés
              </Link>
              <form action={termekInaktivalasa.bind(null, t.id)}>
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
