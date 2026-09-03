import Link from "next/link";
import { Calendar } from "lucide-react";
import { szerverKliens } from "@/lib/supabase/server";
import { hetElsoDatum, hetNapjai, budapestMaDatum, budapestNapString, datumSzoveg } from "@/lib/het";
import { esemenyTorlese } from "./actions";
import { Card } from "@/components/ui/Card";
import { gombElsodleges, gombMasodlagos, gombVeszelyes } from "@/components/ui/classes";

export default async function Naptar({
  searchParams,
}: PageProps<"/naptar">) {
  const { het: hetParam } = await searchParams;
  const megjelolt = typeof hetParam === "string" ? hetParam : budapestMaDatum();
  const hetfo = hetElsoDatum(megjelolt);
  const napok = hetNapjai(hetfo);
  const kovetkezoHet = hetNapjai(hetElsoDatum(napok[6]))[0];
  const elozoHetElso = new Date(`${hetfo}T00:00:00Z`);
  elozoHetElso.setUTCDate(elozoHetElso.getUTCDate() - 7);
  const elozoHet = elozoHetElso.toISOString().slice(0, 10);

  const supabase = await szerverKliens();
  const { data: esemenyek } = await supabase
    .from("naptar_esemenyek")
    .select("*, munkak(cim, partnerek(nev))")
    .gte("kezdet", `${hetfo}T00:00:00Z`)
    .lt("kezdet", `${kovetkezoHet}T00:00:00Z`)
    .order("kezdet");

  const naponta = new Map<string, typeof esemenyek>();
  for (const e of esemenyek ?? []) {
    const nap = budapestNapString(e.kezdet);
    naponta.set(nap, [...(naponta.get(nap) ?? []), e]);
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
                          {new Date(e.kezdet).toLocaleTimeString("hu-HU", {
                            timeZone: "Europe/Budapest",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {e.veg &&
                            ` – ${new Date(e.veg).toLocaleTimeString("hu-HU", { timeZone: "Europe/Budapest", hour: "2-digit", minute: "2-digit" })}`}
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
                          <button type="submit" className={gombVeszelyes}>
                            Törlöm
                          </button>
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
