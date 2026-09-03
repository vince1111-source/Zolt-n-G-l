"use client";

import { useState } from "react";
import Link from "next/link";
import { kovetesSzoveg } from "@/lib/kovetes";
import { Ft } from "@/lib/format";
import { Badge } from "./ui/Badge";
import { gombMasodlagos } from "./ui/classes";

export type Varakozo = {
  id: string;
  sorszam: string;
  partnerNev: string;
  brutto: number;
  napok: number;
};

export function KovetesLista({ varakozok }: { varakozok: Varakozo[] }) {
  const [nyitva, setNyitva] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {varakozok.map((v) => (
        <div key={v.id} className="border border-line rounded-lg p-3">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/ajanlatok/${v.id}`} className="min-w-0">
              <div className="font-medium truncate">{v.partnerNev}</div>
              <div className="text-sm text-muted">
                {v.sorszam} · {Ft(v.brutto)}
              </div>
            </Link>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge szin={v.napok >= 7 ? "kritikus" : "figyelem"}>
                {v.napok} napja nincs válasz
              </Badge>
              <button
                type="button"
                onClick={() => setNyitva((n) => (n === v.id ? null : v.id))}
                className={gombMasodlagos}
              >
                Utánkövetés
              </button>
            </div>
          </div>
          {nyitva === v.id && <KovetesSzoveg varakozo={v} />}
        </div>
      ))}
    </div>
  );
}

function KovetesSzoveg({ varakozo }: { varakozo: Varakozo }) {
  const [masolva, setMasolva] = useState(false);
  const szoveg = kovetesSzoveg({
    partnerNev: varakozo.partnerNev,
    sorszam: varakozo.sorszam,
    brutto: varakozo.brutto,
    napok: varakozo.napok,
  });

  return (
    <div className="mt-3 pt-3 border-t border-line flex flex-col gap-2">
      <p className="text-sm whitespace-pre-line text-muted">{szoveg}</p>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(szoveg);
          setMasolva(true);
          setTimeout(() => setMasolva(false), 1500);
        }}
        className={gombMasodlagos + " self-start"}
      >
        {masolva ? "Másolva!" : "Másolom"}
      </button>
    </div>
  );
}
