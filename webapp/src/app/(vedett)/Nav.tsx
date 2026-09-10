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

function linkOsztaly(aktiv: boolean) {
  return `px-3 py-2 rounded-lg whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
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
    <nav className="flex items-center gap-1 text-sm px-4 sm:px-5 pb-2 sm:pb-3">
      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      <div ref={tobbDoboz} className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setTobbNyitva((v) => !v)}
          className={linkOsztaly(tobbAktiv)}
          aria-expanded={tobbNyitva}
        >
          <MoreHorizontal size={16} aria-hidden />
          Több
        </button>
        {tobbNyitva && (
          <div
            className="absolute left-0 top-full mt-1 bg-brand border border-white/15 rounded-lg overflow-hidden shadow-lg z-20 min-w-[10rem]"
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
