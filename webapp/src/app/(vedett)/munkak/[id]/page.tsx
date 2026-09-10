import { notFound } from "next/navigation";
import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { gombMasodlagos } from "@/components/ui/classes";
import { MegerositoGomb } from "@/components/ui/MegerositoGomb";
import { MunkaForm } from "../MunkaForm";
import { munkaAllapotValtas, munkaFrissitese } from "../actions";
import { esemenyTorlese, esemenyLetrehozasa } from "../../naptar/actions";
import { NaptarEsemenyForm } from "@/components/NaptarEsemenyForm";
import { MunkaFotok } from "@/components/MunkaFotok";
import { MasoloGomb } from "@/components/MasoloGomb";
import { budapestMaDatum } from "@/lib/het";
import { Ft, mennyisegEgyseggel, mertekegysegSzoveg } from "@/lib/format";
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

  // Anyaglista — a vízió-dokumentum "Wow #7" hiányzó harmada ("projekt +
  // naptár + ANYAGLISTA automatikusan"). A forrás-ajánlat "anyag"
  // kategóriájú tételei, a mennyiséggel, és ha van hozzá nagyker-tétel, a
  // beszállító beszerzési árával. SZÁNDÉKOSAN a vállalkozó saját
  // árlista-kategóriáiból épül, nem egy beégetett anyagnormából (a
  // `mag/anyagszukseglet.mjs` térkövezés-specifikus terméknevei nem
  // egyeznének az ő árlistájával) — ami nincs "anyag"-ként felvéve, az
  // itt sem jelenik meg, és ezt a felület ki is mondja.
  type AnyagSor = { megnevezes: string; mennyiseg: number; mertekegyseg: string; beszerzesiAr: number | null; szallito: string | null };
  let anyaglista: AnyagSor[] = [];
  if (munka.ajanlat_id) {
    const { data: tetelek } = await supabase
      .from("ajanlat_tetelek")
      .select("megnevezes, mennyiseg, mertekegyseg, termek_id, termekek(kategoria)")
      .eq("ajanlat_id", munka.ajanlat_id)
      .order("sorrend");
    const anyagok = (tetelek ?? []).filter((t) => t.termekek?.kategoria === "anyag");
    const termekIdk = anyagok.map((t) => t.termek_id).filter((x): x is string => !!x);
    const { data: nagyker } = termekIdk.length
      ? await supabase
          .from("nagyker_tetelek")
          .select("termek_id, beszerzesi_ar, partnerek(nev)")
          .in("termek_id", termekIdk)
          .eq("aktiv", true)
      : { data: [] as { termek_id: string | null; beszerzesi_ar: number; partnerek: { nev: string } | null }[] };
    anyaglista = anyagok.map((t) => {
      const nk = (nagyker ?? []).find((n) => n.termek_id === t.termek_id);
      return {
        megnevezes: t.megnevezes,
        mennyiseg: t.mennyiseg,
        mertekegyseg: t.mertekegyseg,
        beszerzesiAr: nk?.beszerzesi_ar ?? null,
        szallito: nk?.partnerek?.nev ?? null,
      };
    });
  }
  const anyaglistaSzoveg = anyaglista
    .map((a) => `${a.megnevezes}: ${mennyisegEgyseggel(a.mennyiseg, a.mertekegyseg)}${a.szallito ? ` (${a.szallito})` : ""}`)
    .join("\n");
  const beszerzesOsszesen = anyaglista.reduce((s, a) => s + (a.beszerzesiAr != null ? a.beszerzesiAr * a.mennyiseg : 0), 0);
  const arNelkul = anyaglista.filter((a) => a.beszerzesiAr == null).length;

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

      {munka.ajanlat_id && (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-bold">Anyaglista</h2>
            {anyaglista.length > 0 && <MasoloGomb szoveg={anyaglistaSzoveg} cimke="Lista másolása" />}
          </div>
          {!anyaglista.length ? (
            <p className="text-sm text-muted">
              Az ajánlat tételei között nincs „anyag” kategóriájú — az anyaglista az árlista
              kategóriáiból épül, a tétel kategóriáját az Árlistán állíthatod.
            </p>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {anyaglista.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <div className="min-w-0">
                    <div className="font-medium">{a.megnevezes}</div>
                    <div className="text-muted">
                      {a.szallito ? `${a.szallito} · ${Ft(a.beszerzesiAr ?? 0)}/${mertekegysegSzoveg(a.mertekegyseg)}` : "nincs nagyker-ár"}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-semibold tabular-nums">
                      {mennyisegEgyseggel(a.mennyiseg, a.mertekegyseg)}
                    </div>
                    {a.beszerzesiAr != null && (
                      <div className="text-muted tabular-nums">{Ft(a.beszerzesiAr * a.mennyiseg)}</div>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-1">
                <span>
                  Beszerzés becsülve
                  {arNelkul > 0 && (
                    <span className="text-muted font-normal"> ({arNelkul} tételre nincs nagyker-ár)</span>
                  )}
                </span>
                <span className="tabular-nums">{Ft(beszerzesOsszesen)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

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
                  <MegerositoGomb kerdes={`Biztosan törlöd: „${e.cim}”?`} className="text-kritikus text-sm">
                    Törlöm
                  </MegerositoGomb>
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
