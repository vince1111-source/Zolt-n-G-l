import { notFound } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { NagykerTetelForm } from "../NagykerTetelForm";
import { nagykerTetelFrissitese } from "../../actions";
import { Card } from "@/components/ui/Card";

export default async function NagykerTetelSzerkesztes({
  params,
}: PageProps<"/nagyker/[szallitoId]/[tetelId]">) {
  const { szallitoId, tetelId } = await params;
  const supabase = await szerverKliens();

  const [{ data: tetel }, { data: termekek }] = await Promise.all([
    supabase.from("nagyker_tetelek").select("*").eq("id", tetelId).maybeSingle(),
    supabase.from("termekek").select("*").eq("aktiv", true).order("nev"),
  ]);

  if (!tetel) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{tetel.nev}</h1>
      <Card className="p-6">
        <NagykerTetelForm
          tetel={tetel}
          termekek={termekek ?? []}
          action={nagykerTetelFrissitese.bind(null, szallitoId, tetelId)}
          mentesCimke="Mentem"
        />
      </Card>
    </div>
  );
}
