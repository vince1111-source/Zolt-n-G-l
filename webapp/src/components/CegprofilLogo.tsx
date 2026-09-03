"use client";

import { useActionState } from "react";
import { logoFeltoltese, type CegprofilAllapot } from "@/app/(vedett)/cegprofil/actions";
import { gombMasodlagos } from "./ui/classes";

const kezdoAllapot: CegprofilAllapot = {};

export function CegprofilLogo({ logoUrl }: { logoUrl: string | null }) {
  const [allapot, action, folyamatban] = useActionState(logoFeltoltese, kezdoAllapot);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- külső Storage URL, nem statikus asset
          <img src={logoUrl} alt="Cég logója" className="h-16 w-16 object-contain rounded-lg border border-line bg-white" />
        ) : (
          <div className="h-16 w-16 rounded-lg border border-dashed border-line flex items-center justify-center text-muted text-xs text-center px-1">
            nincs logó
          </div>
        )}
        <div className="flex-1 flex flex-col gap-2">
          <input type="file" name="logo" accept="image/*" required />
          <p className="text-xs text-muted">PNG vagy JPG, legfeljebb 2 MB. Az ajánlat-dokumentum fejlécén jelenik meg.</p>
        </div>
      </div>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}
      {allapot.siker && <p className="text-rendben text-sm">Logó frissítve.</p>}

      <button type="submit" disabled={folyamatban} className={`${gombMasodlagos} self-start`}>
        {folyamatban ? "Feltöltés…" : "Feltöltöm"}
      </button>
    </form>
  );
}
