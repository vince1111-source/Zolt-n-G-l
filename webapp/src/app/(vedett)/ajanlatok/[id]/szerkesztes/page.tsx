import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { AjanlatForm } from "../../AjanlatForm";
import { ajanlatFrissitese } from "../../actions";

export default async function AjanlatSzerkesztes({
  params,
}: PageProps<"/ajanlatok/[id]/szerkesztes">) {
  const { id } = await params;
  const supabase = await szerverKliens();

  const [{ data: ajanlat }, { data: tetelek }, { data: partnerek }, { data: termekek }, { data: csomagok }] =
    await Promise.all([
      supabase.from("ajanlatok").select("id, sorszam, allapot, partner_id").eq("id", id).maybeSingle(),
      supabase
        .from("ajanlat_tetelek")
        .select("termek_id, mennyiseg, munkaido_szorzo")
        .eq("ajanlat_id", id)
        .order("sorrend"),
      supabase.from("partnerek").select("*").eq("archivalt", false).eq("szallito", false).order("nev"),
      supabase.from("termekek").select("*").eq("aktiv", true).order("nev"),
      supabase
        .from("munkacsomagok")
        .select("*, munkacsomag_tetelek(termek_id, mennyiseg_egysegre)")
        .eq("aktiv", true)
        .order("nev"),
    ]);

  if (!ajanlat) notFound();
  // Kiküldött/elfogadott ajánlat nem szerkeszthető (pillanatkép) — a
  // részletező oldalon a "Másolat" gomb a helyes út.
  if (ajanlat.allapot !== "piszkozat") redirect(`/ajanlatok/${id}`);

  const kezdoSorok = (tetelek ?? [])
    .filter((t): t is typeof t & { termek_id: string } => !!t.termek_id)
    .map((t) => ({ termekId: t.termek_id, mennyiseg: t.mennyiseg, szorzo: t.munkaido_szorzo }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Ajánlat szerkesztése</h1>
        <p className="text-muted mt-1">
          {ajanlat.sorszam} · piszkozat ·{" "}
          <Link href={`/ajanlatok/${id}`} className="underline">
            vissza az ajánlathoz
          </Link>
        </p>
      </div>
      <div className="bg-surface border border-line rounded-xl p-6">
        <AjanlatForm
          partnerek={partnerek ?? []}
          termekek={termekek ?? []}
          csomagok={csomagok ?? []}
          kezdoPartnerId={ajanlat.partner_id}
          kezdoSorok={kezdoSorok}
          action={ajanlatFrissitese.bind(null, id)}
          mentesCimke="Mentem"
        />
      </div>
    </div>
  );
}
