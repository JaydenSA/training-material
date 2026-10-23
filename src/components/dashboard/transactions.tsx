"use client";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { formatDate } from "@/lib/format";
import { createCsv, downloadCsv } from "@/lib/csv";
import Link from "@/components/app-link";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { money } from "@/lib/demo";
import { Avatar, Badge, Heading } from "@/components/ui";

export function Transactions({ compact = false }: { compact?: boolean }) {
  const { state } = useWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const rows = state.tips
    .filter(
      (t) =>
        (status === "all" || status === t.status) &&
        (period === "all" ||
          Date.now() - new Date(t.createdAt).getTime() <=
            Number(period) * 86400000) &&
        (state.employees
          .find((e) => e.id === t.employeeId)
          ?.name.toLowerCase()
          .includes(query.toLowerCase()) ||
          t.id.toLowerCase().includes(query.toLowerCase())),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  function exportCSV() {
    downloadCsv(
      "tipit-transactions.csv",
      createCsv(
        [
          "Reference",
          "Employee",
          "Gross ZAR",
          "Status",
          "Date",
          "Processing mode",
          "Refunded ZAR",
        ],
        rows.map((tip) => [
          tip.id,
          state.employees.find((employee) => employee.id === tip.employeeId)
            ?.name || "Archived employee",
          (tip.amount / 100).toFixed(2),
          tip.status,
          tip.createdAt,
          tip.processingMode || "demo",
          ((tip.refundedAmount || 0) / 100).toFixed(2),
        ]),
      ),
    );
  }
  return (
    <>
      {!compact && (
        <Heading title="Tips & transactions">
          Every thank you, clearly accounted for. Staff distribution is managed
          by your restaurant.
        </Heading>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>{compact ? "Recent appreciation" : "Transaction history"}</h3>
            <p>
              {compact
                ? "The latest tips received by your restaurant"
                : "Gross amounts shown. Processing fees are paid by the restaurant."}
            </p>
          </div>
          {compact ? (
            <Link href="/dashboard/tips">View all transactions ↗</Link>
          ) : (
            <button className="button secondary small" onClick={exportCSV}>
              ↓ Export CSV
            </button>
          )}
        </div>
        {!compact && (
          <div className="filters">
            <input
              aria-label="Search transactions"
              placeholder="Search employee or reference…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <FilterSelect
              label="Payment status"
              hideLabel
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                "all",
                "paid",
                "pending",
                "failed",
                "refunded",
                "cancelled",
              ].map((value) => ({
                value,
                label: value === "all" ? "All statuses" : value,
              }))}
            />
            <FilterSelect
              label="Date range"
              hideLabel
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: "all", label: "All dates" },
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
              ]}
            />
          </div>
        )}
        <DataTable
          label="Tips and transactions"
          rows={compact ? rows.slice(0, 5) : rows}
          rowKey={(tip) => tip.id}
          emptyMessage="No transactions match your filters."
          columns={[
            {
              key: "employee",
              header: "TEAM MEMBER",
              cell: (tip) => {
                const employee = state.employees.find(
                  (employee) => employee.id === tip.employeeId,
                );
                return (
                  <div className="person">
                    {employee && <Avatar employee={employee} />}
                    <strong>{employee?.name || "Archived employee"}</strong>
                  </div>
                );
              },
            },
            {
              key: "date",
              header: "DATE",
              cell: (tip) =>
                formatDate(tip.createdAt, { day: "numeric", month: "short" }),
            },
            {
              key: "amount",
              header: "GROSS TIP",
              className: "amount",
              cell: (tip) => money(tip.amount),
            },
            {
              key: "status",
              header: "STATUS",
              cell: (tip) => (
                <>
                  <Badge muted={tip.status !== "paid"}>
                    {tip.status === "paid" ? "Confirmed" : tip.status}
                  </Badge>
                  {tip.processingMode === "test" && (
                    <Badge muted>Yoco test</Badge>
                  )}
                  {!!tip.refundedAmount && tip.status !== "refunded" && (
                    <Badge muted>Partial refund</Badge>
                  )}
                </>
              ),
            },
            {
              key: "reference",
              header: "REFERENCE",
              cell: (tip) => (
                <Link className="reference" href={`/payment/${tip.id}`}>
                  {tip.id}
                </Link>
              ),
            },
          ]}
        />
        <div className="table-foot">
          {Math.min(rows.length, compact ? 5 : rows.length)} of {rows.length}{" "}
          transactions <span>Payments received by {state.restaurant.name}</span>
        </div>
      </section>
    </>
  );
}
