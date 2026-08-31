"use client";

import { useActionState } from "react";
import Link from "next/link";
import { regisztracio, type RegisztracioAllapot } from "./actions";

const kezdoAllapot: RegisztracioAllapot = {};

export function RegisztracioForm() {
  const [allapot, action, folyamatban] = useActionState(
    regisztracio,
    kezdoAllapot,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <label>
        Cégnév
        <input name="ceg_nev" required placeholder="pl. Kőháló Kft." />
      </label>
      <label>
        A te neved
        <input name="sajat_nev" placeholder="pl. Kovács Péter" />
      </label>
      <label>
        E-mail
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Jelszó
        <input
          name="jelszo"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button
        type="submit"
        disabled={folyamatban}
        className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 disabled:opacity-60"
      >
        {folyamatban ? "Regisztráció…" : "Fiók létrehozása"}
      </button>

      <p className="text-sm text-muted text-center">
        Már van fiókod?{" "}
        <Link href="/bejelentkezes" className="text-brand font-semibold underline">
          Jelentkezz be
        </Link>
      </p>
    </form>
  );
}
