import { szerverKliens } from "@/lib/supabase/server";
import { NagykerTetelForm } from "../NagykerTetelForm";
import { nagykerTetelLetrehozasa } from "../../actions";
import { Card } from "@/components/ui/Card";

export default async function UjNagykerTetel({
  params,
}: PageProps<"/nagyker/[szallitoId]/uj">) {
  const { szallitoId } = await params;
  const supabase = await szerverKliens();
  const { data: termekek } = await supabase
    .from("termekek")
    .select("*")
    .eq("aktiv", true)
    .order("nev");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Új nagyker-tétel</h1>
      <Card className="p-6">
        <NagykerTetelForm
          termekek={termekek ?? []}
          action={nagykerTetelLetrehozasa.bind(null, szallitoId)}
          mentesCimke="Felveszem"
        />
      </Card>
    </div>
  );
}
