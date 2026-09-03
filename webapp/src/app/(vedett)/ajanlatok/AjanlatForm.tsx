"use client";

import { useActionState, useState } from "react";
import { ajanlatLetrehozasa, type AjanlatAllapot } from "./actions";
import type { Tables } from "@/lib/supabase/types";
import { Ft } from "@/lib/format";
import { gombElsodleges } from "@/components/ui/classes";

const kezdoAllapot: AjanlatAllapot = {};

export function AjanlatForm({
  partnerek,
  termekek,
}: {
  partnerek: Tables<"partnerek">[];
  termekek: Tables<"termekek">[];
}) {
  const [allapot, action, folyamatban] = useActionState(
    ajanlatLetrehozasa,
    kezdoAllapot,
  );
  const [sorok, setSorok] = useState([0]);

  return (
    <form action={action} className="flex flex-col gap-5 max-w-lg">
      <label>
        Partner
        <select name="partner_id" required defaultValue="">
          <option value="" disabled>
            Válassz…
          </option>
          {partnerek.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nev}
              {p.kedvezmeny_szazalek > 0 && ` (${p.kedvezmeny_szazalek}% kedv.)`}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-3">
        <span className="text-sm text-muted">Tételek</span>
        {sorok.map((sorId) => (
          <TetelSor
            key={sorId}
            termekek={termekek}
            onTorles={
              sorok.length > 1
                ? () => setSorok((s) => s.filter((x) => x !== sorId))
                : undefined
            }
          />
        ))}
        <button
          type="button"
          onClick={() => setSorok((s) => [...s, Math.max(...s) + 1])}
          className="text-sm text-brand font-semibold self-start"
        >
          + Új tétel
        </button>
      </div>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button type="submit" disabled={folyamatban} className={gombElsodleges}>
        {folyamatban ? "Mentés…" : "Ajánlat elkészítése"}
      </button>

      {termekek.length === 0 && (
        <p className="text-sm text-muted">
          Még nincs árlistatételed — előbb vegyél fel legalább egyet az
          Árlista oldalon.
        </p>
      )}
    </form>
  );
}

function TetelSor({
  termekek,
  onTorles,
}: {
  termekek: Tables<"termekek">[];
  onTorles?: () => void;
}) {
  const [valasztottId, setValasztottId] = useState("");
  const valasztott = termekek.find((t) => t.id === valasztottId);

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end border border-line rounded-lg p-3 sm:border-0 sm:p-0">
      <label className="flex-1">
        Tétel
        <select
          name="tetel_termek"
          required
          defaultValue=""
          onChange={(e) => setValasztottId(e.target.value)}
        >
          <option value="" disabled>
            Válassz…
          </option>
          {termekek.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nev} — {Ft(t.eladasi_ar)}/{t.mertekegyseg}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2 items-end">
        <label className="flex-1 sm:w-28 sm:flex-none">
          Mennyiség
          <input
            name="tetel_mennyiseg"
            type="number"
            min={0}
            step="0.01"
            required
          />
        </label>
        {onTorles && (
          <button
            type="button"
            onClick={onTorles}
            className="text-kritikus text-sm px-3 py-2 mb-[1px] border border-line rounded-lg sm:border-0"
            aria-label="Tétel törlése"
          >
            ✕
          </button>
        )}
      </div>
      {valasztott?.normaido_perc_egyseg != null ? (
        <label className="sm:w-40 sm:flex-none">
          Szorzó (pl. rétegek száma)
          <input name="tetel_szorzo" type="number" min={0.5} step="0.5" defaultValue={1} />
        </label>
      ) : (
        // Mindig renderelve kell lennie (csak rejtve), különben a
        // getAll("tetel_szorzo") kevesebb elemet adna vissza, mint ahány
        // sor van, és az actions.ts indexes párosítása félrecsúszna.
        <input type="hidden" name="tetel_szorzo" value={1} readOnly />
      )}
    </div>
  );
}
