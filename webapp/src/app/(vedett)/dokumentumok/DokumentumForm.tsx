"use client";

import { useActionState } from "react";
import { dokumentumRogzitese, type DokumentumAllapot } from "./actions";
import { gombElsodleges } from "@/components/ui/classes";

const kezdoAllapot: DokumentumAllapot = {};

export function DokumentumForm() {
  const [allapot, action, folyamatban] = useActionState(dokumentumRogzitese, kezdoAllapot);

  return (
    <form action={action} className="flex flex-col gap-4 max-w-md">
      <label>
        Típus
        <input name="tipus" required placeholder="pl. számla, szerződés, bizonylat" />
      </label>
      <label>
        Fájl neve (opcionális)
        <input name="eredeti_nev" placeholder="pl. 2026_08_szamla.pdf" />
      </label>
      <label>
        Fájl linkje
        <input name="fajl_url" required placeholder="https://…" />
      </label>
      <p className="text-xs text-muted">
        Egyelőre egy már meglévő linket kérünk (pl. Google Drive, Dropbox) —
        a közvetlen feltöltés egy következő szeletben készül el.
      </p>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button type="submit" disabled={folyamatban} className={gombElsodleges}>
        {folyamatban ? "Mentés…" : "Rögzítem"}
      </button>
    </form>
  );
}
