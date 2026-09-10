import Link from "next/link";
import { Send, FileText, Mail } from "lucide-react";
import { MasoloGomb } from "@/components/MasoloGomb";
import { gombElsodleges, gombMasodlagos } from "@/components/ui/classes";

/**
 * "Küldés az ügyfélnek" — a régi "Kiküldöm" gomb helyett.
 *
 * A régi gomb azt sugallta, hogy a rendszer elküldi az ajánlatot, pedig
 * csak rögzítette (e-mail-küldés V2, Gmail-integráció tilos — CLAUDE.md).
 * Ha a vállalkozó elhiszi, hogy az ügyfél megkapta, elveszíthet egy munkát.
 * Most három őszinte lépés: (1) ügyfél-PDF, (2) a saját levelezője vagy
 * üzenetküldője előre kitöltött szöveggel — a rendszer nem küld semmit,
 * (3) csak ezután "Kiküldöttnek jelölöm", egy kötelező pipával. A 3. lépés
 * továbbra is a jóváhagyási kapun megy át (`ajanlatKikuldese`).
 */
export function KuldesPanel({
  dokumentumHref,
  email,
  targy,
  torzs,
  action,
}: {
  dokumentumHref: string;
  email: string | null;
  targy: string;
  torzs: string;
  action: (adat: FormData) => Promise<void>;
}) {
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent(targy)}&body=${encodeURIComponent(torzs)}`
    : null;

  return (
    <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-4">
      <div>
        <h2 className="font-bold flex items-center gap-2">
          <Send size={18} className="text-cta" aria-hidden />
          Küldés az ügyfélnek
        </h2>
        <p className="text-sm text-muted mt-1">
          A rendszer nem küld e-mailt: az ajánlatot te küldöd el, a saját telefonodról vagy
          leveleződből. Utána jelöld kiküldöttnek, és ha 3 napig nincs válasz, a Ma oldalon szólok.
        </p>
      </div>

      <ol className="flex flex-col gap-4 text-sm">
        <li className="flex flex-col gap-2">
          <span className="font-semibold">1. Mentsd el PDF-be</span>
          <Link href={dokumentumHref} className={`${gombMasodlagos} inline-flex items-center gap-1.5 self-start`}>
            <FileText size={14} aria-hidden />
            Ügyfélnek szóló PDF
          </Link>
        </li>

        <li className="flex flex-col gap-2">
          <span className="font-semibold">2. Küldd el neki, és csatold a PDF-et</span>
          <div className="flex flex-wrap gap-2">
            {mailto ? (
              <a href={mailto} className={`${gombMasodlagos} inline-flex items-center gap-1.5`}>
                <Mail size={14} aria-hidden />
                E-mail írása
              </a>
            ) : (
              <span className="text-muted text-xs self-center">
                A partnernek nincs e-mail címe — add meg a partner lapján, vagy küldd üzenetben.
              </span>
            )}
            <MasoloGomb szoveg={torzs} cimke="Szöveg másolása üzenethez" />
          </div>
        </li>

        <li>
          <form action={action} className="flex flex-col gap-2">
            <span className="font-semibold">3. Ha elküldted, jelöld</span>
            <label className="flex items-center gap-3 min-h-[44px]">
              <input type="checkbox" name="elkuldtem" required className="w-5 h-5" />
              Elküldtem az ügyfélnek
            </label>
            <button type="submit" className={`${gombElsodleges} self-start`}>
              Kiküldöttnek jelölöm
            </button>
          </form>
        </li>
      </ol>
    </div>
  );
}
