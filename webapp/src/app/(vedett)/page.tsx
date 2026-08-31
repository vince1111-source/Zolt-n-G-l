import Link from "next/link";
import { szerverKliens } from "@/lib/supabase/server";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";

export default async function Attekintes() {
  const { felhasznalo } = await sajatCegVagyIranyitas();
  const supabase = await szerverKliens();

  const [
    { count: partnerekSzama },
    { count: termekekSzama },
    { count: feladatokSzama },
    { count: fuggoAjanlatokSzama },
  ] = await Promise.all([
    supabase
      .from("partnerek")
      .select("*", { count: "exact", head: true })
      .eq("archivalt", false),
    supabase
      .from("termekek")
      .select("*", { count: "exact", head: true })
      .eq("aktiv", true),
    supabase
      .from("feladatok")
      .select("*", { count: "exact", head: true })
      .eq("allapot", "nyitott"),
    supabase
      .from("ajanlatok")
      .select("*", { count: "exact", head: true })
      .in("allapot", ["piszkozat", "kikuldve"]),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Jó napot, {felhasznalo.nev}!
        </h1>
        <p className="text-muted mt-1">
          Ez a valódi, szerveroldali adatbázisod — amit itt rögzítesz, az
          megmarad, és csak a te céged látja.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Link
          href="/ajanlatok"
          className="bg-surface border border-line rounded-xl p-5 hover:border-cta transition-colors"
        >
          <div className="text-xs uppercase tracking-wider text-muted font-mono">
            Függő ajánlat
          </div>
          <div className="text-3xl font-extrabold mt-1">{fuggoAjanlatokSzama ?? 0}</div>
        </Link>
        <Link
          href="/partnerek"
          className="bg-surface border border-line rounded-xl p-5 hover:border-cta transition-colors"
        >
          <div className="text-xs uppercase tracking-wider text-muted font-mono">
            Partnerek
          </div>
          <div className="text-3xl font-extrabold mt-1">{partnerekSzama ?? 0}</div>
        </Link>
        <Link
          href="/arlista"
          className="bg-surface border border-line rounded-xl p-5 hover:border-cta transition-colors"
        >
          <div className="text-xs uppercase tracking-wider text-muted font-mono">
            Árlistatétel
          </div>
          <div className="text-3xl font-extrabold mt-1">{termekekSzama ?? 0}</div>
        </Link>
        <div className="bg-surface border border-line rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted font-mono">
            Nyitott teendő
          </div>
          <div className="text-3xl font-extrabold mt-1">{feladatokSzama ?? 0}</div>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-xl p-5">
        <h2 className="font-bold mb-2">Amit ez a váz ma tud</h2>
        <ul className="text-sm text-muted list-disc pl-5 space-y-1">
          <li>Bejelentkezés és regisztráció Supabase Auth-tal, e-mail megerősítéssel</li>
          <li>Ajánlatkészítés a valódi árlistából — az egységárat mindig a szerver adja, sosem a böngésző</li>
          <li>A cégprofil, a partnerek és az árlista valódi adatbázisban, sorszintű izolációval</li>
          <li>Minden lekérdezés a te bejelentkezésed jogán fut — más cég adatát nem éred el</li>
        </ul>
      </div>
    </div>
  );
}
