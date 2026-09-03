"use client";

import { useActionState } from "react";
import type { MunkaAllapot } from "./actions";
import type { Tables } from "@/lib/supabase/types";
import { gombElsodleges } from "@/components/ui/classes";

const kezdoAllapot: MunkaAllapot = {};

export function MunkaForm({
  munka,
  partnerek,
  action,
  mentesCimke,
}: {
  munka?: Tables<"munkak">;
  partnerek: Tables<"partnerek">[];
  action: (elozo: MunkaAllapot, adat: FormData) => Promise<MunkaAllapot>;
  mentesCimke: string;
}) {
  const [allapot, formAction, folyamatban] = useActionState(
    action,
    kezdoAllapot,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <label>
        Partner
        <select name="partner_id" defaultValue={munka?.partner_id ?? ""}>
          <option value="">— nincs —</option>
          {partnerek.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nev}
            </option>
          ))}
        </select>
      </label>
      <label>
        Helyszín (cím)
        <input
          name="cim"
          required
          placeholder="pl. 1112 Budapest, Fő út 5."
          defaultValue={munka?.cim ?? ""}
        />
      </label>
      <label>
        Leírás
        <textarea name="leiras" rows={3} defaultValue={munka?.leiras ?? ""} />
      </label>
      <label>
        Határidő
        <input name="hatarido" type="date" defaultValue={munka?.hatarido ?? ""} />
      </label>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button type="submit" disabled={folyamatban} className={gombElsodleges}>
        {folyamatban ? "Mentés…" : mentesCimke}
      </button>
    </form>
  );
}
