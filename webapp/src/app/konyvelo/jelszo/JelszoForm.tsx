"use client";

import { useActionState } from "react";
import { jelszoBeallitasa, type JelszoAllapot } from "./actions";
import { gombElsodleges } from "@/components/ui/classes";

const kezdoAllapot: JelszoAllapot = {};

export function JelszoForm() {
  const [allapot, action, folyamatban] = useActionState(jelszoBeallitasa, kezdoAllapot);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label>
        A neved
        <input name="nev" required placeholder="pl. Kovács Éva" />
      </label>
      <label>
        Új jelszó
        <input name="jelszo" type="password" required minLength={8} />
      </label>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button type="submit" disabled={folyamatban} className={gombElsodleges}>
        {folyamatban ? "Mentés…" : "Tovább"}
      </button>
    </form>
  );
}
