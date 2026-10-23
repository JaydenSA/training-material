import { test, expect } from "@playwright/test";
import { createCsv } from "../src/lib/csv";
import { dateFilterKey, formatDate } from "../src/lib/format";

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
