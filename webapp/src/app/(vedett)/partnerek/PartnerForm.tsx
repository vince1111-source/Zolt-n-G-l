"use client";

import { useActionState } from "react";
import type { PartnerAllapot } from "./actions";
import type { Tables } from "@/lib/supabase/types-helpers";

const kezdoAllapot: PartnerAllapot = {};

export function PartnerForm({
  partner,
  action,
  mentesCimke,
}: {
  partner?: Tables<"partnerek">;
  action: (
    elozo: PartnerAllapot,
    adat: FormData,
  ) => Promise<PartnerAllapot>;
  mentesCimke: string;
}) {
  const [allapot, formAction, folyamatban] = useActionState(
    action,
    kezdoAllapot,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <label>
        Név
        <input name="nev" defaultValue={partner?.nev ?? ""} required />
      </label>
      <label>
        Kapcsolattartó
        <input
          name="kapcsolattarto"
          defaultValue={partner?.kapcsolattarto ?? ""}
        />
      </label>
      <label>
        Adószám
        <input name="adoszam" defaultValue={partner?.adoszam ?? ""} />
      </label>
      <label>
        Cím
        <input name="cim" defaultValue={partner?.cim ?? ""} />
      </label>
      <label>
        E-mail
        <input name="email" type="email" defaultValue={partner?.email ?? ""} />
      </label>
      <label>
        Telefon
        <input name="telefon" defaultValue={partner?.telefon ?? ""} />
      </label>
      <label>
        Fizetési határidő (nap)
        <input
          name="fizetesi_hatarido_nap"
          type="number"
          min={0}
          defaultValue={partner?.fizetesi_hatarido_nap ?? 15}
        />
      </label>
      <label>
        Törzsvevői kedvezmény (%)
        <input
          name="kedvezmeny_szazalek"
          type="number"
          min={0}
          max={99}
          step="0.5"
          defaultValue={partner?.kedvezmeny_szazalek ?? 0}
        />
      </label>
      <label className="flex-row items-center gap-2">
        <input
          name="szallito"
          type="checkbox"
          className="w-auto"
          defaultChecked={partner?.szallito ?? false}
        />
        <span>Ez egy szállító (nagyker)</span>
      </label>
      <label>
        Megjegyzés
        <textarea
          name="megjegyzes"
          rows={3}
          defaultValue={partner?.megjegyzes ?? ""}
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
