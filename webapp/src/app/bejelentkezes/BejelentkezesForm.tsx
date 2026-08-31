"use client";

import { useActionState } from "react";
import Link from "next/link";
import { bejelentkezes, type BejelentkezesAllapot } from "./actions";

const kezdoAllapot: BejelentkezesAllapot = {};

export function BejelentkezesForm() {
  const [allapot, action, folyamatban] = useActionState(
    bejelentkezes,
    kezdoAllapot,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <label>
        E-mail
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Jelszó
        <input
          name="jelszo"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button
        type="submit"
        disabled={folyamatban}
        className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 disabled:opacity-60"
      >
        {folyamatban ? "Belépés…" : "Belépek"}
      </button>

      <p className="text-sm text-muted text-center">
        Még nincs fiókod?{" "}
        <Link href="/regisztracio" className="text-brand font-semibold underline">
          Regisztrálj
        </Link>
      </p>
    </form>
  );
}
