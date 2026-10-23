"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useWorkspace } from "@/components/workspace-context";
import { activityLabels, type ActivityEvent } from "@/lib/activity";
import { formatDate } from "@/lib/format";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { Heading } from "@/components/ui";
export function Activity() {
  const { state, mode } = useWorkspace();
  return mode === "database" ? (
    <ConnectedActivity />
  ) : (
    <ActivityTable events={state.activity || []} demo />
  );
}
function ConnectedActivity() {
  const { orgId } = useAuth();
  const [result, setResult] = useState<{
    events: ActivityEvent[];
    hasMore: boolean;
    organizationId: string;
  } | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setOffset(0);
  }, [orgId]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResult(null);
    fetch(`/api/activity?offset=${offset}`, {
      cache: "no-store",
      headers: { "X-Tipit-Organization": orgId || "" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok)
          throw new Error(value.error || "Unable to load activity.");
        if (!controller.signal.aborted) setResult(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [orgId, offset, retry]);
  const visible = result?.organizationId === orgId ? result : null;
  return (
    <>
      <ActivityTable
        events={visible?.events || []}
        loading={loading}
        error={error}
      />
      <div className="actions">
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => setRetry((value) => value + 1)}
        >
          Refresh activity
        </button>
        <button
          className="button secondary"
          disabled={loading || offset === 0}
          onClick={() => setOffset((value) => Math.max(0, value - 50))}
        >
          Newer activity
        </button>
        <button
          className="button secondary"
          disabled={loading || !visible?.hasMore}
          onClick={() => setOffset((value) => value + 50)}
        >
          Older activity
        </button>
      </div>
    </>
  );
}
function ActivityTable({
  events,
  demo = false,
  loading = false,
  error = "",
}: {
  events: ActivityEvent[];
  demo?: boolean;
  loading?: boolean;
  error?: string;
}) {
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const filtered = events.filter(
    (event) =>
      (!action || event.action === action) &&
      `${event.actorName || event.actorId} ${event.targetName || event.targetId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading title="Activity history">
        Who changed restaurant details, employee profiles, and tags.{" "}
        {demo
          ? "Demo changes are saved in this browser only."
          : "Newest first, 50 records per page. Filters apply to the current page."}
      </Heading>
      <section className="panel">
        <div className="report-filters">
          <label>
            Search activity
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Person or target"
            />
          </label>
          <FilterSelect
            label="Activity action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            options={[
              { value: "", label: "All actions" },
              ...Object.entries(activityLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>
        {loading && (
          <p role="status" className="pad">
            Loading activity…
          </p>
        )}
        {error && (
          <p role="alert" className="pad">
            {error}
          </p>
        )}
        {!loading && !error && (
          <DataTable
            label="Activity history"
            rows={filtered}
            rowKey={(event) => event.id}
            emptyMessage="No activity matches. New changes will appear here."
            columns={[
              {
                key: "date",
                header: "When",
                cell: (event) => (
                  <time dateTime={event.createdAt}>
                    {formatDate(event.createdAt)}{" "}
                    {new Date(event.createdAt).toLocaleTimeString("en-ZA", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Africa/Johannesburg",
                    })}
                  </time>
                ),
              },
              {
                key: "actor",
                header: "Who",
                cell: (event) => event.actorName || event.actorId,
              },
              {
                key: "action",
                header: "Action",
                cell: (event) => activityLabels[event.action] || event.action,
              },
              {
                key: "target",
                header: "Target",
                cell: (event) => event.targetName || event.targetId,
              },
            ]}
          />
        )}
      </section>
    </>
  );
}
