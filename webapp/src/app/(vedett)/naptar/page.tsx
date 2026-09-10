import Link from "next/link";
import { Calendar } from "lucide-react";
import { szerverKliens } from "@/lib/supabase/server";
import { hetTartomany, budapestMaDatum, budapestNapString, datumSzoveg } from "@/lib/het";
import { esemenyTorlese } from "./actions";
import { Card } from "@/components/ui/Card";
import { gombElsodleges, gombMasodlagos, gombVeszelyes } from "@/components/ui/classes";
import { MegerositoGomb } from "@/components/ui/MegerositoGomb";

const ORA: Intl.DateTimeFormatOptions = { timeZone: "Europe/Budapest", hour: "2-digit", minute: "2-digit" };
const NAP_ORA: Intl.DateTimeFormatOptions = { ...ORA, month: "short", day: "numeric" };

/** Egy esemény ideje az adott napon: kezdőnapon "07:00 – szept. 23. 16:00", utána "folytatás". */
function idoSzoveg(e: { kezdet: string; veg: string | null }, nap: string): string {
  const ora = (iso: string) => new Date(iso).toLocaleTimeString("hu-HU", ORA);
  const kezdoNap = budapestNapString(e.kezdet);
  const vegNap = e.veg ? budapestNapString(e.veg) : kezdoNap;
  if (nap === kezdoNap) {
    if (!e.veg) return ora(e.kezdet);
    return vegNap === kezdoNap
      ? `${ora(e.kezdet)} – ${ora(e.veg)}`
      : `${ora(e.kezdet)} – ${new Date(e.veg).toLocaleString("hu-HU", NAP_ORA)}`;
  }
  return nap === vegNap && e.veg ? `folytatás, ${ora(e.veg)}-ig` : "folytatás, egész nap";
}

export default async function Naptar({
  searchParams,
}: PageProps<"/naptar">) {
  const { het: hetParam } = await searchParams;
  // Érvénytelen ?het= esetén a mai hét — különben a dátum-aritmetika NaN-t adna.
  const megjelolt =
    typeof hetParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(hetParam) ? hetParam : budapestMaDatum();
  // A hét tartománya tesztelt segédből (lib/het.ts). Korábban a "következő
  // hét" a vasárnapból visszaszámolt UGYANAZON hétfő lett: a lekérdezés üres
  // tartományt kapott, a naptár egy eseményt sem mutatott, és a "Következő
  // hét" gomb helyben maradt.
  const { napok, elozoHet, kovetkezoHet, tol, ig } = hetTartomany(megjelolt);

  const supabase = await szerverKliens();
  // A többnapos esemény (pl. háromnapos kivitelezés) minden érintett napon
  // látszódjon — akkor is, ha az előző héten kezdődött. Eddig csak a kezdőnapon
  // jelent meg "07:00 – 16:00"-ként, a többi nap szabadnak tűnt.
  const { data: esemenyek } = await supabase
    .from("naptar_esemenyek")
    .select("*, munkak(cim, partnerek(nev))")
    .lt("kezdet", ig)
    .or(`veg.gte."${tol}",and(veg.is.null,kezdet.gte."${tol}")`)
    .order("kezdet");

  const naponta = new Map<string, typeof esemenyek>();
  for (const e of esemenyek ?? []) {
    const kezdoNap = budapestNapString(e.kezdet);
    const vegNap = e.veg ? budapestNapString(e.veg) : kezdoNap;
    for (const nap of napok) {
      if (nap >= kezdoNap && nap <= vegNap) naponta.set(nap, [...(naponta.get(nap) ?? []), e]);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Calendar size={22} className="text-cta" aria-hidden />Naptár</h1>
          <p className="text-muted mt-1">
            {datumSzoveg(napok[0])} – {datumSzoveg(napok[6])}
          </p>
        </div>
        <Link href="/naptar/uj" className={gombElsodleges}>
          + Új esemény
        </Link>
      </div>

      <div className="flex gap-2">
        <Link href={`/naptar?het=${elozoHet}`} className={gombMasodlagos}>
          ← Előző hét
        </Link>
        <Link href={`/naptar?het=${kovetkezoHet}`} className={gombMasodlagos}>
          Következő hét →
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {napok.map((nap) => {
          const napiEsemenyek = naponta.get(nap) ?? [];
          return (
            <Card key={nap} className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-semibold">{datumSzoveg(nap)}</span>
                <Link href={`/naptar/uj?datum=${nap}`} className="text-xs underline text-muted">
                  + esemény
                </Link>
              </div>
              {!napiEsemenyek.length ? (
                <p className="text-sm text-muted">Nincs esemény.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {napiEsemenyek.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/naptar/${e.id}`} className="min-w-0 hover:underline">
                        <div className="font-medium truncate">{e.cim}</div>
                        <div className="text-muted">
                          {idoSzoveg(e, nap)}
                          {e.munkak?.partnerek?.nev && ` · ${e.munkak.partnerek.nev}`}
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {e.munka_id && (
                          <Link href={`/munkak/${e.munka_id}`} className="text-xs underline text-muted">
                            munka
                          </Link>
                        )}
                        <form action={esemenyTorlese.bind(null, e.id)}>
                          <MegerositoGomb kerdes={`Biztosan törlöd: „${e.cim}”?`} className={gombVeszelyes}>
                            Törlöm
                          </MegerositoGomb>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
