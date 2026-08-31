import { notFound } from "next/navigation";
import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { Ft } from "@/lib/format";
import { NyomtatasGomb } from "./NyomtatasGomb";

const datumHu = (iso: string) =>
  new Date(iso).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export default async function AjanlatDokumentum({
  params,
}: PageProps<"/ajanlatok/[id]/dokumentum">) {
  const { id } = await params;
  const { ceg } = await sajatCegVagyIranyitas();
  const supabase = await szerverKliens();

  const { data: ajanlat } = await supabase
    .from("ajanlatok")
    .select("*, partnerek(nev, kapcsolattarto, fizetesi_hatarido_nap)")
    .eq("id", id)
    .maybeSingle();

  if (!ajanlat || !ceg) notFound();

  const { data: tetelek } = await supabase
    .from("ajanlat_tetelek")
    .select("*")
    .eq("ajanlat_id", id)
    .order("sorrend");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 print:hidden">
        <Link
          href={`/ajanlatok/${id}`}
          className="text-sm px-3 py-2 rounded-lg border border-line hover:border-cta"
        >
          ← Vissza
        </Link>
        <div className="flex-1" />
        <NyomtatasGomb />
      </div>

      <div className="nyomtathato-dokumentum bg-white text-[#14161a] border border-line rounded-xl p-8 max-w-2xl mx-auto w-full print:border-none print:rounded-none print:p-0 print:max-w-none">
        <div className="flex justify-between gap-6 border-b-2 border-[#14161a] pb-4">
          <div>
            <div className="font-extrabold text-lg">{ceg.nev}</div>
            <div className="text-xs text-[#5b6270] mt-1 leading-relaxed">
              {ceg.cim}
              {ceg.cim && <br />}
              {ceg.adoszam && <>Adószám: {ceg.adoszam}</>}
              {ceg.adoszam && <br />}
              {ceg.email}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs font-mono uppercase tracking-widest font-semibold">
              Árajánlat
            </div>
            <div className="text-xs text-[#5b6270] mt-1 leading-relaxed">
              {ajanlat.sorszam}
              <br />
              Kelt: {datumHu(ajanlat.kelt)}
              {ajanlat.ervenyes_ig && (
                <>
                  <br />
                  Érvényes: {datumHu(ajanlat.ervenyes_ig)}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="my-4 p-3 bg-[#f4f6f9] rounded-lg">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#5b6270] mb-1">
            Megrendelő
          </div>
          <div className="font-semibold">{ajanlat.partnerek?.nev}</div>
          {ajanlat.partnerek?.kapcsolattarto && (
            <div className="text-sm">{ajanlat.partnerek.kapcsolattarto}</div>
          )}
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-[#5b6270] border-b border-[#d9dde3]">
              <th className="py-2 font-semibold">Megnevezés</th>
              <th className="py-2 font-semibold text-right">Menny.</th>
              <th className="py-2 font-semibold text-right">Egys. ár</th>
              <th className="py-2 font-semibold text-right">Nettó</th>
            </tr>
          </thead>
          <tbody>
            {tetelek?.map((t) => (
              <tr key={t.id} className="border-b border-[#eceef2]">
                <td className="py-2">{t.megnevezes}</td>
                <td className="py-2 text-right tabular-nums whitespace-nowrap">
                  {t.mennyiseg} {t.mertekegyseg}
                </td>
                <td className="py-2 text-right tabular-nums whitespace-nowrap">
                  {Ft(t.egysegar)}
                </td>
                <td className="py-2 text-right tabular-nums whitespace-nowrap">
                  {Ft(t.netto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col gap-1 text-sm">
          {ajanlat.kedvezmeny_szazalek > 0 && (
            <div className="flex justify-between text-[#5b6270]">
              <span>Törzsvevői kedvezmény</span>
              <span>{ajanlat.kedvezmeny_szazalek}%</span>
            </div>
          )}
          <div className="flex justify-between text-[#5b6270]">
            <span>Nettó</span>
            <span className="tabular-nums">{Ft(ajanlat.netto)}</span>
          </div>
          <div className="flex justify-between text-[#5b6270]">
            <span>Áfa</span>
            <span className="tabular-nums">{Ft(ajanlat.afa)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t-2 border-[#14161a] pt-2 mt-1">
            <span>Bruttó összesen</span>
            <span className="tabular-nums">{Ft(ajanlat.brutto)}</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#d9dde3] text-sm text-[#3c424e]">
          <p className="m-0">
            Fizetési határidő: {ajanlat.partnerek?.fizetesi_hatarido_nap ?? 15} nap.
            {ajanlat.ervenyes_ig &&
              ` Az ajánlat ${datumHu(ajanlat.ervenyes_ig)}-ig érvényes.`}
          </p>
        </div>

        <div className="mt-5 pt-3 border-t border-[#d9dde3] text-xs text-[#5b6270] text-center">
          {ceg.nev}
          {ceg.bankszamla && ` · ${ceg.bankszamla}`}
        </div>
      </div>
    </div>
  );
}
