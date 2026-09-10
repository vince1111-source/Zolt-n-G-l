import { notFound, redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { NaptarEsemenyForm } from "@/components/NaptarEsemenyForm";
import { esemenyFrissitese, esemenyTorlese } from "../actions";
import { Card } from "@/components/ui/Card";
import { gombVeszelyes } from "@/components/ui/classes";
import { MegerositoGomb } from "@/components/ui/MegerositoGomb";

async function torlesEsUgrasNaptarba(id: string) {
  "use server";
  await esemenyTorlese(id);
  redirect("/naptar");
}

export default async function EsemenySzerkesztese({
  params,
}: PageProps<"/naptar/[id]">) {
  const { id } = await params;
  const supabase = await szerverKliens();

  const [{ data: esemeny }, { data: munkak }] = await Promise.all([
    supabase.from("naptar_esemenyek").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("munkak")
      .select("id, cim, partnerek(nev)")
      .neq("allapot", "befejezve")
      .order("letrehozva", { ascending: false }),
  ]);

  if (!esemeny) notFound();
  // A választóban "Partner — helyszín": két munka címe egyezhet, a partner dönt.
  const munkaValasztek = (munkak ?? []).map((m) => ({
    id: m.id,
    cim: [m.partnerek?.nev, m.cim].filter(Boolean).join(" — ") || null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Esemény szerkesztése</h1>
      <Card className="p-6">
        <NaptarEsemenyForm
          esemeny={esemeny}
          munkak={munkaValasztek}
          action={esemenyFrissitese.bind(null, id)}
          mentesCimke="Mentem"
        />
      </Card>
      <form action={torlesEsUgrasNaptarba.bind(null, id)}>
        <MegerositoGomb kerdes={`Biztosan törlöd: „${esemeny.cim}”?`} className={gombVeszelyes}>
          Esemény törlése
        </MegerositoGomb>
      </form>
    </div>
  );
}
