"use client";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { Heading } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { ReportFilters } from "@/components/report-filters";
import { compareEmployees } from "@/lib/comparisons";
import { previousPeriod } from "@/lib/reporting";
import { money } from "@/lib/demo";
import { createCsv, downloadCsv } from "@/lib/csv";
export function EmployeeComparisons() {
  const { state, mode } = useWorkspace();
  const [selected, setSelected] = useState<string[] | null>(null);
  const [archived, setArchived] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: "",
    from: "",
    until: "",
  });
  const employees = state.employees.filter(
    (item) => archived || !item.deletedAt,
  );
  const ids = (selected ?? employees.slice(0, 2).map((item) => item.id)).filter(
    (id) => employees.some((item) => item.id === id),
  );
  const rows = compareEmployees(state, ids, filters);
  const prior = previousPeriod(filters.from, filters.until);
  const invalid =
    !!filters.from && !!filters.until && filters.from > filters.until;
  function exportRows() {
    downloadCsv(
      "tipit-employee-comparison.csv",
      createCsv(
        [
          "Employee",
          "From",
          "Until",
          "Payments",
          "Net ZAR",
          "Previous net ZAR",
          "Net change ZAR",
          "Rating count",
          "Average stars",
          "Previous average stars",
          "Written reviews",
          "Source",
        ],
        rows.map((row) => [
          row.employee.name,
          filters.from || "All dates",
          filters.until || "All dates",
          String(row.current.count),
          (row.current.net / 100).toFixed(2),
          row.previous ? (row.previous.net / 100).toFixed(2) : "",
          row.previous
            ? ((row.current.net - row.previous.net) / 100).toFixed(2)
            : "",
          String(row.current.ratingCount),
          row.current.ratingCount ? row.current.average.toFixed(2) : "",
          row.previous?.ratingCount ? row.previous.average.toFixed(2) : "",
          String(row.writtenReviews),
          mode === "demo" ? "Demo" : "Live records",
        ]),
      ),
    );
  }
  return (
    <>
      <Heading
        title="Employee comparisons"
        action={
          <button
            className="button"
            disabled={!rows.length || invalid}
            onClick={exportRows}
          >
            Export comparison CSV
          </button>
        }
      >
        Compare tip and rating trends for up to six employees over the same
        period.
      </Heading>
      <section className="panel pad">
        <ReportFilters
          value={filters}
          onChange={setFilters}
          employees={employees}
          fixedEmployee
        />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) => setArchived(event.target.checked)}
          />
          Include archived employees
        </label>
        <fieldset className="choice-grid">
          <legend>Employees to compare</legend>
          {employees.map((employee) => (
            <label className="checkbox" key={employee.id}>
              <input
                type="checkbox"
                checked={ids.includes(employee.id)}
                disabled={!ids.includes(employee.id) && ids.length >= 6}
                onChange={() =>
                  setSelected(
                    ids.includes(employee.id)
                      ? ids.filter((id) => id !== employee.id)
                      : [...ids, employee.id],
                  )
                }
              />
              {employee.name}
              {employee.deletedAt ? " (archived)" : ""}
            </label>
          ))}
        </fieldset>
        <p>
          {prior
            ? `Previous period: ${prior.from} to ${prior.until}.`
            : "Select both dates for an equal-length previous-period comparison."}{" "}
          {mode === "demo"
            ? "Demo records only."
            : "Browser simulations and Yoco test payments are excluded."}
        </p>
        <p>
          Tip opportunities vary with hours, shifts and guest traffic. These
          figures are not a performance ranking. Refunds follow the original tip
          date; net amounts are before fees.
        </p>
      </section>
      <section className="panel">
        <DataTable
          label="Employee comparison"
          rows={invalid ? [] : rows}
          rowKey={(row) => row.employee.id}
          emptyMessage="Select employees and a valid date range to compare."
          columns={[
            {
              key: "name",
              header: "Employee",
              cell: (row) => row.employee.name,
            },
            {
              key: "payments",
              header: "Payments",
              cell: (row) => row.current.count,
            },
            {
              key: "net",
              header: "Net before fees",
              cell: (row) => money(row.current.net),
            },
            {
              key: "prior",
              header: "Previous net",
              cell: (row) => (row.previous ? money(row.previous.net) : "—"),
            },
            {
              key: "change",
              header: "Net change",
              cell: (row) =>
                row.previous ? money(row.current.net - row.previous.net) : "—",
            },
            {
              key: "average",
              header: "Average stars",
              cell: (row) =>
                row.current.ratingCount
                  ? row.current.average.toFixed(2)
                  : "No ratings",
            },
            {
              key: "priorRating",
              header: "Previous stars",
              cell: (row) =>
                row.previous?.ratingCount
                  ? row.previous.average.toFixed(2)
                  : "—",
            },
            {
              key: "ratings",
              header: "Ratings",
              cell: (row) => row.current.ratingCount,
            },
            {
              key: "written",
              header: "Written reviews",
              cell: (row) => row.writtenReviews,
            },
          ]}
        />
      </section>
    </>
  );
}
