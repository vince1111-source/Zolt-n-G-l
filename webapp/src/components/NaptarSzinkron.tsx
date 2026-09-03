"use client";

import { useState, useTransition } from "react";
import { naptarFeedTokenUjrageneralasa } from "@/app/(vedett)/cegprofil/actions";
import { gombMasodlagos } from "./ui/classes";

export function NaptarSzinkron({
  feedUrl,
  tulajdonos,
}: {
  feedUrl: string;
  tulajdonos: boolean;
}) {
  const [masolva, setMasolva] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const [folyamatban, kezdVeglegesites] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Ez a link feliratkoztatható a telefonod Google/Apple/Outlook
        naptárába ("naptár hozzáadása URL alapján") — onnantól az
        eseményeid kb. naponta frissülnek nála, plusz alkalmazás nélkül.
        Egyirányú: csak innen megy kifelé, a telefonos naptárban tett
        módosítás nem jön vissza ide. Ne oszd meg senkivel, akit nem
        szeretnél, hogy lássa a naptáradat.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={feedUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 font-mono text-xs"
        />
        <button
          type="button"
          className={gombMasodlagos}
          onClick={async () => {
            await navigator.clipboard.writeText(feedUrl);
            setMasolva(true);
            setTimeout(() => setMasolva(false), 1500);
          }}
        >
          {masolva ? "Másolva!" : "Másolom"}
        </button>
      </div>
      {tulajdonos && (
        <button
          type="button"
          className="text-sm text-kritikus self-start underline disabled:opacity-50"
          disabled={folyamatban}
          onClick={() => {
            if (!confirm("Biztosan új linket kérsz? A régi feliratkozás azonnal leáll.")) return;
            setHiba(null);
            kezdVeglegesites(async () => {
              const eredmeny = await naptarFeedTokenUjrageneralasa();
              if (eredmeny?.hiba) setHiba(eredmeny.hiba);
            });
          }}
        >
          {folyamatban ? "Új link készül…" : "Új link kérése (a régi megszűnik)"}
        </button>
      )}
      {hiba && <p className="text-kritikus text-sm">{hiba}</p>}
    </div>
  );
}
