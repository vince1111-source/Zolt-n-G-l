import { notFound } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { PartnerForm } from "../PartnerForm";
import { partnerFrissitese } from "../actions";

export default async function PartnerSzerkesztes({
  params,
}: PageProps<"/partnerek/[id]">) {
  const { id } = await params;
  const supabase = await szerverKliens();
  const { data: partner } = await supabase
    .from("partnerek")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!partner) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{partner.nev}</h1>
      <div className="bg-surface border border-line rounded-xl p-6">
        <PartnerForm
          partner={partner}
          action={partnerFrissitese.bind(null, id)}
          mentesCimke="Mentem"
        />
      </div>
    </div>
  );
}
