import { test, expect } from "@playwright/test";
import { createCsv } from "../src/lib/csv";
import { dateFilterKey, formatDate } from "../src/lib/format";
import {
  summariseTips,
  previousPeriod,
  filterTips,
} from "../src/lib/reporting";
import type { Tip } from "../src/lib/demo";

test("reports separate gross, partial/full refunds and exclude Yoco tests", () => {
  const common = { employeeId: "one", createdAt: "2026-10-23T12:00:00Z" };
  const tips: Tip[] = [
    {
      ...common,
      id: "paid",
      status: "paid",
      amount: 10000,
      refundedAmount: 2000,
      rating: 5,
    },
    { ...common, id: "refund", status: "refunded", amount: 5000 },
    {
      ...common,
      id: "test",
      status: "paid",
      amount: 90000,
      processingMode: "test",
      rating: 1,
    },
    { ...common, id: "pending", status: "pending", amount: 6000 },
  ];
  expect(summariseTips(tips)).toMatchObject({
    gross: 15000,
    refunds: 7000,
    net: 8000,
    count: 2,
    average: 5,
  });
  expect(
    filterTips(tips, { employeeId: "other", from: "", until: "" }),
  ).toEqual([]);
  expect(previousPeriod("2026-10-10", "2026-10-12")).toEqual({
    from: "2026-10-07",
    until: "2026-10-09",
  });
  expect(previousPeriod("2026-10-12", "2026-10-10")).toBeNull();
});

test("CSV exports quote guest text and neutralise spreadsheet formulas", () => {
  const csv = createCsv(
    ["Employee", "Review"],
    [
      ["=SUM(A1:A2)", 'Friendly, "helpful" service\nThank you.'],
      ["Sarah", "@lookup"],
    ],
  );
  expect(csv).toContain('"\'=SUM(A1:A2)"');
  expect(csv).toContain('"Friendly, ""helpful"" service\nThank you."');
  expect(csv).toContain('"\'@lookup"');
});

test("date labels and filter keys agree across South African midnight", () => {
  const value = "2026-10-21T22:30:00.000Z";
  expect(dateFilterKey(value)).toBe("2026-10-22");
  expect(
    formatDate(value, { day: "numeric", month: "long", year: "numeric" }),
  ).toBe("22 October 2026");
});
