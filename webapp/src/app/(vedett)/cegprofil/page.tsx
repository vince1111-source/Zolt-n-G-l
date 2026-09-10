import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { sajatCegVagyIranyitas } from "@/lib/sajat-ceg";
import { szerverKliens } from "@/lib/supabase/server";
import { CegprofilForm } from "./CegprofilForm";
import { MunkatarsMeghivo } from "./MunkatarsMeghivo";
import { meghivasVisszavonasa } from "./actions";
import { CegprofilLogo } from "@/components/CegprofilLogo";
import { NaptarSzinkron } from "@/components/NaptarSzinkron";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { gombMasodlagos } from "@/components/ui/classes";
import { MegerositoGomb } from "@/components/ui/MegerositoGomb";

const SZEREP_CIMKE = { tulajdonos: "tulajdonos", munkatars: "munkatárs", konyvelo: "könyvelő" } as const;

export default async function Cegprofil() {
  const { ceg, felhasznalo } = await sajatCegVagyIranyitas();
  if (!ceg) return null;

  const supabase = await szerverKliens();
  const [{ data: naptarFeed }, { data: tagok }] = await Promise.all([
    supabase.from("naptar_feed").select("token").eq("ceg_id", ceg.id).maybeSingle(),
    supabase
      .from("felhasznalok")
      .select("id, nev, email, szerep, auth_user_id")
      .eq("ceg_id", ceg.id)
      .order("letrehozva"),
  ]);
  const feedUrl = naptarFeed
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/naptar-feed/${naptarFeed.token}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Building2 size={22} className="text-cta" aria-hidden />Cégadatok</h1>
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
        <Card className="p-6">
          <h2 className="font-bold mb-1 flex items-center gap-2">
            <Users size={18} className="text-cta" aria-hidden />
            Munkatársak
          </h2>
          <p className="text-sm text-muted mb-4">
            Akit meghívsz, az a saját e-mail címével regisztrál a belépő oldalon, és a
            megerősítés után ebbe a cégbe kerül — nem jön létre neki külön cég, és
            jelszót sem kell átadni. A cégnév mezőbe bármit írhat, a meghívás dönt.
          </p>
          <div className="flex flex-col gap-2 mb-5">
            {(tagok ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{t.nev}</span>
                  <span className="text-muted"> · {t.email}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge szin={t.szerep === "tulajdonos" ? "rendben" : "muted"}>{SZEREP_CIMKE[t.szerep]}</Badge>
                  {!t.auth_user_id && (
                    <>
                      <Badge szin="figyelem">várja a regisztrációt</Badge>
                      <form action={meghivasVisszavonasa.bind(null, t.id)}>
                        <MegerositoGomb
                          kerdes={`Visszavonod ${t.email} meghívását? Amíg újra meg nem hívod, ezzel a címmel nem tud csatlakozni a céghez.`}
                          className="text-kritikus text-xs underline"
                        >
                          Visszavonom
                        </MegerositoGomb>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <MunkatarsMeghivo />
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
