"use client";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { RatingStars } from "@/components/review-form";
import { dateFilterKey, formatDate } from "@/lib/format";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { useSimulatedReviews } from "@/hooks/use-simulated-reviews";
import { Badge, Heading } from "@/components/ui";
import { ReviewModeration, ReviewText } from "@/components/review-moderation";
import { moderationStatus } from "@/lib/moderation";

export function RatingsTable() {
  const { state, mode } = useWorkspace();
  const simulations = useSimulatedReviews(
    state.restaurant.slug,
    state.employees,
    mode === "database",
  );
  const [employee, setEmployee] = useState("");
  const [stars, setStars] = useState("");
  const [written, setWritten] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [search, setSearch] = useState("");
  const [moderation, setModeration] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const rows = [
    ...state.tips
      .filter((tip) => tip.status === "paid" && tip.rating)
      .map((tip) => ({
        ...tip,
        source:
          tip.processingMode === "test"
            ? "Yoco test"
            : mode === "database"
              ? "Verified"
              : "Demo",
      })),
    ...simulations.map((tip) => ({ ...tip, source: "Simulated" })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = rows.filter((tip) => {
    const date = dateFilterKey(tip.createdAt);
    const name =
      state.employees.find((person) => person.id === tip.employeeId)?.name ||
      "Archived employee";

    const matchesEmployee = !employee || tip.employeeId === employee;
    const matchesStars = !stars || tip.rating === Number(stars);
    const hasWrittenReview = Boolean(tip.review?.trim());
    const matchesWrittenReview =
      !written || (written === "yes" ? hasWrittenReview : !hasWrittenReview);
    const matchesSource = !source || tip.source === source;
    const matchesDateRange =
      (!from || date >= from) && (!until || date <= until);
    const matchesSearch = `${name} ${tip.review || ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    return (
      matchesEmployee &&
      matchesStars &&
      matchesWrittenReview &&
      matchesSource &&
      matchesDateRange &&
      matchesSearch &&
      (!moderation ||
        moderationStatus(
          state.moderations?.find((item) => item.tipId === tip.id),
        ) === moderation)
    );
  });
  const invalidDates = !!from && !!until && from > until;
  function clear() {
    setEmployee("");
    setStars("");
    setWritten("");
    setSource("");
    setFrom("");
    setUntil("");
    setSearch("");
    setModeration("");
  }
  return (
    <>
      <Heading title="Ratings & reviews">
        Every submitted star rating and written review, organised by employee.
      </Heading>
      <section className="panel">
        <div className="ratings-filters">
          <label>
            Search reviews
            <input
              type="search"
              placeholder="Employee name or review text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <FilterSelect
            label="Employee"
            value={employee}
            onChange={(event) => setEmployee(event.target.value)}
            options={[
              { value: "", label: "All employees" },
              ...state.employees.map((person) => ({
                value: person.id,
                label: `${person.name}${person.deletedAt ? " (archived)" : ""}`,
              })),
            ]}
          />
          <FilterSelect
            label="Star rating"
            value={stars}
            onChange={(event) => setStars(event.target.value)}
            options={[
              { value: "", label: "All ratings" },
              ...[5, 4, 3, 2, 1].map((value) => ({
                value: String(value),
                label: `${value} ${value === 1 ? "star" : "stars"}`,
              })),
            ]}
          />
          <FilterSelect
            label="Moderation status"
            value={moderation}
            onChange={(event) => setModeration(event.target.value)}
            options={[
              { value: "", label: "All review states" },
              ...["Visible", "Flagged", "Hidden"].map((value) => ({
                value,
                label: value,
              })),
            ]}
          />
          <FilterSelect
            label="Written review"
            value={written}
            onChange={(event) => setWritten(event.target.value)}
            options={[
              { value: "", label: "All submissions" },
              { value: "yes", label: "With a written review" },
              { value: "no", label: "Stars only" },
            ]}
          />
          {mode === "database" && (
            <FilterSelect
              label="Source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              options={[
                { value: "", label: "All sources" },
                ...["Verified", "Yoco test", "Simulated"].map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />
          )}
          <label>
            From date
            <input
              type="date"
              value={from}
              max={until || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            To date
            <input
              type="date"
              value={until}
              min={from || undefined}
              onChange={(event) => setUntil(event.target.value)}
            />
          </label>
          <button className="button secondary" onClick={clear}>
            Clear filters
          </button>
        </div>
        {invalidDates && (
          <p className="ratings-caption" role="alert">
            Choose a start date on or before the end date.
          </p>
        )}
        <p className="ratings-caption" role="status">
          Showing {filtered.length} of {rows.length} ratings · Newest first
        </p>
        <DataTable
          label="Ratings and reviews"
          className="ratings-table"
          rows={filtered}
          rowKey={(tip) => tip.source + ":" + tip.id}
          emptyMessage={
            rows.length
              ? "No ratings match your filters."
              : "No ratings yet. Submitted ratings will appear here."
          }
          columns={[
            {
              key: "employee",
              header: "Employee",
              cell: (tip) => (
                <strong>
                  {state.employees.find(
                    (person) => person.id === tip.employeeId,
                  )?.name || "Archived employee"}
                </strong>
              ),
            },
            {
              key: "rating",
              header: "Rating",
              cell: (tip) => <RatingStars value={tip.rating!} showValue />,
            },
            {
              key: "review",
              header: "Written review",
              className: "review-text",
              cell: (tip) => (
                <ReviewText
                  text={tip.review?.trim()}
                  event={state.moderations?.find(
                    (item) => item.tipId === tip.id,
                  )}
                />
              ),
            },
            {
              key: "date",
              header: "Date",
              cell: (tip) => (
                <time dateTime={tip.createdAt}>
                  {formatDate(tip.createdAt)}
                </time>
              ),
            },
            {
              key: "source",
              header: "Source",
              cell: (tip) => (
                <Badge muted={tip.source !== "Verified"}>{tip.source}</Badge>
              ),
            },
            {
              key: "moderation",
              header: "Moderation",
              cell: (tip) => (
                <>
                  <Badge muted>
                    {moderationStatus(
                      state.moderations?.find((item) => item.tipId === tip.id),
                    )}
                  </Badge>
                  {tip.review?.trim() && tip.source !== "Simulated" && (
                    <button
                      className="text-button"
                      onClick={() => setSelected(tip.id)}
                      aria-label={`Moderate review ${tip.id}`}
                    >
                      Moderate
                    </button>
                  )}
                </>
              ),
            },
          ]}
        />
      </section>
      {selected && (
        <ReviewModeration
          key={selected}
          tipId={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {mode === "database" && (
        <p>
          Simulated reviews are saved in this browser only and do not affect
          verified ratings or restaurant statistics.
        </p>
      )}
    </>
  );
}
