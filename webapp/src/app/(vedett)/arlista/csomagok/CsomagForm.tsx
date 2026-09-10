"use client";

import { useActionState, useState } from "react";
import type { CsomagAllapot } from "./actions";
import type { Tables } from "@/lib/supabase/types";
import { gombElsodleges } from "@/components/ui/classes";

const kezdoAllapot: CsomagAllapot = {};

type Alap = "terulet" | "kerulet";
type Sor = { kulcs: number; termekId: string; mennyiseg: string; alap: Alap };

/**
 * A `termekek` az aktív árlista PLUSZ a csomag által már hivatkozott
 * inaktív termékek (a szerkesztő oldal így adja át): egy inaktivált tétel
 * sora "— inaktív" jelöléssel a helyén marad, nem cserélődik csendben az
 * ábécé első termékére (a böngésző kijelölési szabálya miatt ez történne,
 * ha a hivatkozott érték hiányozna az opciók közül). A mentést a szerver
 * (`csomagok/actions.ts`) inaktív tételnél névvel utasítja el.
 *
 * Soronként megadható, mihez arányos a tétel (0023): a területhez, vagy a
 * területből becsült kerülethez — ez utóbbi a szegélyhez hasonló, a
 * terület szélén futó tételeké.
 */
export function CsomagForm({
  csomag,
  kezdoTetelek,
  termekek,
  action,
  mentesCimke = "Csomag mentése",
}: {
  csomag?: Tables<"munkacsomagok">;
  kezdoTetelek?: { termek_id: string; mennyiseg_egysegre: number; alap?: string | null }[];
  termekek: Tables<"termekek">[];
  action: (elozo: CsomagAllapot, adat: FormData) => Promise<CsomagAllapot>;
  mentesCimke?: string;
}) {
  const [allapot, formAction, folyamatban] = useActionState(action, kezdoAllapot);
  const [sorok, setSorok] = useState<Sor[]>(() =>
    kezdoTetelek?.length
      ? kezdoTetelek.map((t, i) => ({
          kulcs: i,
          termekId: t.termek_id,
          mennyiseg: String(t.mennyiseg_egysegre),
          alap: t.alap === "kerulet" ? "kerulet" : "terulet",
        }))
      : [{ kulcs: 0, termekId: "", mennyiseg: "1", alap: "terulet" }],
  );
  const [egyseg, setEgyseg] = useState(csomag?.mertekegyseg ?? "m2");
  const aktivak = termekek.filter((t) => t.aktiv);

  function sorModositas(kulcs: number, mezo: Partial<Sor>) {
    setSorok((s) => s.map((x) => (x.kulcs === kulcs ? { ...x, ...mezo } : x)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-2xl">
      <label>
        Csomag neve
        <input name="nev" required defaultValue={csomag?.nev ?? ""} placeholder="pl. Térkövezés" />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 min-w-[140px]">
          Alapegység
          <input
            name="mertekegyseg"
            value={egyseg}
            onChange={(e) => setEgyseg(e.target.value)}
            placeholder="m2"
          />
        </label>
        <label className="flex-[2] min-w-[200px]">
          Leírás (opcionális)
          <input name="leiras" defaultValue={csomag?.leiras ?? ""} />
        </label>
      </div>

      <label>
        Kulcsszavak — ezekre is ráismer az AI-doboz (vesszővel)
        <input
          name="kulcsszavak"
          autoComplete="off"
          defaultValue={csomag?.kulcsszavak ?? ""}
          placeholder="pl. járda, terasz, kerti út"
        />
      </label>

      <div className="flex flex-col gap-3">
        <div className="text-sm text-muted flex flex-col gap-1">
          <span>
            Tételek — mennyiség a csomag <strong>1 {egyseg}</strong>-ére vetítve (pl. 1 m²
            térkövezéshez 1,05 m² térkő a vágási ráhagyással). Az ár mindig az árlista
            aktuális árából jön.
          </span>
          <span>
            A <strong>kerülethez arányos</strong> tételeket, például a szegélyt, a rendszer a
            területből becsült kerülettel számolja (négyzet alakot feltételezve), és ezt az
            ajánlaton ki is írja. Zsákos, darabos tételeknél felfelé kerekít.
          </span>
          <span>Az AI-doboz csak m² alapegységű csomaggal számol („50 m² térkövezés”).</span>
        </div>
        {sorok.map((sor) => {
          const termek = termekek.find((t) => t.id === sor.termekId);
          const inaktiv = !!termek && !termek.aktiv;
          const hianyzik = !!sor.termekId && !termek;
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
                  aria-invalid={inaktiv || hianyzik || undefined}
                >
                  <option value="" disabled>
                    Válassz…
                  </option>
                  {hianyzik && <option value={sor.termekId}>Már nincs az árlistában — válassz másikat</option>}
                  {termekek.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nev} ({t.mertekegyseg}){t.aktiv ? "" : " — inaktív"}
                    </option>
                  ))}
                </select>
                {(inaktiv || hianyzik) && (
                  <span className="block text-kritikus text-xs mt-1">
                    Ez a tétel inaktív az árlistán — aktiváld újra, vagy válassz másikat; így nem menthető.
                  </span>
                )}
              </label>
              <label className="sm:w-40 sm:flex-none">
                Mihez arányos?
                <select
                  name="tetel_alap"
                  value={sor.alap}
                  onChange={(e) => sorModositas(sor.kulcs, { alap: e.target.value === "kerulet" ? "kerulet" : "terulet" })}
                >
                  <option value="terulet">a területhez</option>
                  <option value="kerulet">a kerülethez</option>
                </select>
              </label>
              <div className="flex gap-2 items-end">
                <label className="flex-1 sm:w-36 sm:flex-none">
                  {termek
                    ? sor.alap === "kerulet"
                      ? `${termek.mertekegyseg} / kerület-fm`
                      : `${termek.mertekegyseg} / ${egyseg}`
                    : "Mennyiség / egység"}
                  <input
                    name="tetel_mennyiseg"
                    type="number"
                    min={0}
                    step="0.0001"
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
            </div>
          );
        })}
        <button
          type="button"
          onClick={() =>
            setSorok((s) => [
              ...s,
              { kulcs: Math.max(...s.map((x) => x.kulcs)) + 1, termekId: "", mennyiseg: "1", alap: "terulet" },
            ])
          }
          className="text-sm text-cta font-semibold self-start"
        >
          + Új tétel
        </button>
      </div>

      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}

      <button type="submit" disabled={folyamatban || aktivak.length === 0} className={gombElsodleges}>
        {folyamatban ? "Mentés…" : mentesCimke}
      </button>

      {aktivak.length === 0 && (
        <p className="text-sm text-muted">
          Még nincs aktív árlistatételed — egy csomag az árlista tételeiből áll, előbb vegyél fel legalább egyet.
        </p>
      )}
    </form>
  );
}
