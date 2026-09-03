import { notFound } from "next/navigation";
import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { gombMasodlagos } from "@/components/ui/classes";
import { MunkaForm } from "../MunkaForm";
import { munkaAllapotValtas, munkaFrissitese } from "../actions";
import { esemenyTorlese, esemenyLetrehozasa } from "../../naptar/actions";
import { NaptarEsemenyForm } from "@/components/NaptarEsemenyForm";
import { MunkaFotok } from "@/components/MunkaFotok";
import { budapestMaDatum } from "@/lib/het";
import type { Enums } from "@/lib/supabase/types";

const ALLAPOT_CIMKE: Record<Enums<"munka_allapot">, string> = {
  elokeszites: "előkészítés",
  folyamatban: "folyamatban",
  befejezve: "befejezve",
};

const ALLAPOT_SZIN: Record<Enums<"munka_allapot">, "muted" | "figyelem" | "rendben"> = {
  elokeszites: "muted",
  folyamatban: "figyelem",
  befejezve: "rendben",
};

const SORREND: Enums<"munka_allapot">[] = ["elokeszites", "folyamatban", "befejezve"];

export default async function MunkaReszletei({
  params,
}: PageProps<"/munkak/[id]">) {
  const { id } = await params;
  const supabase = await szerverKliens();

  const [{ data: munka }, { data: partnerek }, { data: esemenyek }, { data: fotoSorok }] =
    await Promise.all([
      supabase
        .from("munkak")
        .select("*, partnerek(nev), ajanlatok(sorszam)")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("partnerek").select("*").eq("archivalt", false).order("nev"),
      supabase
        .from("naptar_esemenyek")
        .select("*")
        .eq("munka_id", id)
        .order("kezdet"),
      supabase
        .from("munka_fotok")
        .select("id, storage_utvonal")
        .eq("munka_id", id)
        .order("feltoltve", { ascending: false }),
    ]);

  if (!munka) notFound();

  // A `munka-fotok` bucket privát (lásd db/migraciok/0015_munka_fotok.sql),
  // ezért a megjelenítéshez mindig aláírt, rövid élettartamú URL kell —
  // sosem publikus link, mint a cég logójánál.
  let fotok: { id: string; storageUtvonal: string; url: string | null }[] = [];
  if (fotoSorok?.length) {
    const { data: alairtak } = await supabase.storage
      .from("munka-fotok")
      .createSignedUrls(
        fotoSorok.map((f) => f.storage_utvonal),
        600,
      );
    fotok = fotoSorok.map((f, i) => ({
      id: f.id,
      storageUtvonal: f.storage_utvonal,
      url: alairtak?.[i]?.signedUrl ?? null,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {munka.partnerek?.nev ?? "Munka"}
          </h1>
          {munka.ajanlatok?.sorszam && (
            <Link
              href={`/ajanlatok/${munka.ajanlat_id}`}
              className="text-sm text-muted underline"
            >
              a {munka.ajanlatok.sorszam} ajánlatból
            </Link>
          )}
        </div>
        <Badge szin={ALLAPOT_SZIN[munka.allapot]}>{ALLAPOT_CIMKE[munka.allapot]}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {SORREND.filter((a) => a !== munka.allapot).map((a) => (
          <form key={a} action={munkaAllapotValtas.bind(null, id, a)}>
            <button type="submit" className={gombMasodlagos}>
              {ALLAPOT_CIMKE[a]}
            </button>
          </form>
        ))}
      </div>

      <Card className="p-6">
        <MunkaForm
          munka={munka}
          partnerek={partnerek ?? []}
          action={munkaFrissitese.bind(null, id)}
          mentesCimke="Mentem"
        />
      </Card>

      <Card className="p-6">
        <h2 className="font-bold mb-3">Fotódokumentáció</h2>
        <MunkaFotok munkaId={id} fotok={fotok} />
      </Card>

      <Card className="p-6">
        <h2 className="font-bold mb-3">Naptár</h2>
        {!!esemenyek?.length && (
          <div className="flex flex-col gap-2 mb-4">
            {esemenyek.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 text-sm border-b border-line pb-2">
                <Link href={`/naptar/${e.id}`} className="hover:underline">
                  <div className="font-medium">{e.cim}</div>
                  <div className="text-muted">
                    {new Date(e.kezdet).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}
                  </div>
                </Link>
                <form action={esemenyTorlese.bind(null, e.id)}>
                  <button type="submit" className="text-kritikus text-sm">
                    Törlöm
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <NaptarEsemenyForm
          alapCim={munka.partnerek?.nev ? `Munka — ${munka.partnerek.nev}` : "Munka"}
          alapDatum={budapestMaDatum()}
          munkaId={id}
          action={esemenyLetrehozasa}
        />
      </Card>
    </div>
  );
}
