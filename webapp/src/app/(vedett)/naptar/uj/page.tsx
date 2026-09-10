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
    .select("id, cim, partnerek(nev)")
    .neq("allapot", "befejezve")
    .order("letrehozva", { ascending: false });
  // A választóban "Partner — helyszín": két munka címe egyezhet, a partner dönt.
  const munkaValasztek = (munkak ?? []).map((m) => ({
    id: m.id,
    cim: [m.partnerek?.nev, m.cim].filter(Boolean).join(" — ") || null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Új esemény</h1>
      <Card className="p-6">
        <NaptarEsemenyForm
          alapDatum={typeof datum === "string" ? datum : budapestMaDatum()}
          munkak={munkaValasztek}
          action={esemenyLetrehozasa}
        />
      </Card>
    </div>
  );
}
