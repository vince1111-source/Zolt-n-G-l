import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { AjanlatForm } from "../AjanlatForm";

export default async function UjAjanlat() {
  const supabase = await szerverKliens();
  const [{ data: partnerek }, { data: termekek }] = await Promise.all([
    supabase
      .from("partnerek")
      .select("*")
      .eq("archivalt", false)
      .eq("szallito", false)
      .order("nev"),
    supabase.from("termekek").select("*").eq("aktiv", true).order("nev"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Új ajánlat</h1>
      <div className="bg-surface border border-line rounded-xl p-6">
        {!partnerek?.length ? (
          <p className="text-muted text-sm">
            Előbb vegyél fel egy partnert:{" "}
            <Link href="/partnerek/uj" className="text-brand font-semibold underline">
              + Új partner
            </Link>
          </p>
        ) : (
          <AjanlatForm partnerek={partnerek} termekek={termekek ?? []} />
        )}
      </div>
    </div>
  );
}
