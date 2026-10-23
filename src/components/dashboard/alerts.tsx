"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "@/components/app-link";
import { useWorkspace } from "@/components/workspace-context";
import { Badge, Heading } from "@/components/ui";
import { operationAlerts, type OperationsSnapshot } from "@/lib/operations";
import { formatDate } from "@/lib/format";
export function OperationalAlerts() {
  const { state, mode } = useWorkspace();
  if (mode === "database") return <ConnectedAlerts />;
  const now = Date.now();
  const value: OperationsSnapshot = {
    mode: "demo",
    configured: false,
    credentialMatch: false,
    configurationError: false,
    lastWebhook: null,
    liveFailed: state.tips.filter(
      (tip) =>
        tip.status === "failed" && Date.parse(tip.createdAt) >= now - 86400000,
    ).length,
    testFailed: 0,
    livePending: state.tips.filter(
      (tip) =>
        tip.status === "pending" && Date.parse(tip.createdAt) < now - 1800000,
    ).length,
    testPending: 0,
    sample: true,
    checkedAt: new Date().toISOString(),
  };
  return <AlertView value={value} />;
}
function ConnectedAlerts() {
  const { orgId } = useAuth();
  const [snapshot, setSnapshot] = useState<
    (OperationsSnapshot & { organizationId: string }) | null
  >(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setSnapshot(null);
    setError("");
    setLoading(true);
    async function refresh() {
      if (!orgId || document.hidden) return;
      try {
        const response = await fetch("/api/operations", {
          cache: "no-store",
          headers: { "X-Tipit-Organization": orgId },
          signal: controller.signal,
        });
        const value = await response.json();
        if (!response.ok || value.organizationId !== orgId)
          throw new Error(value.error || "Operational status is unavailable.");
        if (!controller.signal.aborted) {
          setSnapshot(value);
          setError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setSnapshot(null);
          setError(
            cause instanceof Error
              ? cause.message
              : "Operational status is unavailable.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void refresh();
    const interval = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [orgId, retry]);
  return (
    <AlertView
      value={snapshot?.organizationId === orgId ? snapshot : null}
      error={error}
      loading={loading}
      refresh={() => setRetry((value) => value + 1)}
    />
  );
}
function AlertView({
  value,
  error,
  loading,
  refresh,
}: {
  value: OperationsSnapshot | null;
  error?: string;
  loading?: boolean;
  refresh?: () => void;
}) {
  const alerts = value ? operationAlerts(value) : [];
  return (
    <>
      <Heading
        title="Operational alerts"
        action={
          refresh && (
            <button className="button secondary" onClick={refresh}>
              Refresh alerts
            </button>
          )
        }
      >
        Payment setup and recorded checkout outcomes that need your attention.
      </Heading>
      <section className="panel pad operational-summary">
        <h2>Connection and delivery status</h2>
        {loading && <p role="status">Checking operational status…</p>}
        {error && (
          <p role="alert">{error} No healthy status has been assumed.</p>
        )}
        {value && (
          <>
            <Badge muted>
              {value.sample
                ? "Demo records"
                : value.mode === "demo"
                  ? "Simulated payments"
                  : value.mode === "live"
                    ? "Live mode"
                    : "Test mode"}
            </Badge>
            <p>
              Last checked:{" "}
              {formatDate(value.checkedAt, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>
              Last verified webhook received:{" "}
              {value.lastWebhook
                ? formatDate(value.lastWebhook, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "None recorded"}
              .
            </p>
            <p>
              These signals use saved records and configuration. They do not
              contact Yoco to validate credentials or prove webhook delivery.
              Connected status refreshes every 30 seconds while this page is
              visible. No emails or external notifications are sent.
            </p>
          </>
        )}
      </section>
      <section aria-label="Current operational alerts">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={`panel pad operation-alert operation-${alert.severity}`}
          >
            <Badge muted={alert.severity === "info"}>
              {alert.severity === "warning" ? "Needs attention" : "Information"}
            </Badge>
            <h2>{alert.title}</h2>
            <p>{alert.detail}</p>
            <Link className="button secondary small" href={alert.href}>
              Review details
            </Link>
          </article>
        ))}
        {value && !alerts.length && (
          <div className="panel pad">
            <p>
              No alerts from the available records. This is not a live provider
              health check.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
