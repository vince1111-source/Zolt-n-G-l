"use client";

import { useActionState } from "react";
import type { TermekAllapot } from "./actions";
import type { Tables } from "@/lib/supabase/types";

const kezdoAllapot: TermekAllapot = {};

const KATEGORIAK: Array<[Tables<"termekek">["kategoria"], string]> = [
  ["anyag", "Anyag"],
  ["munkadij", "Munkadíj"],
  ["szolgaltatas", "Szolgáltatás"],
];

export function ArlistaForm({
  termek,
  action,
  mentesCimke,
}: {
  termek?: Tables<"termekek">;
  action: (elozo: TermekAllapot, adat: FormData) => Promise<TermekAllapot>;
  mentesCimke: string;
}) {
  const [allapot, formAction, folyamatban] = useActionState(
    action,
    kezdoAllapot,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <label>
        Megnevezés
        <input name="nev" defaultValue={termek?.nev ?? ""} required />
      </label>
      <label>
        Cikkszám
        <input name="cikkszam" defaultValue={termek?.cikkszam ?? ""} />
      </label>
      <label>
        Mennyiségi egység
        <input
          name="mertekegyseg"
          placeholder="m², fm, db, alk."
          defaultValue={termek?.mertekegyseg ?? ""}
          required
        />
      </label>
      <label>
        Kategória
        <select name="kategoria" defaultValue={termek?.kategoria ?? "anyag"}>
          {KATEGORIAK.map(([ertek, cimke]) => (
            <option key={ertek} value={ertek}>
              {cimke}
            </option>
          ))}
        </select>
      </label>
      <label>
        Beszerzési ár (Ft) — nagyker vagy önköltség
        <input
          name="beszerzesi_ar"
          type="number"
          min={0}
          step="1"
          defaultValue={termek?.beszerzesi_ar ?? 0}
        />
      </label>
      <label>
        Eladási ár (Ft)
        <input
          name="eladasi_ar"
          type="number"
          min={0}
          step="1"
          defaultValue={termek?.eladasi_ar ?? ""}
          required
        />
      </label>
      <label>
        Áfakulcs (%)
        <input
          name="afa_kulcs"
          type="number"
          min={0}
          max={100}
          defaultValue={termek?.afa_kulcs ?? 27}
        />
      </label>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button
        type="submit"
        disabled={folyamatban}
        className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 disabled:opacity-60"
      >
        {folyamatban ? "Mentés…" : mentesCimke}
      </button>
    </form>
  );
}
