"use client";

import { useActionState } from "react";
import { ceglétrehozasBefejezese, type BefejezesAllapot } from "./actions";

const kezdoAllapot: BefejezesAllapot = {};

export function BefejezesForm({
  cegNevAlapertelmezett,
  sajatNevAlapertelmezett,
  csatlakozasCegNev,
}: {
  cegNevAlapertelmezett: string;
  sajatNevAlapertelmezett: string;
  /** Ha meghívás vár erre az e-mailre: a cég neve — ilyenkor nincs cégnév mező. */
  csatlakozasCegNev: string | null;
}) {
  const [allapot, action, folyamatban] = useActionState(
    ceglétrehozasBefejezese,
    kezdoAllapot,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {csatlakozasCegNev ? (
        <input type="hidden" name="ceg_nev" value="" readOnly />
      ) : (
        <label>
          Cégnév
          <input name="ceg_nev" required defaultValue={cegNevAlapertelmezett} />
        </label>
      )}
      <label>
        A te neved
        <input name="sajat_nev" defaultValue={sajatNevAlapertelmezett} />
      </label>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button
        type="submit"
        disabled={folyamatban}
        className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 disabled:opacity-60"
      >
        {folyamatban ? "Mentés…" : csatlakozasCegNev ? `Csatlakozom: ${csatlakozasCegNev}` : "Kész, indítsuk el"}
      </button>
    </form>
  );
}
