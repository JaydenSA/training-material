"use client";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { Heading } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { ReportFilters } from "@/components/report-filters";
import { DataTable } from "@/components/data-table";
import { money } from "@/lib/demo";
import {
  filterTips,
  previousPeriod,
  summariseTips,
  type ReportFilters as Filters,
} from "@/lib/reporting";
import { createCsv, downloadCsv } from "@/lib/csv";
export function Reports() {
  const { state, mode } = useWorkspace();
  const [filters, setFilters] = useState<Filters>({
    employeeId: "",
    from: "",
    until: "",
  });
  const tips = filterTips(
    state.tips.filter((tip) => tip.processingMode !== "test"),
    filters,
  );
  const total = summariseTips(tips);
  const previous = previousPeriod(filters.from, filters.until);
  const comparison = previous
    ? summariseTips(filterTips(state.tips, { ...filters, ...previous }))
    : null;
  const rows = state.employees
    .filter(
      (employee) => !filters.employeeId || employee.id === filters.employeeId,
    )
    .map((employee) => ({
      employee,
      ...summariseTips(tips.filter((tip) => tip.employeeId === employee.id)),
    }));
  function exportSummary() {
    downloadCsv(
      "tipit-employee-summary.csv",
      createCsv(
        [
          "Employee",
          "Archived",
          "Confirmed payments",
          "Gross ZAR",
          "Refunds ZAR",
          "Net before fees ZAR",
          "From",
          "Until",
          "Source",
        ],
        rows.map((row) => [
          row.employee.name,
          row.employee.deletedAt ? "Yes" : "No",
          String(row.count),
          (row.gross / 100).toFixed(2),
          (row.refunds / 100).toFixed(2),
          (row.net / 100).toFixed(2),
          filters.from || "All dates",
          filters.until || "All dates",
          mode === "demo" ? "Demo" : "Live records",
        ]),
      ),
    );
  }
  return (
    <>
      <Heading
        title="Restaurant reports"
        action={
          <button
            className="button"
            onClick={exportSummary}
            disabled={!rows.length}
          >
            Export employee summary
          </button>
        }
      >
        Gross tips, refunds, and net amounts before fees. The restaurant manages
        employee distribution.
      </Heading>
      <section className="panel pad">
        <ReportFilters
          value={filters}
          onChange={setFilters}
          employees={state.employees}
        />
        <p>
          {mode === "demo"
            ? "Demo records only."
            : "Yoco test payments and browser simulations are excluded."}{" "}
          Fees and staff payouts are not calculated here.
        </p>
        <p>
          Refunds are grouped with the original tip date. This report is not a
          cash-basis accounting ledger.
        </p>
      </section>
      <div className="stats">
        <StatCard label="Gross tips" value={money(total.gross)} />
        <StatCard label="Refunds" value={money(total.refunds)} />
        <StatCard label="Net before fees" value={money(total.net)} />
        <StatCard label="Confirmed payments" value={total.count} />
      </div>
      <section className="panel pad">
        <h2>Period comparison</h2>
        {comparison && previous ? (
          <>
            <p>
              Comparing selected dates with {previous.from} to {previous.until}.
            </p>
            <p>
              Previous net before fees: <strong>{money(comparison.net)}</strong>
            </p>
            <p>
              Change: <strong>{money(total.net - comparison.net)}</strong>
              {comparison.net > 0
                ? ` (${(((total.net - comparison.net) / comparison.net) * 100).toFixed(1)}%)`
                : " · No percentage comparison available for a zero baseline."}
            </p>
          </>
        ) : (
          <p>
            Select both dates to compare against the previous period of the same
            length.
          </p>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Employee summary</h2>
        </div>
        <DataTable
          label="Employee report"
          rows={rows}
          rowKey={(row) => row.employee.id}
          emptyMessage="No employees match this report."
          columns={[
            {
              key: "employee",
              header: "Employee",
              cell: (row) => (
                <>
                  {row.employee.name}
                  {row.employee.deletedAt ? " (archived)" : ""}
                </>
              ),
            },
            { key: "count", header: "Payments", cell: (row) => row.count },
            { key: "gross", header: "Gross", cell: (row) => money(row.gross) },
            {
              key: "refunds",
              header: "Refunds",
              cell: (row) => money(row.refunds),
            },
            {
              key: "net",
              header: "Net before fees",
              cell: (row) => money(row.net),
            },
          ]}
        />
      </section>
    </>
  );
}
