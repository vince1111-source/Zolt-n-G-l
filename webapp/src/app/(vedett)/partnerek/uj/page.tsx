import { PartnerForm } from "../PartnerForm";
import { partnerLetrehozasa } from "../actions";

export default function UjPartner() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Új partner</h1>
      <div className="bg-surface border border-line rounded-xl p-6">
        <PartnerForm action={partnerLetrehozasa} mentesCimke="Felveszem" />
      </div>
    </div>
  );
}
