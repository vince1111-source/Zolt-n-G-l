"use client";

import { useFormStatus } from "react-dom";
import { gombElsodleges } from "./classes";

export function SubmitButton({
  cimke,
  folyamatbanCimke,
  className = gombElsodleges,
}: {
  cimke: string;
  folyamatbanCimke?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (folyamatbanCimke ?? "Mentés…") : cimke}
    </button>
  );
}
