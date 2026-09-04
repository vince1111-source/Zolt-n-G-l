import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Briefcase, Wallet } from "lucide-react";
import { szerverKliens } from "@/lib/supabase/server";
import { Ft } from "@/lib/format";
import { kintlevosegOsszesites } from "@/lib/mag";
import { budapestMaDatum } from "@/lib/het";
import { megjelenoAllapot } from "@/lib/ajanlat-allapot";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { gombMasodlagos } from "@/components/ui/classes";
import { PartnerForm } from "../PartnerForm";
import { partnerFrissitese } from "../actions";
import { szamlaFizetve } from "../../ajanlatok/actions";
import type { Enums } from "@/lib/supabase/types";

const AJANLAT_CIMKE: Record<Enums<"ajanlat_allapot">, string> = {
  piszkozat: "piszkozat",
  kikuldve: "kiküldve",
  elfogadva: "elfogadva",
  elutasitva: "elutasítva",
  lejart: "lejárt",
};
const AJANLAT_SZIN: Record<Enums<"ajanlat_allapot">, "muted" | "figyelem" | "rendben" | "kritikus"> = {
  piszkozat: "muted",
  kikuldve: "figyelem",
  elfogadva: "rendben",
  elutasitva: "kritikus",
  lejart: "kritikus",
};
const MUNKA_CIMKE: Record<Enums<"munka_allapot">, string> = {
  elokeszites: "előkészítés",
  folyamatban: "folyamatban",
  befejezve: "befejezve",
};
const MUNKA_SZIN: Record<Enums<"munka_allapot">, "muted" | "figyelem" | "rendben"> = {
  elokeszites: "muted",
  folyamatban: "figyelem",
  befejezve: "rendben",
};

const datum = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("hu-HU") : "");

/**
 * Partner-lap: adatok + a teljes történet egy helyen — a vízió-dokumentum
 * "Ügyfelek" szakasza és a prototípus "Hogy állunk Kovácssal?" parancsa
 * (az AI-doboz ide irányít). A kintlévőség ugyanabból a `mag/`-ból jön,
 * amit a "Ma" képernyő is használ.
 */
export default async function PartnerLap({ params }: PageProps<"/partnerek/[id]">) {
  const { id } = await params;
  const supabase = await szerverKliens();
  const ma = budapestMaDatum();

  const [{ data: partner }, { data: ajanlatok }, { data: munkak }, { data: szamlak }] = await Promise.all([
    supabase.from("partnerek").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("ajanlatok")
      .select("id, sorszam, kelt, brutto, allapot, ervenyes_ig")
      .eq("partner_id", id)
      .order("kelt", { ascending: false }),
    supabase
      .from("munkak")
      .select("id, cim, allapot, hatarido")
      .eq("partner_id", id)
      .order("letrehozva", { ascending: false }),
    supabase
      .from("szamlak")
      .select("id, sorszam, brutto, fizetesi_hatarido, allapot, forras, ajanlat_id")
      .eq("partner_id", id)
      .eq("irany", "kimeno")
      .order("kelt", { ascending: false }),
  ]);

  if (!partner) notFound();

  const kintlevoseg = kintlevosegOsszesites(
    (szamlak ?? []).map((sz) => ({
      partner: partner.nev,
      brutto: sz.brutto ?? 0,
      hatarido: sz.fizetesi_hatarido ?? ma,
      allapot: sz.allapot,
    })),
    ma,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{partner.nev}</h1>
          <p className="text-muted mt-1">
            {partner.kapcsolattarto}
            {partner.telefon && ` · ${partner.telefon}`}
            {partner.szallito && " · szállító"}
          </p>
        </div>
        <Link href={`/ajanlatok/uj`} className={gombMasodlagos}>
          + Új ajánlat
        </Link>
      </div>

      <Card className="p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Wallet size={18} className="text-cta" aria-hidden />
          Kintlévőség
        </h2>
        {kintlevoseg.nyitottDarab === 0 ? (
          <p className="text-sm text-muted">Nincs nyitott számla ennél a partnernél.</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-extrabold tabular-nums">{Ft(kintlevoseg.nyitottOsszesen)}</div>
              <div className="text-sm text-muted">{kintlevoseg.nyitottDarab} nyitott számla</div>
            </div>
            {kintlevoseg.lejartDarab > 0 && (
              <Badge szin="kritikus">{Ft(kintlevoseg.lejartOsszesen)} lejárt</Badge>
            )}
          </div>
        )}
        {!!szamlak?.length && (
          <div className="mt-4 pt-4 border-t border-line flex flex-col gap-2">
            {szamlak.map((sz) => (
              <div key={sz.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{sz.sorszam}</span>
                  {sz.forras === "szimulalt" && (
                    <span className="ml-2 text-xs font-mono uppercase tracking-wider text-figyelem">szimulált</span>
                  )}
                  <div className="text-muted">
                    határidő: {datum(sz.fizetesi_hatarido)}
                    {sz.ajanlat_id && (
                      <>
                        {" · "}
                        <Link href={`/ajanlatok/${sz.ajanlat_id}`} className="underline">
                          ajánlat
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-semibold tabular-nums">{Ft(sz.brutto)}</span>
                  {sz.allapot === "fizetve" ? (
                    <Badge szin="rendben">fizetve</Badge>
                  ) : sz.allapot === "sztornozott" ? (
                    <Badge szin="muted">sztornózott</Badge>
                  ) : (
                    <form action={szamlaFizetve.bind(null, sz.id)}>
                      <button type="submit" className={gombMasodlagos}>
                        Fizetve
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <FileText size={18} className="text-cta" aria-hidden />
          Ajánlatok
        </h2>
        {!ajanlatok?.length ? (
          <p className="text-sm text-muted">Még nincs ajánlat ennek a partnernek.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ajanlatok.map((a) => {
              const allapot = megjelenoAllapot(a, ma);
              return (
                <Link key={a.id} href={`/ajanlatok/${a.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-cta">
                  <span>
                    {a.sorszam} · {datum(a.kelt)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">{Ft(a.brutto)}</span>
                    <Badge szin={AJANLAT_SZIN[allapot]}>{AJANLAT_CIMKE[allapot]}</Badge>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Briefcase size={18} className="text-cta" aria-hidden />
          Munkák
        </h2>
        {!munkak?.length ? (
          <p className="text-sm text-muted">Még nincs munka ennél a partnernél.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {munkak.map((m) => (
              <Link key={m.id} href={`/munkak/${m.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-cta">
                <span className="min-w-0 truncate">
                  {m.cim ?? "Nincs megadva a helyszín"}
                  {m.hatarido && ` · határidő: ${datum(m.hatarido)}`}
                </span>
                <Badge szin={MUNKA_SZIN[m.allapot]}>{MUNKA_CIMKE[m.allapot]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-bold mb-3">Adatok</h2>
        <PartnerForm partner={partner} action={partnerFrissitese.bind(null, id)} mentesCimke="Mentem" />
      </Card>
    </div>
  );
}
