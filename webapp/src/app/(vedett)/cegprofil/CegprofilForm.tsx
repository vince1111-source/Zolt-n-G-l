"use client";

import { useActionState } from "react";
import { cegprofilMentese, type CegprofilAllapot } from "./actions";
import type { Tables } from "@/lib/supabase/types";

const kezdoAllapot: CegprofilAllapot = {};

export function CegprofilForm({ ceg }: { ceg: Tables<"cegek"> }) {
  const [allapot, action, folyamatban] = useActionState(
    cegprofilMentese,
    kezdoAllapot,
  );

  return (
    <form action={action} className="flex flex-col gap-4 max-w-md">
      <label>
        Cégnév
        <input name="nev" defaultValue={ceg.nev} required />
      </label>
      <label>
        Adószám
        <input name="adoszam" defaultValue={ceg.adoszam ?? ""} />
      </label>
      <label>
        Székhely
        <input name="cim" defaultValue={ceg.cim ?? ""} />
      </label>
      <label>
        Bankszámlaszám
        <input name="bankszamla" defaultValue={ceg.bankszamla ?? ""} />
      </label>
      <label>
        E-mail
        <input name="email" type="email" defaultValue={ceg.email ?? ""} />
      </label>
      <label>
        Telefon
        <input name="telefon" defaultValue={ceg.telefon ?? ""} />
      </label>

      {allapot.hiba && (
        <p className="text-kritikus text-sm">{allapot.hiba}</p>
      )}
      {allapot.siker && (
        <p className="text-rendben text-sm">Mentve.</p>
      )}

      <button
        type="submit"
        disabled={folyamatban}
        className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 disabled:opacity-60"
      >
        {folyamatban ? "Mentés…" : "Mentem"}
      </button>
    </form>
  );
}
