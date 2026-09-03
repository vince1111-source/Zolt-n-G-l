import { kartya } from "./classes";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${kartya} ${className}`}>{children}</div>;
}
