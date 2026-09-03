import { szerverKliens } from "@/lib/supabase/server";
import { budapestMaDatum } from "@/lib/het";
import { NaptarEsemenyForm } from "@/components/NaptarEsemenyForm";
import { esemenyLetrehozasa } from "../actions";
import { Card } from "@/components/ui/Card";

export default async function UjEsemeny({
  searchParams,
}: PageProps<"/naptar/uj">) {
  const { datum } = await searchParams;
  const supabase = await szerverKliens();
  const { data: munkak } = await supabase
    .from("munkak")
    .select("id, cim")
    .neq("allapot", "befejezve")
    .order("letrehozva", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Új esemény</h1>
      <Card className="p-6">
        <NaptarEsemenyForm
          alapDatum={typeof datum === "string" ? datum : budapestMaDatum()}
          munkak={munkak ?? []}
          action={esemenyLetrehozasa}
        />
      </Card>
    </div>
  );
}
