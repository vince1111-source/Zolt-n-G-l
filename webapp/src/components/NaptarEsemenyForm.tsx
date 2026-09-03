"use client";

import { useActionState } from "react";
import type { EsemenyAllapot } from "@/app/(vedett)/naptar/actions";
import { budapestNapString, budapestIdoString } from "@/lib/het";
import type { Tables } from "@/lib/supabase/types";
import { gombElsodleges } from "./ui/classes";

const kezdoAllapot: EsemenyAllapot = {};

export function NaptarEsemenyForm({
  esemeny,
  alapCim = "",
  alapDatum,
  munkaId,
  munkak,
  action,
  mentesCimke = "Naptárba teszem",
}: {
  esemeny?: Tables<"naptar_esemenyek">;
  alapCim?: string;
  alapDatum?: string;
  /** Ha meg van adva, az esemény ehhez a munkához kötődik, nincs választó. */
  munkaId?: string;
  /** Ha nincs `munkaId`, ebből lehet választani (opcionális kapcsolat). */
  munkak?: { id: string; cim: string | null }[];
  action: (elozo: EsemenyAllapot, adat: FormData) => Promise<EsemenyAllapot>;
  mentesCimke?: string;
}) {
  const [allapot, formAction, folyamatban] = useActionState(action, kezdoAllapot);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <label>
        Cím
        <input
          name="cim"
          required
          defaultValue={esemeny?.cim ?? alapCim}
          placeholder="pl. Felmérés — Kovács Kft."
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 min-w-[140px]">
          Kezdés dátuma
          <input
            name="kezdet_datum"
            type="date"
            required
            defaultValue={esemeny ? budapestNapString(esemeny.kezdet) : alapDatum}
          />
        </label>
        <label className="flex-1 min-w-[120px]">
          Kezdés ideje
          <input
            name="kezdet_ido"
            type="time"
            required
            defaultValue={esemeny ? budapestIdoString(esemeny.kezdet) : "08:00"}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 min-w-[140px]">
          Befejezés dátuma (opcionális)
          <input
            name="veg_datum"
            type="date"
            defaultValue={esemeny?.veg ? budapestNapString(esemeny.veg) : undefined}
          />
        </label>
        <label className="flex-1 min-w-[120px]">
          Befejezés ideje
          <input
            name="veg_ido"
            type="time"
            defaultValue={esemeny?.veg ? budapestIdoString(esemeny.veg) : undefined}
          />
        </label>
      </div>
      {munkaId || esemeny?.munka_id ? (
        <input type="hidden" name="munka_id" value={munkaId ?? esemeny?.munka_id ?? ""} />
      ) : (
        <label>
          Kapcsolódó munka
          <select name="munka_id" defaultValue="">
            <option value="">— nincs —</option>
            {munkak?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.cim ?? "Munka (nincs megadva helyszín)"}
              </option>
            ))}
          </select>
        </label>
      )}

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button type="submit" disabled={folyamatban} className={gombElsodleges}>
        {folyamatban ? "Mentés…" : mentesCimke}
      </button>
    </form>
  );
}
