import { notFound } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatKonyveloVagyIranyitas } from "@/lib/sajat-konyvelo";
import { kartya } from "@/components/ui/classes";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function KonyveloUgyfelDokumentumai({
  params,
}: PageProps<"/konyvelo/[cegId]">) {
  await sajatKonyveloVagyIranyitas();
  const { cegId } = await params;
  const supabase = await szerverKliens();

  // A `cegek_konyvelo` RLS-policy miatt ez csak akkor ad vissza sort, ha
  // ennek a könyvelőnek ténylegesen van (nem visszavont) hozzáférése —
  // nem az alkalmazáskód dönti el, hanem az adatbázis.
  const { data: ceg } = await supabase.from("cegek").select("nev").eq("id", cegId).maybeSingle();
  if (!ceg) notFound();

  const { data: dokumentumok } = await supabase
    .from("dokumentumok")
    .select("*")
    .eq("ceg_id", cegId)
    .order("feltoltve", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{ceg.nev}</h1>

      <div className={`${kartya} divide-y divide-line`}>
        {!dokumentumok?.length && <EmptyState>Még nincs feltöltött dokumentum.</EmptyState>}
        {dokumentumok?.map((d) => (
          <a
            key={d.id}
            href={d.fajl_url}
            target="_blank"
            rel="noreferrer"
            className="p-4 flex items-center justify-between gap-3 hover:bg-line/10"
          >
            <div>
              <div className="font-medium">{d.eredeti_nev ?? d.tipus}</div>
              <div className="text-sm text-muted">{d.tipus}</div>
            </div>
            <span className="text-sm text-muted whitespace-nowrap">
              {new Date(d.feltoltve).toLocaleDateString("hu-HU")}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
