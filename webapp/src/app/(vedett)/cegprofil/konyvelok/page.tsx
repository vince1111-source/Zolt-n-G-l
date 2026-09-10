import { szerverKliens } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { kartya, gombVeszelyes } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";
import { MegerositoGomb } from "@/components/ui/MegerositoGomb";
import { MeghivasForm } from "./MeghivasForm";
import { konyveloVisszavonasa } from "./actions";

export default async function Konyvelok() {
  const supabase = await szerverKliens();
  const { data: hozzaferesek } = await supabase
    .from("konyvelo_hozzaferes")
    .select("*, felhasznalok!konyvelo_hozzaferes_konyvelo_felhasznalo_id_fkey(nev, email)")
    .order("meghivva", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Könyvelők</h1>
        <p className="text-muted mt-1">
          Akit itt meghívsz, a saját fiókjával lép be, és a cégdokumentumaidat
          láthatja — sosem közös jelszóval.
        </p>
      </div>

      <Card className="p-6">
        <MeghivasForm />
      </Card>

      <div className={`${kartya} divide-y divide-line`}>
        {!hozzaferesek?.length && <EmptyState>Még nem hívtál meg könyvelőt.</EmptyState>}
        {hozzaferesek?.map((h) => (
          <div key={h.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{h.felhasznalok?.nev ?? h.felhasznalok?.email}</div>
              <div className="text-sm text-muted">
                {h.visszavonva
                  ? `Visszavonva: ${new Date(h.visszavonva).toLocaleDateString("hu-HU")}`
                  : `Meghívva: ${new Date(h.meghivva).toLocaleDateString("hu-HU")}`}
              </div>
            </div>
            {!h.visszavonva && (
              <form action={konyveloVisszavonasa.bind(null, h.id)}>
                <MegerositoGomb
                  kerdes="Visszavonod a könyvelő hozzáférését? Ezután nem látja a cég dokumentumait."
                  className={gombVeszelyes}
                >
                  Visszavonom
                </MegerositoGomb>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
