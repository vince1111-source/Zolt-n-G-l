"use client";

import { useFormStatus } from "react-dom";
import { Bot } from "lucide-react";
import { MasoloGomb } from "./MasoloGomb";
import { gombMasodlagos } from "./ui/classes";

function GeneraloGomb({ cimke }: { cimke: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${gombMasodlagos} disabled:opacity-60`}>
      {pending ? "Készül…" : cimke}
    </button>
  );
}

/**
 * Az ajánlat kísérőlevele — AI-generált PISZKOZAT, amit a vállalkozó a
 * saját levelezőjébe másol. Innen nem megy ki e-mail (10. modul, V2).
 */
export function KiseroLevel({
  szoveg,
  bekotve,
  action,
}: {
  szoveg: string | null;
  bekotve: boolean;
  action: () => Promise<void>;
}) {
  if (!bekotve) return null;

  return (
    <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold">Kísérőlevél az ajánlathoz</h2>
        <div className="flex items-center gap-2">
          {szoveg && <MasoloGomb szoveg={szoveg} cimke="Levél másolása" />}
          <form action={action}>
            <GeneraloGomb cimke={szoveg ? "Újragenerálom" : "Kísérőlevél (AI)"} />
          </form>
        </div>
      </div>
      {szoveg ? (
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{szoveg}</pre>
      ) : (
        <p className="text-sm text-muted">
          Egy rövid, magázó kísérő e-mail piszkozata az ajánlat adataiból — a saját
          leveleződbe másolod, innen nem megy ki semmi.
        </p>
      )}
      <p className="text-xs text-muted flex items-center gap-1.5">
        <Bot size={12} aria-hidden />
        AI-generált szöveg — küldés előtt olvasd át; csak az ajánlat adatait használja.
      </p>
    </div>
  );
}
