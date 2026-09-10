import { notFound } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { CsomagForm } from "../CsomagForm";
import { csomagFrissitese } from "../actions";

export default async function CsomagSzerkesztes({
  params,
}: PageProps<"/arlista/csomagok/[id]">) {
  const { id } = await params;
  const supabase = await szerverKliens();

  const [{ data: csomag }, { data: tetelek }, { data: termekek }] = await Promise.all([
    supabase.from("munkacsomagok").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("munkacsomag_tetelek")
      .select("termek_id, mennyiseg_egysegre, alap")
      .eq("csomag_id", id)
      .order("sorrend"),
    // Minden termék, nem csak az aktív: a csomag által hivatkozott inaktív
    // tétel is látszódjon a helyén, jelölve (lásd CsomagForm docblock).
    supabase.from("termekek").select("*").order("nev"),
  ]);

  if (!csomag) notFound();

  const hivatkozott = new Set((tetelek ?? []).map((t) => t.termek_id));
  const valaszthato = (termekek ?? []).filter((t) => t.aktiv || hivatkozott.has(t.id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{csomag.nev}</h1>
      <div className="bg-surface border border-line rounded-xl p-6">
        <CsomagForm
          csomag={csomag}
          kezdoTetelek={tetelek ?? []}
          termekek={valaszthato}
          action={csomagFrissitese.bind(null, id)}
          mentesCimke="Mentem"
        />
      </div>
    </div>
  );
}
