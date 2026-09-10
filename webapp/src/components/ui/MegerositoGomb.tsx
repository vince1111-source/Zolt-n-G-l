"use client";

import type { ReactNode } from "react";

/**
 * Végleges törlés vagy visszavonás gombja, megerősítéssel. Telefonon,
 * kesztyűben egy mellényúlás elég volt egy teendő, időpont vagy fotó
 * végleges törléséhez — ezt fogja meg a rendszer saját kérdőablaka.
 * Szerveres `<form action>` belsejében: ha a válasz "Mégse", a beküldés elmarad.
 */
export function MegerositoGomb({
  kerdes,
  className,
  ariaLabel,
  children,
}: {
  kerdes: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!confirm(kerdes)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
