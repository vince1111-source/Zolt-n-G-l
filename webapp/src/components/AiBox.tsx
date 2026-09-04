"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  aiErtelmezes,
  aiJavaslatJovahagyasa,
  type AiEredmeny,
} from "@/app/(vedett)/actions";
import { JovahagyoLap } from "./JovahagyoLap";
import { Ft } from "@/lib/format";
import { gombElsodleges, gombMasodlagos } from "./ui/classes";

const PELDAK = [
  "Készíts ajánlatot Kovács Építő Kft.-nek 50 m²-re",
  "Készíts ajánlatot Nagy Istvánnak 30 m²-re",
  "Holnap 10-kor megyek Kovácshoz",
  "Hogy állunk Kovácssal?",
  "Írd fel, hogy hívjam fel Kovácsot holnap",
];

const AJANLAT_CIMKE: Record<string, string> = {
  piszkozat: "piszkozat",
  kikuldve: "kiküldve",
  elfogadva: "elfogadva",
  elutasitva: "elutasítva",
  lejart: "lejárt",
};

const OFFLINE_SOR_KULCS = "cegemai_offline_sor";

/**
 * Terepi funkció: rossz térerőn a beírt parancs ne vesszen el. A sor
 * `localStorage`-ban él, try/catch mögött (ugyanaz az elv, mint a
 * telefonos prototípusban — ha a tárolás tiltva van, a doboz működik
 * tovább, csak nem emlékszik). SZÁNDÉKOSAN nem küldi el automatikusan a
 * várakozó parancsokat, amint visszajön a net: egy "ajánlat_keszites"
 * szándéknál a jóváhagyó lapot valakinek látnia és jóváhagynia kell —
 * ezt nem lehet a felhasználó háta mögött, csendben eldönteni.
 */
function offlineSorOlvasas(): string[] {
  try {
    const nyers = localStorage.getItem(OFFLINE_SOR_KULCS);
    return nyers ? JSON.parse(nyers) : [];
  } catch {
    return [];
  }
}
function offlineSorIras(sor: string[]) {
  try {
    localStorage.setItem(OFFLINE_SOR_KULCS, JSON.stringify(sor));
  } catch {
    // localStorage tiltva vagy tele — a doboz ettől még működik, csak felejt.
  }
}

/** Azok az eredmények, amik után a beviteli mező üríthető: a parancs lefutott. */
function lezartEredmeny(e: AiEredmeny): boolean {
  return (
    e.allapot === "naptar_letrehozva" ||
    e.allapot === "feladat_letrehozva" ||
    e.allapot === "partner_helyzet"
  );
}

export function AiBox() {
  const [szoveg, setSzoveg] = useState("");
  const [eredmeny, setEredmeny] = useState<AiEredmeny | null>(null);
  const [siker, setSiker] = useState<{ id: string; sorszam: string } | null>(null);
  const [folyamatban, kezdVizsgalat] = useTransition();
  const [offline, setOffline] = useState(false);
  const [varakozoSor, setVarakozoSor] = useState<string[]>([]);

  useEffect(() => {
    setOffline(!navigator.onLine);
    setVarakozoSor(offlineSorOlvasas());
    const kapcsolodott = () => setOffline(false);
    const megszakadt = () => setOffline(true);
    window.addEventListener("online", kapcsolodott);
    window.addEventListener("offline", megszakadt);
    return () => {
      window.removeEventListener("online", kapcsolodott);
      window.removeEventListener("offline", megszakadt);
    };
  }, []);

  function ertelmez(bemenet: string) {
    kezdVizsgalat(async () => {
      const valasz = await aiErtelmezes(bemenet);
      setEredmeny(valasz);
      // Lefutott parancs után a mező ürül — különben egy újraküldés
      // (vagy az offline sor "Most elküldöm" gombja) duplán írna.
      if (lezartEredmeny(valasz)) setSzoveg("");
    });
  }

  function kuldes(bemenet: string) {
    if (!bemenet.trim()) return;
    setSiker(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const uj = [...offlineSorOlvasas(), bemenet.trim()];
      offlineSorIras(uj);
      setVarakozoSor(uj);
      setSzoveg("");
      return;
    }

    ertelmez(bemenet);
  }

  function sorbolKuldes(index: number) {
    const bemenet = varakozoSor[index];
    if (!bemenet) return;
    const maradek = varakozoSor.filter((_, i) => i !== index);
    offlineSorIras(maradek);
    setVarakozoSor(maradek);
    setSiker(null);
    ertelmez(bemenet);
  }

  function sorbolTorles(index: number) {
    const maradek = varakozoSor.filter((_, i) => i !== index);
    offlineSorIras(maradek);
    setVarakozoSor(maradek);
  }

  return (
    <div className="flex flex-col gap-3">
      {offline && (
        <p className="text-sm bg-figyelem-soft text-figyelem rounded-lg px-3 py-2">
          Nincs net — a beírt parancs sorba kerül, és itt vár, amíg vissza
          nem kapcsolódsz és el nem küldöd.
        </p>
      )}

      {!!varakozoSor.length && (
        <div className="flex flex-col gap-2 border border-line rounded-lg p-3">
          <span className="text-xs font-mono uppercase tracking-wider text-muted">
            Várakozó parancsok ({varakozoSor.length})
          </span>
          {varakozoSor.map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="flex-1 min-w-0 truncate">{v}</span>
              <button
                type="button"
                disabled={folyamatban || offline}
                onClick={() => sorbolKuldes(i)}
                className={gombMasodlagos}
              >
                Most elküldöm
              </button>
              <button
                type="button"
                onClick={() => sorbolTorles(i)}
                aria-label="Törlöm a sorból"
                className="text-kritikus text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PELDAK.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setSzoveg(p);
              kuldes(p);
            }}
            className="text-xs px-3 py-2 rounded-full border border-line hover:border-cta text-muted whitespace-nowrap"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          kuldes(szoveg);
        }}
        className="flex gap-2"
      >
        <input
          value={szoveg}
          onChange={(e) => setSzoveg(e.target.value)}
          placeholder="Mit szeretnél elintézni?"
          className="flex-1"
        />
        <button type="submit" disabled={folyamatban} className={gombElsodleges}>
          {folyamatban ? "…" : offline ? "Sorba teszem" : "Küldés"}
        </button>
      </form>

      {eredmeny?.allapot === "ismeretlen" && (
        <p className="text-sm text-muted">
          Ezt helyben nem ismerem fel — egy modell tudná értelmezni, de ide
          most még nincs bekötve. Amit értek: „Készíts ajánlatot [partnernek]
          [X] m²-re [munkacsomag]”, „[Holnap/Hétfő/…] [X]-kor megyek
          [partnerhez]”, „Hogy állunk [partnerrel]?”, „Írd fel, hogy …”.
        </p>
      )}

      {eredmeny?.allapot === "hiba" && (
        <p className="text-sm text-kritikus">{eredmeny.uzenet}</p>
      )}

      {siker && (
        <p className="text-sm text-rendben">
          Létrejött: {siker.sorszam} —{" "}
          <Link href={`/ajanlatok/${siker.id}`} className="underline">
            megnyitom
          </Link>
        </p>
      )}

      {eredmeny?.allapot === "naptar_letrehozva" && (
        <p className="text-sm text-rendben">
          Naptárba felvéve: „{eredmeny.cim}” — {eredmeny.kezdetSzoveg}.{" "}
          <Link href={`/naptar/${eredmeny.esemenyId}`} className="underline">
            szerkesztem
          </Link>
        </p>
      )}

      {eredmeny?.allapot === "feladat_letrehozva" && (
        <p className="text-sm text-rendben">
          Teendő felvéve: „{eredmeny.cim}”
          {eredmeny.hataridoSzoveg && ` — ${eredmeny.hataridoSzoveg}`}
          {eredmeny.partnerNev ? ` (${eredmeny.partnerNev})` : " (partner nélkül)"}.{" "}
          <Link href="/feladatok" className="underline">
            megnézem
          </Link>
        </p>
      )}

      {eredmeny?.allapot === "partner_helyzet" && (
        <div className="text-sm border border-line rounded-lg p-3 flex flex-col gap-1">
          <div className="font-semibold">{eredmeny.partnerNev}</div>
          <div>
            Függő ajánlat: {eredmeny.fuggoAjanlat}
            {eredmeny.utolsoAjanlat && (
              <>
                {" "}· utolsó:{" "}
                <Link href={`/ajanlatok/${eredmeny.utolsoAjanlat.id}`} className="underline">
                  {eredmeny.utolsoAjanlat.sorszam}
                </Link>{" "}
                ({Ft(eredmeny.utolsoAjanlat.brutto)},{" "}
                {AJANLAT_CIMKE[eredmeny.utolsoAjanlat.allapot] ?? eredmeny.utolsoAjanlat.allapot})
              </>
            )}
          </div>
          <div>Nyitott munka: {eredmeny.nyitottMunka}</div>
          <div>
            Kintlévőség:{" "}
            {eredmeny.nyitottSzamlaDarab
              ? `${Ft(eredmeny.nyitottSzamlaOsszeg)} (${eredmeny.nyitottSzamlaDarab} nyitott számla${
                  eredmeny.lejartSzamlaOsszeg > 0 ? `, ebből lejárt ${Ft(eredmeny.lejartSzamlaOsszeg)}` : ""
                })`
              : "nincs nyitott számla"}
          </div>
          <Link href={`/partnerek/${eredmeny.partnerId}`} className="underline text-cta font-semibold self-start">
            Partner lapja →
          </Link>
        </div>
      )}

      {eredmeny?.allapot === "javaslat" && (
        <JovahagyoLap
          eredmeny={eredmeny}
          onBezar={() => setEredmeny(null)}
          onJovahagyva={(uj) => {
            setSiker(uj);
            setEredmeny(null);
            setSzoveg("");
          }}
        />
      )}
    </div>
  );
}
