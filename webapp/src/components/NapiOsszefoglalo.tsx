"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { napiOsszefoglaloLekerese, type NapiOsszefoglaloEredmeny } from "@/app/(vedett)/osszefoglalo-actions";

/**
 * A "Ma" képernyő AI-összefoglalója. Betöltéskor kéri le (a tároltat, vagy
 * naponta egyszer generál) — az oldal renderje maga nem ír adatbázist.
 * Ha nincs modell bekötve, semmit nem mutat: nem hiányzik semmi, ez a
 * kulcs nélküli, 0. rétegű üzemmód.
 */
export function NapiOsszefoglalo() {
  const [eredmeny, setEredmeny] = useState<NapiOsszefoglaloEredmeny | "betolt">("betolt");

  useEffect(() => {
    let el = false;
    napiOsszefoglaloLekerese().then((e) => {
      if (!el) setEredmeny(e);
    });
    return () => {
      el = true;
    };
  }, []);

  if (eredmeny === "betolt") {
    return <p className="text-sm text-muted animate-pulse">Mai összefoglaló készül…</p>;
  }
  if (eredmeny.allapot === "nincs_bekotve") return null;
  if (eredmeny.allapot === "hiba") {
    return <p className="text-xs text-muted">Mai összefoglaló most nem elérhető ({eredmeny.uzenet}).</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm leading-relaxed">{eredmeny.szoveg}</p>
      <p className="text-xs text-muted flex items-center gap-1.5">
        <Bot size={12} aria-hidden />
        AI-összefoglaló · {eredmeny.modell} · a számok a saját adataidból jönnek, a szöveg
        generált — a lenti kártyák a mérvadók.
      </p>
    </div>
  );
}
