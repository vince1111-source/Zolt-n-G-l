import { szerverKliens } from "@/lib/supabase/server";
import { MunkaForm } from "../MunkaForm";
import { munkaLetrehozasa } from "../actions";
import { Card } from "@/components/ui/Card";

export default async function UjMunka() {
  const supabase = await szerverKliens();
  const { data: partnerek } = await supabase
    .from("partnerek")
    .select("*")
    .eq("archivalt", false)
    .order("nev");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Új munka</h1>
      <Card className="p-6">
        <MunkaForm
          partnerek={partnerek ?? []}
          action={munkaLetrehozasa}
          mentesCimke="Felveszem"
        />
      </Card>
    </div>
  );
}
