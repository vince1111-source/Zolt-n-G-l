import { szerverKliens } from "@/lib/supabase/server";
import { CsomagForm } from "../CsomagForm";
import { csomagLetrehozasa } from "../actions";

export default async function UjCsomag() {
  const supabase = await szerverKliens();
  const { data: termekek } = await supabase.from("termekek").select("*").eq("aktiv", true).order("nev");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Új munkacsomag</h1>
      <div className="bg-surface border border-line rounded-xl p-6">
        <CsomagForm termekek={termekek ?? []} action={csomagLetrehozasa} mentesCimke="Csomag létrehozása" />
      </div>
    </div>
  );
}
