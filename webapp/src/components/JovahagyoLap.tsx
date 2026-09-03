"use client";

import { useTransition } from "react";
import { aiJavaslatJovahagyasa, type AiEredmeny } from "@/app/(vedett)/actions";
import { Ft } from "@/lib/format";
import { gombElsodleges, gombVeszelyes } from "./ui/classes";

type Javaslat = Extract<AiEredmeny, { allapot: "javaslat" }>;

/**
 * A prototípus `lap`/fej-törzs-láb mintájának portolása: egy teljes
 * képernyős jóváhagyó lap, „amit feltételeztem" doboz + tételbontás +
 * két gomb. Egy képernyő = egy döntés — a CLAUDE.md elve szerint.
 */
export function JovahagyoLap({
  eredmeny,
  onBezar,
  onJovahagyva,
}: {
  eredmeny: Javaslat;
  onBezar: () => void;
  onJovahagyva: (siker: { id: string; sorszam: string }) => void;
}) {
  const [folyamatban, kezdMentes] = useTransition();

  function jovahagyas() {
    kezdMentes(async () => {
      const eredmeny2 = await aiJavaslatJovahagyasa(
        eredmeny.partnerId,
        eredmeny.tetelBemenetek,
      );
      if ("hiba" in eredmeny2) return;
      onJovahagyva(eredmeny2);
    });
  }

  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface w-full sm:max-w-md sm:rounded-xl rounded-t-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-line flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs font-mono uppercase tracking-wider text-muted">
              Ajánlat — javaslat
            </div>
            <h2 className="font-bold text-lg">{eredmeny.partnerNev}</h2>
          </div>
          <button onClick={onBezar} aria-label="Bezárás" className="text-muted text-xl px-2">
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          <div className="bg-figyelem-soft text-figyelem rounded-lg p-3 text-sm flex flex-col gap-1">
            <span className="font-semibold">Amit feltételeztem — nézd át</span>
            <ul className="list-disc pl-5 space-y-1">
              {eredmeny.feltetelezesek.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col divide-y divide-line">
            {eredmeny.elonezet.tetelek.map((t, i) => (
              <div key={i} className="py-2 flex justify-between gap-3 text-sm">
                <span>
                  {t.megnevezes} · {t.mennyiseg} {t.mertekegyseg}
                </span>
                <span className="tabular-nums whitespace-nowrap">{Ft(t.netto)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1 text-sm">
            {eredmeny.elonezet.kedvezmeny > 0 && (
              <div className="flex justify-between text-muted">
                <span>Kedvezmény</span>
                <span>-{Ft(eredmeny.elonezet.kedvezmeny)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>Áfa</span>
              <span>{Ft(eredmeny.elonezet.afa)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-line pt-2 mt-1">
              <span>Bruttó összesen</span>
              <span className="tabular-nums">{Ft(eredmeny.elonezet.brutto)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-line flex flex-col gap-2">
          <button
            onClick={jovahagyas}
            disabled={folyamatban}
            className={gombElsodleges}
          >
            {folyamatban ? "Létrehozás…" : "Jóváhagyom és létrehozom"}
          </button>
          <button onClick={onBezar} className={gombVeszelyes}>
            Mégsem
          </button>
        </div>
      </div>
    </div>
  );
}
