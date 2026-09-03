const SZINEK = {
  muted: "bg-line/40 text-muted",
  figyelem: "bg-figyelem-soft text-figyelem",
  rendben: "bg-rendben-soft text-rendben",
  kritikus: "bg-kritikus-soft text-kritikus",
} as const;

export function Badge({
  children,
  szin = "muted",
}: {
  children: React.ReactNode;
  szin?: keyof typeof SZINEK;
}) {
  return (
    <span
      className={`text-xs font-mono rounded-full px-2 py-0.5 inline-block ${SZINEK[szin]}`}
    >
      {children}
    </span>
  );
}
