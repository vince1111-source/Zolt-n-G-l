import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { kintlevosegOsszesites, napokEltelte } from "@/lib/mag";
import { ajanlatLejartE } from "@/lib/ajanlat-allapot";
import { Ft } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AiBox } from "@/components/AiBox";
import { NapiOsszefoglalo } from "@/components/NapiOsszefoglalo";
import { aiBekotve } from "@/lib/ai/openai";
import { KovetesLista, type Varakozo } from "@/components/KovetesLista";
import { ListTodo, Wallet, Clock, TrendingUp, Sparkles } from "lucide-react";

const UTANKOVETES_KUSZOB_NAP = 3;

export default async function Ma() {
  const { felhasznalo } = await sajatCegVagyIranyitas();
  const supabase = await szerverKliens();
  const ma = new Date().toISOString().slice(0, 10);

  const [
    { data: fuggoAjanlatok },
    { data: teendok, count: teendokSzama },
    { count: nyitottMunkakSzama },
    { data: nyitottSzamlak },
    { data: kikuldveAjanlatok },
    { data: kikuldesek },
    { data: fuggoArfrissitesek },
  ] = await Promise.all([
    // Sorok kellenek, nem csak darabszám: a lejárt (kiküldve, de az
    // érvényesség letelt) ajánlat származtatott állapot, nem tárolt — azt
    // nem számoljuk "függőnek" (lib/ajanlat-allapot.ts).
    supabase
      .from("ajanlatok")
      .select("allapot, ervenyes_ig")
      .in("allapot", ["piszkozat", "kikuldve"]),
    supabase
      .from("feladatok")
      .select("cim, hatarido, surgos", { count: "exact" })
      .eq("allapot", "nyitott")
      .order("surgos", { ascending: false })
      .order("hatarido", { ascending: true, nullsFirst: false })
      .limit(3),
    supabase
      .from("munkak")
      .select("*", { count: "exact", head: true })
      .neq("allapot", "befejezve"),
    supabase
      .from("szamlak")
      .select("brutto, fizetesi_hatarido, allapot, partnerek(nev)")
      .eq("irany", "kimeno"),
    supabase
      .from("ajanlatok")
      .select("id, sorszam, brutto, partnerek(nev)")
      .eq("allapot", "kikuldve"),
    // A tényleges kiküldés időpontja a jóváhagyási kapu naplójából jön —
    // nem az ajánlat létrehozásának dátumából —, mert az ajánlat gyakran
    // piszkozatként áll egy ideig, mielőtt tényleg kimegy.
    supabase
      .from("javasolt_muveletek")
      .select("hivatkozott_id, vegrehajtva")
      .eq("tipus", "ajanlat_kikuldes")
      .eq("hivatkozott_tabla", "ajanlatok")
      .eq("allapot", "vegrehajtott"),
    supabase
      .from("javasolt_muveletek")
      .select("id, javaslat")
      .eq("tipus", "arfrissites")
      .eq("allapot", "javasolt"),
  ]);

  const fuggoAjanlatokSzama = (fuggoAjanlatok ?? []).filter((a) => !ajanlatLejartE(a, ma)).length;

  // A kintlévőség-számítás a mag/kintlevoseg.mjs-ből jön — ugyanaz a
  // determinisztikus logika, amit a `node --test mag/*.teszt.mjs` is
  // ellenőriz. A `szamlak` egyetlen írója ma az elfogadott ajánlatból
  // induló, jóváhagyási kapun átmenő "Számla kiállítása" (lásd
  // ajanlatok/actions.ts `szamlaKiallitasa`) — amíg egyetlen ilyen sem
  // fut le, ez a doboz valós, de üres/0 Ft-os állapotot mutat, ami helyes,
  // nem hiba.
  const kintlevoseg = kintlevosegOsszesites(
    (nyitottSzamlak ?? []).map((sz) => ({
      partner: sz.partnerek?.nev ?? "Ismeretlen",
      brutto: sz.brutto ?? 0,
      hatarido: sz.fizetesi_hatarido ?? ma,
      allapot: sz.allapot,
    })),
    ma,
  );

  // "Wow #6": ami régen kiment, és nincs rá válasz, azt utánkövetésre
  // ajánljuk fel — a napok számítása ugyanabból a `mag/`-ból jön, amit a
  // fizetési határidőnél is használunk.
  const kikuldesIdopontok = new Map(
    (kikuldesek ?? [])
      .filter((k) => k.vegrehajtva)
      .map((k) => [k.hivatkozott_id, k.vegrehajtva as string]),
  );
  const varakozok: Varakozo[] = (kikuldveAjanlatok ?? [])
    .map((a) => {
      const kikuldve = kikuldesIdopontok.get(a.id);
      if (!kikuldve) return null;
      const napok = napokEltelte(kikuldve.slice(0, 10), ma);
      return {
        id: a.id,
        sorszam: a.sorszam,
        partnerNev: a.partnerek?.nev ?? "Ismeretlen",
        brutto: a.brutto,
        napok,
      };
    })
    .filter((v): v is Varakozo => v !== null && v.napok >= UTANKOVETES_KUSZOB_NAP)
    .sort((a, b) => b.napok - a.napok);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Jó napot, {felhasznalo.nev}!
        </h1>
        <div className="mt-2">
          <NapiOsszefoglalo />
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2"><ListTodo size={18} className="text-cta" aria-hidden />Ma</h2>
        <div className="flex flex-col gap-3">
          <Link href="/munkak" className="flex items-center justify-between gap-3 hover:text-cta">
            <span>Nyitott munka</span>
            <span className="font-bold text-lg tabular-nums">{nyitottMunkakSzama ?? 0}</span>
          </Link>
          <Link href="/ajanlatok" className="flex items-center justify-between gap-3 hover:text-cta">
            <span>Függő ajánlat</span>
            <span className="font-bold text-lg tabular-nums">{fuggoAjanlatokSzama ?? 0}</span>
          </Link>
          <Link href="/feladatok" className="flex items-center justify-between gap-3 hover:text-cta">
            <span>Nyitott teendő</span>
            <span className="font-bold text-lg tabular-nums">{teendokSzama ?? 0}</span>
          </Link>
        </div>
        {!!teendok?.length && (
          <div className="mt-4 pt-4 border-t border-line flex flex-col gap-2">
            {teendok.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{t.cim}</span>
                  {t.surgos && <Badge szin="kritikus">sürgős</Badge>}
                </span>
                {t.hatarido && (
                  <span className="text-muted whitespace-nowrap">
                    {new Date(t.hatarido).toLocaleDateString("hu-HU")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2"><Wallet size={18} className="text-cta" aria-hidden />Kintlévőség</h2>
        {kintlevoseg.nyitottDarab === 0 ? (
          <p className="text-sm text-muted">
            Nincs nyitott számlád — egy elfogadott ajánlatnál a „Számla
            kiállítása” gombbal jön létre az első.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-extrabold tabular-nums">
                {Ft(kintlevoseg.nyitottOsszesen)}
              </div>
              <div className="text-sm text-muted">{kintlevoseg.nyitottDarab} nyitott számla</div>
            </div>
            {kintlevoseg.lejartDarab > 0 && (
              <Badge szin="kritikus">{Ft(kintlevoseg.lejartOsszesen)} lejárt</Badge>
            )}
          </div>
        )}
      </Card>

      {!!fuggoArfrissitesek?.length && (
        <Card className="p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-cta" aria-hidden />Árfrissítés vár jóváhagyásra</h2>
          <div className="flex flex-col gap-2">
            {fuggoArfrissitesek.map((j) => (
              <Link
                key={j.id}
                href={`/nagyker/arfrissitesek/${j.id}`}
                className="flex items-center justify-between gap-3 text-sm hover:text-cta"
              >
                <span>{(j.javaslat as { szallito: string | null }).szallito ?? "Beszállító"}</span>
                <span className="underline">Megnézem</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {!!varakozok.length && (
        <Card className="p-5">
          <h2 className="font-bold mb-1 flex items-center gap-2"><Clock size={18} className="text-cta" aria-hidden />Régóta várakozó ajánlatok</h2>
          <p className="text-sm text-muted mb-3">
            {UTANKOVETES_KUSZOB_NAP}+ napja kiküldve, még nincs válasz.
          </p>
          <KovetesLista varakozok={varakozok} />
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2"><Sparkles size={18} className="text-cta" aria-hidden />Mit szeretnél elintézni?</h2>
        <AiBox hangFelho={aiBekotve()} />
      </Card>
    </div>
  );
}
