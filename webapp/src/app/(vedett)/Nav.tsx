"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Home,
  Briefcase,
  FileText,
  Calendar,
  ListChecks,
  MoreHorizontal,
  Tag,
  Truck,
  Users,
  FolderOpen,
  Building2,
  type LucideIcon,
} from "lucide-react";

const FO_LINKEK: { href: string; cimke: string; ikon: LucideIcon }[] = [
  { href: "/", cimke: "Ma", ikon: Home },
  { href: "/munkak", cimke: "Munkák", ikon: Briefcase },
  { href: "/ajanlatok", cimke: "Ajánlatok", ikon: FileText },
  { href: "/naptar", cimke: "Naptár", ikon: Calendar },
  { href: "/feladatok", cimke: "Teendők", ikon: ListChecks },
];

const TOBB_LINKEK: { href: string; cimke: string; ikon: LucideIcon }[] = [
  { href: "/arlista", cimke: "Árlista", ikon: Tag },
  { href: "/nagyker", cimke: "Nagyker", ikon: Truck },
  { href: "/partnerek", cimke: "Partnerek", ikon: Users },
  { href: "/dokumentumok", cimke: "Dokumentumok", ikon: FolderOpen },
  { href: "/cegprofil", cimke: "Cégadatok", ikon: Building2 },
];

// Telefonon (sm alatt) ikon fölött kis felirat: így mind az öt fő pont és a
// Több is kifér 375 px-en. Korábban a Naptár és a Teendők oldalra kilógott,
// és a rejtett görgetősáv miatt semmi nem jelezte, hogy ott vannak.
function linkOsztaly(aktiv: boolean) {
  return `flex-1 sm:flex-none min-w-0 px-1 sm:px-3 py-2 rounded-lg whitespace-nowrap flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm ${
    aktiv ? "bg-white/15 font-semibold" : "hover:bg-white/10"
  }`;
}

export function Nav() {
  const pathname = usePathname();
  const [tobbNyitva, setTobbNyitva] = useState(false);
  const tobbAktiv = TOBB_LINKEK.some((l) => l.href === pathname);
  const tobbDoboz = useRef<HTMLDivElement>(null);

  // Telefonon nincs "mouseleave": a menü a mellé koppintásra és Esc-re is
  // záródjon, különben nyitva marad és eltakarja a tartalmat.
  useEffect(() => {
    if (!tobbNyitva) return;
    const kivulKoppintas = (e: PointerEvent) => {
      if (!tobbDoboz.current?.contains(e.target as Node)) setTobbNyitva(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTobbNyitva(false);
    };
    document.addEventListener("pointerdown", kivulKoppintas);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", kivulKoppintas);
      document.removeEventListener("keydown", esc);
    };
  }, [tobbNyitva]);

  return (
    <nav className="flex items-center gap-0 sm:gap-1 text-sm px-2 sm:px-5 pb-2 sm:pb-3">
      <div className="flex items-center gap-0 sm:gap-1 min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FO_LINKEK.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={linkOsztaly(pathname === l.href)}
          >
            <l.ikon size={16} aria-hidden />
            {l.cimke}
          </Link>
        ))}
      </div>
      <div ref={tobbDoboz} className="relative flex-shrink-0 w-14 sm:w-auto">
        <button
          type="button"
          onClick={() => setTobbNyitva((v) => !v)}
          className={`${linkOsztaly(tobbAktiv)} w-full`}
          aria-expanded={tobbNyitva}
        >
          <MoreHorizontal size={16} aria-hidden />
          Több
        </button>
        {tobbNyitva && (
          // Jobbra igazítva: a gomb a sor végén van, balra igazítva a menü
          // kilógott a képernyőből ("Partnere…", "Dokumen…").
          <div
            className="absolute right-0 top-full mt-1 bg-brand border border-white/15 rounded-lg overflow-hidden shadow-lg z-20 min-w-[10rem]"
            onMouseLeave={() => setTobbNyitva(false)}
          >
            {TOBB_LINKEK.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setTobbNyitva(false)}
                className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap ${
                  pathname === l.href ? "bg-white/15 font-semibold" : "hover:bg-white/10"
                }`}
              >
                <l.ikon size={16} aria-hidden />
                {l.cimke}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
