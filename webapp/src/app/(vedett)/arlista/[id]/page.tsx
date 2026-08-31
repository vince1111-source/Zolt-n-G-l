import { notFound } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { ArlistaForm } from "../ArlistaForm";
import { termekFrissitese } from "../actions";

export default async function TermekSzerkesztes({
  params,
}: PageProps<"/arlista/[id]">) {
  const { id } = await params;
  const supabase = await szerverKliens();
  const { data: termek } = await supabase
    .from("termekek")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!termek) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{termek.nev}</h1>
      <div className="bg-surface border border-line rounded-xl p-6">
        <ArlistaForm
          termek={termek}
          action={termekFrissitese.bind(null, id)}
          mentesCimke="Mentem"
        />
      </div>
    </div>
  );
}
