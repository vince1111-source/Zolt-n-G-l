"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bot, Volume2, VolumeX } from "lucide-react";
import {
  aiErtelmezes,
  aiJavaslatJovahagyasa,
  type AiEredmeny,
  type AiForras,
} from "@/app/(vedett)/actions";
import { hangAtirasAction } from "@/app/(vedett)/hang-actions";
import { JovahagyoLap } from "./JovahagyoLap";
import { HangGomb } from "./HangGomb";
import { Badge } from "./ui/Badge";
import { Ft } from "@/lib/format";
import { felolvasasSzoveg } from "@/lib/felolvasas";
import { gombElsodleges, gombMasodlagos } from "./ui/classes";

const PELDAK = [
  "Készíts ajánlatot Kovács Építő Kft.-nek 50 m²-re",
  "Holnap 10-kor megyek Kovácshoz",
  "Mik a mai teendőim?",
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
const FELOLVASAS_KULCS = "cegemai_felolvasas";

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
    e.allapot === "partner_helyzet" ||
    e.allapot === "teendok"
  );
}

/**
 * Felolvasás a böngésző saját hangjával (ingyenes, nincs API). Csak hangból
 * jött parancs után szól, hogy a telefon a zsebben/kézben is válaszoljon.
 */
function felolvas(szoveg: string) {
  if (typeof speechSynthesis === "undefined" || !szoveg) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(szoveg);
    u.lang = "hu-HU";
    const hang = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("hu"));
    if (hang) u.voice = hang;
    speechSynthesis.speak(u);
  } catch {
    // nincs felolvasás — a képernyőn ott a válasz
  }
}

/**
 * AI Act 50. cikk + CLAUDE.md 5. szabály: mindig látszik, KI felelt — a helyi
 * mintaillesztő (0. réteg) vagy egy nyelvi modell (1. réteg, modellnévvel).
 */
function ForrasJelzes({ forras }: { forras: AiForras }) {
  return (
    <span className="text-xs font-mono uppercase tracking-wider text-muted">
      {forras.reteg === 0 ? "0. réteg · helyi mintaillesztés" : `1. réteg · nyelvi modell: ${forras.modell ?? "?"}`}
    </span>
  );
}

export function AiBox({ hangFelho = false }: { hangFelho?: boolean }) {
  const [szoveg, setSzoveg] = useState("");
  const [eredmeny, setEredmeny] = useState<AiEredmeny | null>(null);
  const [siker, setSiker] = useState<{ id: string; sorszam: string } | null>(null);
  const [folyamatban, kezdVizsgalat] = useTransition();
  const [offline, setOffline] = useState(false);
  const [varakozoSor, setVarakozoSor] = useState<string[]>([]);
  const [felolvasas, setFelolvasas] = useState(true);
  const hangbolJott = useRef(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    setVarakozoSor(offlineSorOlvasas());
    try {
      setFelolvasas(localStorage.getItem(FELOLVASAS_KULCS) !== "ki");
    } catch {
      // marad bekapcsolva
    }
    const kapcsolodott = () => setOffline(false);
    const megszakadt = () => setOffline(true);
    window.addEventListener("online", kapcsolodott);
    window.addEventListener("offline", megszakadt);
    return () => {
      window.removeEventListener("online", kapcsolodott);
      window.removeEventListener("offline", megszakadt);
    };
  }, []);

  function felolvasasValtas() {
    const uj = !felolvasas;
    setFelolvasas(uj);
    try {
      localStorage.setItem(FELOLVASAS_KULCS, uj ? "be" : "ki");
    } catch {
      // nem baj
    }
    if (!uj && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  function ertelmez(bemenet: string) {
    kezdVizsgalat(async () => {
      const valasz = await aiErtelmezes(bemenet);
      setEredmeny(valasz);
      // Lefutott parancs után a mező ürül — különben egy újraküldés
      // (vagy az offline sor "Most elküldöm" gombja) duplán írna.
      if (lezartEredmeny(valasz)) setSzoveg("");
      if (hangbolJott.current && felolvasas) felolvas(felolvasasSzoveg(valasz));
      hangbolJott.current = false;
    });
  }

  function kuldes(bemenet: string, hangbol = false) {
    if (!bemenet.trim()) return;
    setSiker(null);
    hangbolJott.current = hangbol;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const uj = [...offlineSorOlvasas(), bemenet.trim()];
      offlineSorIras(uj);
      setVarakozoSor(uj);
      setSzoveg("");
      hangbolJott.current = false;
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
      <p className="text-xs text-muted flex items-start gap-1.5">
        <Bot size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
        <span>
          AI-asszisztens: a parancsot előbb a helyi felismerő, ha kell, egy nyelvi modell
          értelmezi — minden összeget a saját árlistád számol, és a válasz alatt látod, melyik
          felelt. Ha valami hiányzik, kérdez, nem találgat.
        </span>
      </p>

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

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <HangGomb
          onAtirat={(t) => {
            setSzoveg(t);
            kuldes(t, true);
          }}
          felhoAtiras={hangAtirasAction}
          felhoElerheto={hangFelho}
          disabled={folyamatban || offline}
        />
        <button
          type="button"
          onClick={felolvasasValtas}
          className="text-xs text-muted inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-line"
          aria-pressed={felolvasas}
          title="A hangból jött parancs válaszát a telefon fel is olvassa"
        >
          {felolvasas ? <Volume2 size={14} aria-hidden /> : <VolumeX size={14} aria-hidden />}
          {felolvasas ? "felolvasás be" : "felolvasás ki"}
        </button>
      </div>

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
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted">
            {eredmeny.reteg === 1
              ? "Ezt a modell sem tudta a rendszer műveleteihez kötni — lehet, hogy nem ide tartozik. Amit értek: ajánlat, naptár, teendő, partner-helyzet, mai teendők."
              : "Ezt helyben nem ismerem fel, és nyelvi modell nincs bekötve. Amit értek: „Készíts ajánlatot [partnernek] [X] m²-re [munkacsomag]”, „[Holnap/Hétfő/…] [X]-kor megyek [partnerhez]”, „Mik a mai teendőim?”, „Hogy állunk [partnerrel]?”, „Írd fel, hogy …”."}
          </p>
          <ForrasJelzes forras={eredmeny} />
        </div>
      )}

      {eredmeny?.allapot === "kerdes" && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-figyelem">
            {eredmeny.uzenet} — mondd vagy írd be újra a hiányzó adattal együtt.
          </p>
          <ForrasJelzes forras={eredmeny} />
        </div>
      )}

      {eredmeny?.allapot === "hiba" && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-kritikus">{eredmeny.uzenet}</p>
          <ForrasJelzes forras={eredmeny} />
        </div>
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
        <div className="flex flex-col gap-1">
          <p className="text-sm text-rendben">
            Naptárba felvéve: „{eredmeny.cim}” — {eredmeny.kezdetSzoveg}.{" "}
            <Link href={`/naptar/${eredmeny.esemenyId}`} className="underline">
              szerkesztem
            </Link>
          </p>
          <ForrasJelzes forras={eredmeny} />
        </div>
      )}

      {eredmeny?.allapot === "feladat_letrehozva" && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-rendben">
            Teendő felvéve: „{eredmeny.cim}”
            {eredmeny.hataridoSzoveg && ` — ${eredmeny.hataridoSzoveg}`}
            {eredmeny.partnerNev ? ` (${eredmeny.partnerNev})` : " (partner nélkül)"}.{" "}
            <Link href="/feladatok" className="underline">
              megnézem
            </Link>
          </p>
          <ForrasJelzes forras={eredmeny} />
        </div>
      )}

      {eredmeny?.allapot === "teendok" && (
        <div className="text-sm border border-line rounded-lg p-3 flex flex-col gap-2">
          <p>{eredmeny.felolvasas}</p>
          {!!eredmeny.teendok.length && (
            <ul className="flex flex-col gap-1">
              {eredmeny.teendok.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{t.cim}</span>
                    {t.surgos && <Badge szin="kritikus">sürgős</Badge>}
                    {t.partnerNev && <span className="text-muted text-xs">{t.partnerNev}</span>}
                  </span>
                  {t.hatarido && (
                    <span className="text-muted text-xs whitespace-nowrap">
                      {new Date(t.hatarido).toLocaleDateString("hu-HU")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!!eredmeny.esemenyek.length && (
            <ul className="flex flex-col gap-1 border-t border-line pt-2">
              {eredmeny.esemenyek.map((e) => (
                <li key={e.id}>
                  <Link href={`/naptar/${e.id}`} className="hover:underline">
                    <span className="font-medium tabular-nums">{e.ido}</span> {e.cim}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3">
            <Link href="/feladatok" className="underline text-cta font-semibold text-xs">
              Teendők →
            </Link>
            <Link href="/naptar" className="underline text-cta font-semibold text-xs">
              Naptár →
            </Link>
          </div>
          <ForrasJelzes forras={eredmeny} />
        </div>
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
          <ForrasJelzes forras={eredmeny} />
        </div>
      )}

      {eredmeny?.allapot === "javaslat" && (
        <div className="flex flex-col gap-1">
          <JovahagyoLap
            eredmeny={eredmeny}
            onBezar={() => setEredmeny(null)}
            onJovahagyva={(uj) => {
              setSiker(uj);
              setEredmeny(null);
              setSzoveg("");
            }}
          />
          <ForrasJelzes forras={eredmeny} />
        </div>
      )}
    </div>
  );
}
