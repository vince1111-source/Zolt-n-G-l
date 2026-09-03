"use client";

import { useActionState } from "react";
import type { NagykerAllapot } from "../actions";
import type { Tables } from "@/lib/supabase/types";
import { gombElsodleges } from "@/components/ui/classes";

const kezdoAllapot: NagykerAllapot = {};

export function NagykerTetelForm({
  tetel,
  termekek,
  action,
  mentesCimke,
}: {
  tetel?: Tables<"nagyker_tetelek">;
  termekek: Tables<"termekek">[];
  action: (elozo: NagykerAllapot, adat: FormData) => Promise<NagykerAllapot>;
  mentesCimke: string;
}) {
  const [allapot, formAction, folyamatban] = useActionState(action, kezdoAllapot);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <label>
        Megnevezés
        <input name="nev" defaultValue={tetel?.nev ?? ""} required />
      </label>
      <label>
        Cikkszám
        <input name="cikkszam" defaultValue={tetel?.cikkszam ?? ""} />
      </label>
      <label>
        Mennyiségi egység
        <input
          name="mertekegyseg"
          placeholder="m², fm, t, zsák"
          defaultValue={tetel?.mertekegyseg ?? ""}
          required
        />
      </label>
      {!tetel && (
        <label>
          Kezdő beszerzési ár (Ft)
          <input name="beszerzesi_ar" type="number" min={0} step="1" defaultValue={0} />
        </label>
      )}
      <label>
        Kapcsolt saját árlistatétel (opcionális)
        <select name="termek_id" defaultValue={tetel?.termek_id ?? ""}>
          <option value="">— nincs —</option>
          {termekek.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nev}
            </option>
          ))}
        </select>
      </label>
      {tetel && (
        <label className="flex-row items-center gap-2">
          <input name="aktiv" type="checkbox" className="w-auto" defaultChecked={tetel.aktiv} />
          <span>Aktív</span>
        </label>
      )}

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button type="submit" disabled={folyamatban} className={gombElsodleges}>
        {folyamatban ? "Mentés…" : mentesCimke}
      </button>

      {tetel && (
        <p className="text-xs text-muted">
          A beszerzési ár itt nem módosítható — az „Árfrissítés" folyamaton
          keresztül megy, jóváhagyással.
        </p>
      )}
    </form>
  );
}
