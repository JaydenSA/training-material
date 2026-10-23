import type { Tip } from "./demo";
import { dateFilterKey } from "./format";

export type ReportFilters = { employeeId: string; from: string; until: string };
export function filterTips(tips: readonly Tip[], filters: ReportFilters) {
  return tips.filter((tip) => {
    const date = dateFilterKey(tip.createdAt);
    return (
      (!filters.employeeId || tip.employeeId === filters.employeeId) &&
      (!filters.from || date >= filters.from) &&
      (!filters.until || date <= filters.until)
    );
  });
}
export function summariseTips(tips: readonly Tip[]) {
  const confirmed = tips.filter(
    (tip) =>
      tip.processingMode !== "test" &&
      ["paid", "refunded"].includes(tip.status),
  );
  const gross = confirmed.reduce((total, tip) => total + tip.amount, 0);
  const refunds = confirmed.reduce(
    (total, tip) =>
      total +
      (tip.refundedAmount || (tip.status === "refunded" ? tip.amount : 0)),
    0,
  );
  const rated = confirmed.filter((tip) => tip.status === "paid" && tip.rating);
  return {
    gross,
    refunds,
    net: gross - refunds,
    count: confirmed.length,
    ratingCount: rated.length,
    average: rated.length
      ? rated.reduce((total, tip) => total + tip.rating!, 0) / rated.length
      : 0,
  };
}
export function previousPeriod(from: string, until: string) {
  if (!from || !until || from > until) return null;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${until}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const days = (end - start) / 86400000 + 1;
  return {
    from: new Date(start - days * 86400000).toISOString().slice(0, 10),
    until: new Date(start - 86400000).toISOString().slice(0, 10),
  };
}
