"use client";

import { useActionState, useState } from "react";
import type { AjanlatAllapot } from "./actions";
import type { Tables } from "@/lib/supabase/types";
import { Ft } from "@/lib/format";
import { csomagTetelBemenetek } from "@/lib/munkacsomag";
import { gombElsodleges, gombMasodlagos } from "@/components/ui/classes";

const kezdoAllapot: AjanlatAllapot = {};

export type Csomag = Tables<"munkacsomagok"> & {
  munkacsomag_tetelek: { termek_id: string; mennyiseg_egysegre: number }[];
};

export type KezdoSor = { termekId: string; mennyiseg: number; szorzo: number };

type Sor = { kulcs: number; termekId: string; mennyiseg: string; szorzo: string };

/**
 * Az ajánlat-űrlap — létrehozáshoz ÉS (piszkozat) szerkesztéshez ugyanaz
 * (`kezdoSorok` + `action`), és a munkacsomagokból egy gombbal tölti fel a
 * tételeket. A sorok vezérelt állapotban vannak (nem `defaultValue`), mert
 * csak így lehet őket kívülről — csomagból, meglévő ajánlatból — feltölteni.
 *
 * A `termekek` csak az AKTÍV árlista. Ha egy meglévő sor inaktivált
 * termékre mutat, a select-ben egy jelölt "Már nincs az árlistában" opció
 * tartja a helyét (NEM disabled: a disabled+selected opció kimaradna a
 * FormData-ból, és a tetel_termek/tetel_mennyiseg indexpárosítás
 * elcsúszna) — a szerver (`ajanlatSzamitas` aktív-szűrője) az ilyen sort
 * névvel elutasítja, a böngésző pedig nem cserélheti csendben az ábécé
 * első termékére.
 */
export function AjanlatForm({
  partnerek,
  termekek,
  csomagok = [],
  kezdoPartnerId = "",
  kezdoSorok,
  action,
  mentesCimke = "Ajánlat elkészítése",
}: {
  partnerek: Tables<"partnerek">[];
  termekek: Tables<"termekek">[];
  csomagok?: Csomag[];
  kezdoPartnerId?: string;
  kezdoSorok?: KezdoSor[];
  action: (elozo: AjanlatAllapot, adat: FormData) => Promise<AjanlatAllapot>;
  mentesCimke?: string;
}) {
  const [allapot, formAction, folyamatban] = useActionState(action, kezdoAllapot);
  const [sorok, setSorok] = useState<Sor[]>(() =>
    kezdoSorok?.length
      ? kezdoSorok.map((s, i) => ({ kulcs: i, termekId: s.termekId, mennyiseg: String(s.mennyiseg), szorzo: String(s.szorzo) }))
      : [{ kulcs: 0, termekId: "", mennyiseg: "", szorzo: "1" }],
  );
  const [csomagId, setCsomagId] = useState("");
  const [csomagMennyiseg, setCsomagMennyiseg] = useState("");
  const [csomagUzenet, setCsomagUzenet] = useState<string | null>(null);
  const valasztottCsomag = csomagok.find((c) => c.id === csomagId);
  const aktivIdk = new Set(termekek.map((t) => t.id));

  function sorModositas(kulcs: number, mezo: Partial<Sor>) {
    setSorok((s) => s.map((x) => (x.kulcs === kulcs ? { ...x, ...mezo } : x)));
  }

  function csomagHozzaadasa() {
    if (!valasztottCsomag) return;
    const alap = Number(csomagMennyiseg.replace(",", "."));
    const mind = csomagTetelBemenetek(valasztottCsomag.munkacsomag_tetelek, alap);
    const ujak = mind.filter((u) => aktivIdk.has(u.termekId));
    const kimaradt = mind.length - ujak.length;
    setCsomagUzenet(
      kimaradt ? `${kimaradt} tétel kimaradt, mert már nincs az aktív árlistában — nézd át a csomagot.` : null,
    );
    if (!ujak.length) return;
    setSorok((s) => {
      // Az üres, még ki nem töltött kezdősort a csomag tételei váltják.
      const alapSorok = s.filter((x) => x.termekId || x.mennyiseg);
      let kulcs = s.reduce((m, x) => Math.max(m, x.kulcs), -1) + 1;
      return [
        ...alapSorok,
        ...ujak.map((u) => ({ kulcs: kulcs++, termekId: u.termekId, mennyiseg: String(u.mennyiseg), szorzo: "1" })),
      ];
    });
    setCsomagMennyiseg("");
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      <label>
        Partner
        <select name="partner_id" required defaultValue={kezdoPartnerId}>
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

      {csomagok.length > 0 && (
        <div className="border border-line rounded-lg p-3 flex flex-col gap-2">
          <span className="text-sm font-semibold">Munkacsomagból</span>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <label className="flex-1">
              Csomag
              <select value={csomagId} onChange={(e) => setCsomagId(e.target.value)}>
                <option value="">Válassz…</option>
                {csomagok.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nev} ({c.munkacsomag_tetelek.length} tétel)
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:w-32 sm:flex-none">
              Mennyiség{valasztottCsomag ? ` (${valasztottCsomag.mertekegyseg})` : ""}
              <input
                type="number"
                min={0}
                step="0.01"
                value={csomagMennyiseg}
                onChange={(e) => setCsomagMennyiseg(e.target.value)}
                placeholder="pl. 50"
              />
            </label>
            <button
              type="button"
              onClick={csomagHozzaadasa}
              disabled={!valasztottCsomag || !(Number(csomagMennyiseg.replace(",", ".")) > 0)}
              className={`${gombMasodlagos} disabled:opacity-50`}
            >
              Tételek hozzáadása
            </button>
          </div>
          {csomagUzenet && <p className="text-figyelem text-xs">{csomagUzenet}</p>}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-sm text-muted">Tételek</span>
        {sorok.map((sor) => {
          const valasztott = termekek.find((t) => t.id === sor.termekId);
          const hianyzik = !!sor.termekId && !valasztott;
          return (
            <div
              key={sor.kulcs}
              className="flex flex-col sm:flex-row gap-2 sm:items-end border border-line rounded-lg p-3 sm:border-0 sm:p-0"
            >
              <label className="flex-1">
                Tétel
                <select
                  name="tetel_termek"
                  required
                  value={sor.termekId}
                  onChange={(e) => sorModositas(sor.kulcs, { termekId: e.target.value })}
                  aria-invalid={hianyzik || undefined}
                >
                  <option value="" disabled>
                    Válassz…
                  </option>
                  {hianyzik && <option value={sor.termekId}>Már nincs az árlistában — válassz másikat</option>}
                  {termekek.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nev} — {Ft(t.eladasi_ar)}/{t.mertekegyseg}
                    </option>
                  ))}
                </select>
                {hianyzik && (
                  <span className="block text-kritikus text-xs mt-1">
                    Ez a tétel inaktív lett az árlistán — válassz másikat, vagy töröld a sort.
                  </span>
                )}
              </label>
              <div className="flex gap-2 items-end">
                <label className="flex-1 sm:w-28 sm:flex-none">
                  Mennyiség{valasztott ? ` (${valasztott.mertekegyseg})` : ""}
                  <input
                    name="tetel_mennyiseg"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={sor.mennyiseg}
                    onChange={(e) => sorModositas(sor.kulcs, { mennyiseg: e.target.value })}
                  />
                </label>
                {sorok.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSorok((s) => s.filter((x) => x.kulcs !== sor.kulcs))}
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
                  <input
                    name="tetel_szorzo"
                    type="number"
                    min={0.5}
                    step="0.5"
                    value={sor.szorzo}
                    onChange={(e) => sorModositas(sor.kulcs, { szorzo: e.target.value })}
                  />
                </label>
              ) : (
                // Mindig renderelve kell lennie (csak rejtve), különben a
                // getAll("tetel_szorzo") kevesebb elemet adna vissza, mint ahány
                // sor van, és az actions.ts indexes párosítása félrecsúszna.
                <input type="hidden" name="tetel_szorzo" value={1} readOnly />
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() =>
            setSorok((s) => [...s, { kulcs: s.reduce((m, x) => Math.max(m, x.kulcs), -1) + 1, termekId: "", mennyiseg: "", szorzo: "1" }])
          }
          className="text-sm text-cta font-semibold self-start"
        >
          + Új tétel
        </button>
      </div>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button type="submit" disabled={folyamatban} className={gombElsodleges}>
        {folyamatban ? "Mentés…" : mentesCimke}
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
