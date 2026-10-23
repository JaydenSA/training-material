"use client";
import { ReviewText } from "@/components/review-moderation";
import { useState } from "react";
import Link from "@/components/app-link";
import { useWorkspace } from "@/components/workspace-context";
import { useSimulatedReviews } from "@/hooks/use-simulated-reviews";
import { money } from "@/lib/demo";
import {
  filterTips,
  summariseTips,
  type ReportFilters as Filters,
} from "@/lib/reporting";
import { formatDate } from "@/lib/format";
import { ReportFilters } from "@/components/report-filters";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui";
import { RatingStars } from "@/components/review-form";
export function EmployeeInsights({ employeeId }: { employeeId: string }) {
  const { state, mode } = useWorkspace();
  const [filters, setFilters] = useState<Filters>({
    employeeId,
    from: "",
    until: "",
  });
  const simulation = useSimulatedReviews(
    state.restaurant.slug,
    state.employees,
    mode === "database",
  );
  const tips = filterTips(state.tips, { ...filters, employeeId }).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const summary = summariseTips(tips);
  const reviews = filterTips([...state.tips, ...simulation], {
    ...filters,
    employeeId,
  })
    .filter((tip) => tip.status === "paid" && tip.rating)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tags = state.tags.filter((tag) => tag.employeeId === employeeId);
  return (
    <section aria-label="Employee insights">
      <h2>Tips, reviews & tags</h2>
      <ReportFilters
        value={filters}
        onChange={setFilters}
        employees={state.employees}
        fixedEmployee
      />
      <div className="stats">
        <StatCard label="Gross confirmed tips" value={money(summary.gross)} />
        <StatCard label="Refunds" value={money(summary.refunds)} />
        <StatCard label="Net before fees" value={money(summary.net)} />
        <StatCard
          label="Guest rating"
          value={
            summary.ratingCount
              ? `${summary.average.toFixed(1)} / 5`
              : "No ratings yet"
          }
          detail={`${summary.ratingCount} ratings · excludes Yoco tests`}
        />
      </div>
      <div className="panel">
        <div className="panel-heading">
          <h3>Rating breakdown</h3>
        </div>
        <div className="rating-breakdown">
          {[5, 4, 3, 2, 1].map((stars) => (
            <div key={stars}>
              <span>{stars} stars</span>
              <strong>
                {
                  tips.filter(
                    (tip) =>
                      tip.status === "paid" &&
                      tip.processingMode !== "test" &&
                      tip.rating === stars,
                  ).length
                }
              </strong>
            </div>
          ))}
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h3>Employee tips</h3>
        </div>
        <DataTable
          label="Employee tips"
          rows={tips}
          rowKey={(tip) => tip.id}
          emptyMessage="No tips in this date range."
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (tip) => formatDate(tip.createdAt),
            },
            {
              key: "amount",
              header: "Gross tip",
              cell: (tip) => money(tip.amount),
            },
            {
              key: "status",
              header: "Status",
              cell: (tip) => (
                <Badge muted={tip.processingMode === "test"}>
                  {tip.status}
                  {tip.processingMode === "test" ? " · Yoco test" : ""}
                </Badge>
              ),
            },
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h3>Employee reviews</h3>
        </div>
        <DataTable
          label="Employee reviews"
          rows={reviews}
          rowKey={(tip) => tip.id}
          emptyMessage="No reviews in this date range."
          columns={[
            {
              key: "stars",
              header: "Stars",
              cell: (tip) => <RatingStars value={tip.rating!} showValue />,
            },
            {
              key: "review",
              header: "Review",
              className: "review-text",
              cell: (tip) => (
                <ReviewText
                  text={tip.review}
                  event={state.moderations?.find(
                    (item) => item.tipId === tip.id,
                  )}
                />
              ),
            },
            {
              key: "date",
              header: "Date",
              cell: (tip) => formatDate(tip.createdAt),
            },
            {
              key: "source",
              header: "Source",
              cell: (tip) => (
                <Badge
                  muted={
                    tip.processingMode === "test" || tip.id.startsWith("demo-")
                  }
                >
                  {simulation.some((item) => item.id === tip.id)
                    ? "Simulated"
                    : tip.processingMode === "test"
                      ? "Yoco test"
                      : mode === "demo"
                        ? "Demo"
                        : "Verified"}
                </Badge>
              ),
            },
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h3>Assigned tags</h3>
          <Link href="/dashboard/tags">Manage tags</Link>
        </div>
        <DataTable
          label="Employee tags"
          rows={tags}
          rowKey={(tag) => tag.id}
          emptyMessage="No tags assigned yet."
          columns={[
            {
              key: "code",
              header: "Code",
              cell: (tag) =>
                tag.status === "active" ? (
                  <Link href={`/t/${tag.id}`}>{tag.id}</Link>
                ) : (
                  tag.id
                ),
            },
            { key: "type", header: "Type", cell: (tag) => tag.type },
            {
              key: "status",
              header: "Status",
              cell: (tag) => (
                <Badge muted={tag.status !== "active"}>{tag.status}</Badge>
              ),
            },
          ]}
        />
      </section>
    </section>
  );
}
