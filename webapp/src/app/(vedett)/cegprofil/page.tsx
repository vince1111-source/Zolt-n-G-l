import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { CegprofilForm } from "./CegprofilForm";

export default async function Cegprofil() {
  const { ceg } = await sajatCegVagyIranyitas();
  if (!ceg) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Cégadatok</h1>
        <p className="text-muted mt-1">
          Ezek jelennek meg az ajánlatok fejlécében és a kiküldött
          dokumentumokon.
        </p>
      </div>
      <div className="bg-surface border border-line rounded-xl p-6">
        <CegprofilForm ceg={ceg} />
      </div>
    </div>
  );
}
