"use client";
import { useEffect, useState } from "react";
import { Heading } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import type { TestingSnapshot, TestResult } from "@/lib/testing/types";

const coverage = [
  [
    "Management tools",
    "Review moderation, unchanged ratings and original text, owner/manager permissions, bulk tag rollback and QR ZIP downloads, operational alerts and employee comparisons.",
  ],
  [
    "Restaurant workspace",
    "Setup checklist, settings, employee create/edit/archive/restore, workspace version conflicts and tenant isolation.",
  ],
  [
    "Guest tipping and reviews",
    "Amount validation, simulated checkout, stars and text, duplicate review prevention, public profile and suspended tags.",
  ],
  [
    "Payments",
    "Checkout eligibility, idempotency, provider response validation, signed webhooks, event replay, receipt access and refunds using fixtures.",
  ],
  [
    "Dashboard",
    "Navigation, loading shells, transaction and ratings filters, reports, CSV exports, employee insights and activity.",
  ],
  [
    "Tags and hardware",
    "QR generation, active-only printable materials, archive suspension, hardware draft pricing and demo reset.",
  ],
  [
    "Access and presentation",
    "Signed-out restrictions, superuser policy, mobile navigation, print layout and public pages.",
  ],
];

export function Testing() {
  const [snapshot, setSnapshot] = useState<TestingSnapshot | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch("/api/testing", { cache: "no-store" });
        if (!response.ok)
          throw new Error(
            "Testing results are unavailable or access has expired.",
          );
        const data: TestingSnapshot = await response.json();
        if (active) {
          setSnapshot(data);
          timer = setTimeout(
            refresh,
            data.run?.status === "running" ? 2000 : 10000,
          );
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load tests.",
          );
      }
    }
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  async function start() {
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/testing", { method: "POST" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not start the test suite.");
      setSnapshot(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start the test suite.",
      );
    } finally {
      setStarting(false);
    }
  }
  const run = snapshot?.run;
  const results = run?.suites.flatMap((suite) => suite.tests) ?? [];
  return (
    <>
      <Heading eyebrow="SUPERUSER" title="Testing">
        Run functional checks against isolated fixtures and demo browser
        sessions.
      </Heading>
      <section className="panel pad">
        <h2>Functional test suite</h2>
        <p>
          Checks use an in-memory database and fresh browser sessions. They do
          not charge cards, send invitations or write to your restaurant
          database. Allow several minutes for a full run.
        </p>
        <button
          className="button"
          disabled={!snapshot?.enabled || starting || run?.status === "running"}
          onClick={start}
        >
          {starting || run?.status === "running"
            ? "Tests running…"
            : "Run all functional tests"}
        </button>
        {!snapshot && !error && <p role="status">Loading testing status…</p>}
        {snapshot && !snapshot.enabled && (
          <p>
            The runner is available on a local Node server with{" "}
            <code>TIPIT_TEST_RUNNER_ENABLED=true</code>. Run the CLI suite on
            hosted deployments; see the testing guide.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <div role="status" aria-live="polite">
          {run ? (
            <p>
              <strong>Run {run.status}.</strong>{" "}
              {results.filter((test) => test.status === "passed").length} passed
              · {results.filter((test) => test.status === "failed").length}{" "}
              failed ·{" "}
              {results.filter((test) => test.status === "skipped").length}{" "}
              skipped. Started {new Date(run.startedAt).toLocaleString("en-ZA")}
              .
              {run.finishedAt &&
                ` Finished ${new Date(run.finishedAt).toLocaleString("en-ZA")}.`}
            </p>
          ) : (
            <p>No run recorded in this server session yet.</p>
          )}
        </div>
      </section>
      {run?.suites.map((suite) => (
        <section className="panel pad" key={suite.name}>
          <h2>{suite.name}</h2>
          <p>
            Status: <strong>{suite.status}</strong>
            {suite.message && ` — ${suite.message}`}
          </p>
          <DataTable<TestResult>
            label={suite.name}
            rows={suite.tests}
            rowKey={(row) => row.name}
            columns={[
              { key: "name", header: "Test", cell: (row) => row.name },
              { key: "status", header: "Result", cell: (row) => row.status },
              {
                key: "duration",
                header: "Duration",
                cell: (row) => `${(row.duration / 1000).toFixed(1)}s`,
              },
            ]}
            emptyMessage={
              suite.status === "running"
                ? "Running checks…"
                : "Waiting for test results."
            }
          />
        </section>
      ))}
      <section className="panel pad">
        <h2>Coverage</h2>
        {coverage.map(([name, description]) => (
          <p key={name}>
            <strong>{name}:</strong> {description}
          </p>
        ))}
        <h3>External checks still required</h3>
        <p>
          Real Yoco transactions and settlement, live Clerk sign-in and team
          invitations, delivered NFC hardware, and subscription billing need
          separate provider or physical testing. These are not marked as passed
          by this suite.
        </p>
        <p>
          Results reset when the server restarts. Failures show test names here;
          detailed diagnostics remain in local Playwright output.
        </p>
      </section>
    </>
  );
}
