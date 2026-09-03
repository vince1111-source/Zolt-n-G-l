import { notFound } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { arfrissitesJavaslatLetrehozasa } from "../../actions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArfrissitesForm } from "./ArfrissitesForm";

export default async function Arfrissites({
  params,
}: PageProps<"/nagyker/[szallitoId]/arfrissites">) {
  const { szallitoId } = await params;
  const supabase = await szerverKliens();

  const [{ data: szallito }, { data: tetelek }] = await Promise.all([
    supabase.from("partnerek").select("nev").eq("id", szallitoId).maybeSingle(),
    supabase
      .from("nagyker_tetelek")
      .select("id, nev, mertekegyseg, beszerzesi_ar")
      .eq("szallito_id", szallitoId)
      .eq("aktiv", true)
      .order("nev"),
  ]);

  if (!szallito) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Árfrissítés — {szallito.nev}</h1>
      <p className="text-muted">
        Csak azokat írd át, amik ténylegesen változtak — a többi a jelenlegi
        árral marad. A frissítés csak jóváhagyás után kerül a rendszerbe.
      </p>
      <Card className="p-6">
        {!tetelek?.length ? (
          <EmptyState>Nincs aktív tétel ennél a beszállítónál.</EmptyState>
        ) : (
          <ArfrissitesForm
            tetelek={tetelek}
            action={arfrissitesJavaslatLetrehozasa.bind(null, szallitoId)}
          />
        )}
      </Card>
    </div>
  );
}
