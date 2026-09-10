"use client";

import { useActionState } from "react";
import { munkatarsMeghivasa, type MeghivasAllapot } from "./actions";
import { gombElsodleges } from "@/components/ui/classes";

const kezdoAllapot: MeghivasAllapot = {};

export function MunkatarsMeghivo() {
  const [allapot, action, folyamatban] = useActionState(munkatarsMeghivasa, kezdoAllapot);

  return (
    <form action={action} className="flex flex-col sm:flex-row gap-2 sm:items-end">
      <label className="flex-1">
        E-mail
        <input name="email" type="email" required placeholder="pl. zoli@pelda.hu" autoComplete="off" />
      </label>
      <label className="flex-1">
        Név (opcionális)
        <input name="nev" placeholder="pl. Gál Zoltán" />
      </label>
      <button type="submit" disabled={folyamatban} className={gombElsodleges}>
        {folyamatban ? "Mentés…" : "Meghívom"}
      </button>
      {allapot.hiba && <p className="text-kritikus text-sm sm:basis-full">{allapot.hiba}</p>}
    </form>
  );
}
