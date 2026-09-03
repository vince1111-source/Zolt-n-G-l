import Link from "next/link";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { szerverKliens } from "@/lib/supabase/server";
import { CegprofilForm } from "./CegprofilForm";
import { CegprofilLogo } from "@/components/CegprofilLogo";
import { NaptarSzinkron } from "@/components/NaptarSzinkron";
import { Card } from "@/components/ui/Card";
import { gombMasodlagos } from "@/components/ui/classes";

export default async function Cegprofil() {
  const { ceg, felhasznalo } = await sajatCegVagyIranyitas();
  if (!ceg) return null;

  const supabase = await szerverKliens();
  const { data: naptarFeed } = await supabase
    .from("naptar_feed")
    .select("token")
    .eq("ceg_id", ceg.id)
    .maybeSingle();
  const feedUrl = naptarFeed
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/naptar-feed/${naptarFeed.token}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Cégadatok</h1>
        <p className="text-muted mt-1">
          Ezek jelennek meg az ajánlatok fejlécében és a kiküldött
          dokumentumokon.
        </p>
      </div>
      <div className="bg-surface border border-line rounded-xl p-6">
        <CegprofilForm ceg={ceg} />
      </div>

      <Card className="p-6">
        <h2 className="font-bold mb-3">Logó</h2>
        <CegprofilLogo logoUrl={ceg.logo_url} />
      </Card>

      {feedUrl && (
        <Card className="p-6">
          <h2 className="font-bold mb-1">Naptár-szinkron</h2>
          <NaptarSzinkron feedUrl={feedUrl} tulajdonos={felhasznalo.szerep === "tulajdonos"} />
        </Card>
      )}

      {felhasznalo.szerep === "tulajdonos" && (
        <Card className="p-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Könyvelők</h2>
            <p className="text-sm text-muted">Kik érik el a dokumentumtáradat.</p>
          </div>
          <Link href="/cegprofil/konyvelok" className={gombMasodlagos}>
            Kezelem
          </Link>
        </Card>
      )}
    </div>
  );
}
