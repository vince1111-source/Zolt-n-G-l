"use client";

import { useActionState } from "react";
import { konyveloMeghivasa, type MeghivasAllapot } from "./actions";
import { gombElsodleges } from "@/components/ui/classes";

const kezdoAllapot: MeghivasAllapot = {};

export function MeghivasForm() {
  const [allapot, action, folyamatban] = useActionState(konyveloMeghivasa, kezdoAllapot);

  return (
    <form action={action} className="flex flex-col gap-3 max-w-md">
      <label>
        Könyvelő e-mail címe
        <input name="email" type="email" required />
      </label>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}
      {allapot.siker && <p className="text-rendben text-sm">{allapot.siker}</p>}

      <button type="submit" disabled={folyamatban} className={`${gombElsodleges} self-start`}>
        {folyamatban ? "Küldés…" : "Meghívom"}
      </button>
    </form>
  );
}
