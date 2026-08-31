"use client";

import { useActionState } from "react";
import { feladatLetrehozasa, type FeladatAllapot } from "./actions";
import type { Tables } from "@/lib/supabase/types";

const kezdoAllapot: FeladatAllapot = {};

export function UjFeladatForm({ partnerek }: { partnerek: Tables<"partnerek">[] }) {
  const [allapot, action, folyamatban] = useActionState(
    feladatLetrehozasa,
    kezdoAllapot,
  );

  return (
    <form action={action} className="bg-surface border border-line rounded-xl p-5 flex flex-col gap-3">
      <label>
        Mit kell elintézni?
        <input name="cim" required placeholder="pl. Hívd fel a Kovács Kft-t" />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 min-w-[140px]">
          Határidő
          <input name="hatarido" type="date" />
        </label>
        <label className="flex-1 min-w-[160px]">
          Kapcsolódó partner
          <select name="partner_id" defaultValue="">
            <option value="">— nincs —</option>
            {partnerek.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nev}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex-row items-center gap-2">
        <input name="surgos" type="checkbox" className="w-auto" />
        <span>Sürgős</span>
      </label>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button
        type="submit"
        disabled={folyamatban}
        className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 self-start disabled:opacity-60"
      >
        {folyamatban ? "Mentés…" : "+ Felveszem"}
      </button>
    </form>
  );
}
