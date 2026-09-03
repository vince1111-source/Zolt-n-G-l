"use client";

import { useActionState } from "react";
import { fotoFeltoltese, fotoTorlese, type FotoAllapot } from "@/app/(vedett)/munkak/actions";
import { gombMasodlagos } from "./ui/classes";

const kezdoAllapot: FotoAllapot = {};

export function MunkaFotok({
  munkaId,
  fotok,
}: {
  munkaId: string;
  fotok: { id: string; storageUtvonal: string; url: string | null }[];
}) {
  const [allapot, action, folyamatban] = useActionState(
    fotoFeltoltese.bind(null, munkaId),
    kezdoAllapot,
  );

  return (
    <div className="flex flex-col gap-3">
      {!!fotok.length && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {fotok.map((f) => (
            <div key={f.id} className="relative">
              {f.url ? (
                <a href={f.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- aláírt Storage URL, nem statikus asset */}
                  <img
                    src={f.url}
                    alt=""
                    className="aspect-square object-cover rounded-lg border border-line w-full"
                  />
                </a>
              ) : (
                <div className="aspect-square rounded-lg border border-line bg-line/20 flex items-center justify-center text-xs text-muted">
                  nem elérhető
                </div>
              )}
              <form action={fotoTorlese.bind(null, f.id, f.storageUtvonal, munkaId)}>
                <button
                  type="submit"
                  aria-label="Fotó törlése"
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-xs leading-none"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <form action={action} className="flex items-center gap-2">
        <input
          type="file"
          name="foto"
          accept="image/*"
          capture="environment"
          required
          className="flex-1 text-sm"
        />
        <button type="submit" disabled={folyamatban} className={gombMasodlagos}>
          {folyamatban ? "…" : "Feltöltés"}
        </button>
      </form>
      {allapot.hiba && <p className="text-kritikus text-sm">{allapot.hiba}</p>}
    </div>
  );
}
