import type { ReactNode } from "react";
export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <article className="stat">
      <div>{label}</div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
