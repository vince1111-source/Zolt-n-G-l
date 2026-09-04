import { notFound } from "next/navigation";
import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { Ft } from "@/lib/format";
import { osszesitettMunkaido, percOraSzoveg } from "@/lib/mag";
import { budapestMaDatum } from "@/lib/het";
import { ajanlatLejartE } from "@/lib/ajanlat-allapot";
import { Badge } from "@/components/ui/Badge";
import { gombMasodlagos } from "@/components/ui/classes";
import {
  ajanlatAllapotValtas,
  ajanlatKikuldese,
  ajanlatMasolasa,
  szamlaKiallitasa,
  szamlaFizetve,
} from "../actions";

export default async function AjanlatReszletei({
  params,
}: PageProps<"/ajanlatok/[id]">) {
  const { id } = await params;
  const supabase = await szerverKliens();

  const { data: ajanlat } = await supabase
    .from("ajanlatok")
    .select("*, partnerek(nev, kapcsolattarto, email)")
    .eq("id", id)
    .maybeSingle();

  if (!ajanlat) notFound();

  const { data: tetelek } = await supabase
    .from("ajanlat_tetelek")
    .select("*")
    .eq("ajanlat_id", id)
    .order("sorrend");

  // A jóváhagyási kapu nyoma — ha ezt az ajánlatot már kiküldtük, itt
  // látszik, ki hagyta jóvá és mikor. Ez nem díszlet: a `javasolt_muveletek`
  // sor az egyetlen hely, ami bizonyítja, hogy a kiküldés a kapun ment át.
  const { data: jovahagyasok } = await supabase
    .from("javasolt_muveletek")
    .select("*, felhasznalok(nev)")
    .eq("hivatkozott_tabla", "ajanlatok")
    .eq("hivatkozott_id", id)
    .order("javasolva", { ascending: false });

  const { data: szamla } = await supabase
    .from("szamlak")
    .select("id, sorszam, brutto, kelt, fizetesi_hatarido, forras, allapot")
    .eq("ajanlat_id", id)
    .maybeSingle();

  const lejart = ajanlatLejartE(ajanlat, budapestMaDatum());

  // Csak akkor mutatjuk a becslést, ha legalább egy tételnél ténylegesen
  // meg van adva normaidő — máskülönben ez egy üres, felesleges doboz volna.
  const munkaido = osszesitettMunkaido(
    (tetelek ?? []).map((t) => ({ munkaidoPerc: t.munkaido_perc })),
  );
  const vanNormaido = (tetelek ?? []).some((t) => t.munkaido_perc !== null);

  const visszajelzesGombok: Record<string, ["elfogadva" | "elutasitva", string][]> = {
    kikuldve: [
      ["elfogadva", "Elfogadták"],
      ["elutasitva", "Elutasították"],
    ],
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {ajanlat.partnerek?.nev}
        </h1>
        <p className="text-muted mt-1 flex items-center gap-2 flex-wrap">
          {ajanlat.sorszam} · {new Date(ajanlat.kelt).toLocaleDateString("hu-HU")}
          {lejart && (
            <Badge szin="kritikus">
              lejárt {ajanlat.ervenyes_ig && new Date(ajanlat.ervenyes_ig).toLocaleDateString("hu-HU")}
            </Badge>
          )}
        </p>
      </div>

      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="divide-y divide-line">
          {tetelek?.map((t) => (
            <div key={t.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{t.megnevezes}</div>
                <div className="text-sm text-muted tabular-nums">
                  {t.mennyiseg} {t.mertekegyseg} × {Ft(t.egysegar)}
                  {t.munkaido_perc !== null && ` · becsült idő: ${percOraSzoveg(t.munkaido_perc)}`}
                </div>
              </div>
              <div className="font-semibold tabular-nums">{Ft(t.netto)}</div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-line/10 flex flex-col gap-1 text-sm">
          {ajanlat.kedvezmeny_szazalek > 0 && (
            <div className="flex justify-between text-muted">
              <span>Törzsvevői kedvezmény</span>
              <span>{ajanlat.kedvezmeny_szazalek}%</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>Nettó</span>
            <span className="tabular-nums">{Ft(ajanlat.netto)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Áfa</span>
            <span className="tabular-nums">{Ft(ajanlat.afa)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t border-line mt-1">
            <span>Bruttó összesen</span>
            <span className="tabular-nums">{Ft(ajanlat.brutto)}</span>
          </div>
        </div>
      </div>

      {vanNormaido && (
        <div className="bg-surface border border-line rounded-xl p-4 flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold">Becsült munkaidő összesen</span>
          <span className="tabular-nums">
            {percOraSzoveg(munkaido.osszesPerc)}
            {munkaido.hianyzoTetelSzam > 0 && (
              <span className="text-muted">
                {" "}
                ({munkaido.hianyzoTetelSzam} tételnél nincs megadva normaidő)
              </span>
            )}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {ajanlat.allapot === "piszkozat" && (
          <form action={ajanlatKikuldese.bind(null, id)}>
            <button
              type="submit"
              className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3"
            >
              Kiküldöm
            </button>
          </form>
        )}
        {visszajelzesGombok[ajanlat.allapot]?.map(([cel, cimke]) => (
          <form key={cel} action={ajanlatAllapotValtas.bind(null, id, cel)}>
            <button
              type="submit"
              className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3"
            >
              {cimke}
            </button>
          </form>
        ))}
        {ajanlat.allapot === "elfogadva" && !szamla && (
          <form action={szamlaKiallitasa.bind(null, id)}>
            <button
              type="submit"
              className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3"
            >
              Számla kiállítása
            </button>
          </form>
        )}
        <Link
          href={`/ajanlatok/${id}/dokumentum`}
          className="px-5 py-3 rounded-full border border-line hover:border-cta font-semibold"
        >
          Így látja az ügyfél
        </Link>
        {ajanlat.allapot === "piszkozat" && (
          <Link href={`/ajanlatok/${id}/szerkesztes`} className={gombMasodlagos}>
            Szerkesztés
          </Link>
        )}
        <form action={ajanlatMasolasa.bind(null, id)}>
          <button type="submit" className={gombMasodlagos} title="Új piszkozat ugyanezekkel a tételekkel, a mai árakon">
            Másolat
          </button>
        </form>
      </div>

      {szamla && (
        <div className="bg-surface border border-line rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold flex items-center gap-2">
              {szamla.sorszam}
              {szamla.forras === "szimulalt" && (
                <span className="text-xs font-mono uppercase tracking-wider bg-figyelem-soft text-figyelem rounded-full px-2 py-0.5">
                  szimulált
                </span>
              )}
            </div>
            <div className="text-sm text-muted">
              Kiállítva: {szamla.kelt && new Date(szamla.kelt).toLocaleDateString("hu-HU")}
              {szamla.fizetesi_hatarido &&
                ` · Fizetési határidő: ${new Date(szamla.fizetesi_hatarido).toLocaleDateString("hu-HU")}`}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-bold tabular-nums">{Ft(szamla.brutto)}</div>
            {szamla.allapot === "fizetve" ? (
              <Badge szin="rendben">fizetve</Badge>
            ) : szamla.allapot === "sztornozott" ? (
              <Badge szin="muted">sztornózott</Badge>
            ) : (
              <form action={szamlaFizetve.bind(null, szamla.id)}>
                <button type="submit" className={gombMasodlagos}>
                  Fizetve
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {!!jovahagyasok?.length && (
        <div className="text-sm">
          <div className="text-xs uppercase tracking-wider text-muted font-mono mb-2">
            Jóváhagyási napló
          </div>
          <div className="flex flex-col gap-1">
            {jovahagyasok.map((j) => {
              const muveletCimke =
                j.tipus === "szamla_kiallitas" ? "Számla kiállítva" : "Kiküldve";
              return (
                <div key={j.id} className="text-muted">
                  {j.vegrehajtva
                    ? `${muveletCimke} · ${j.felhasznalok?.nev ?? "?"} hagyta jóvá, ${new Date(j.vegrehajtva).toLocaleString("hu-HU")}`
                    : `${j.allapot} · ${new Date(j.javasolva).toLocaleString("hu-HU")}`}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
