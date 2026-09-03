"use client";

import { useActionState } from "react";
import type { NagykerAllapot } from "../../actions";
import { gombElsodleges } from "@/components/ui/classes";

const kezdoAllapot: NagykerAllapot = {};

export function ArfrissitesForm({
  tetelek,
  action,
}: {
  tetelek: { id: string; nev: string; mertekegyseg: string; beszerzesi_ar: number }[];
  action: (elozo: NagykerAllapot, adat: FormData) => Promise<NagykerAllapot>;
}) {
  const [allapot, formAction, folyamatban] = useActionState(action, kezdoAllapot);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-line">
        {tetelek.map((t) => (
          <div key={t.id} className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium">{t.nev}</div>
              <div className="text-sm text-muted">{t.mertekegyseg}</div>
            </div>
            <label className="w-32">
              Beszerzési ár
              <input
                name={`ar_${t.id}`}
                type="number"
                min={0}
                step="1"
                defaultValue={t.beszerzesi_ar}
              />
            </label>
          </div>
        ))}
      </div>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button type="submit" disabled={folyamatban} className={`${gombElsodleges} self-start`}>
        {folyamatban ? "Feldolgozás…" : "Javaslat elkészítése"}
      </button>
    </form>
  );
}
