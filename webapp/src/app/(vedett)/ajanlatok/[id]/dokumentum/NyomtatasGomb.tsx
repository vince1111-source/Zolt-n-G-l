"use client";

export function NyomtatasGomb() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-cta text-cta-ink font-bold rounded-full px-5 py-3 print:hidden"
    >
      Nyomtatás / PDF
    </button>
  );
}
