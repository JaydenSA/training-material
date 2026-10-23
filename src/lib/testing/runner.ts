import "server-only";
import { execFile } from "node:child_process";
import path from "node:path";
import { getAuthConfiguration } from "@/lib/auth-config";
import { HttpError } from "@/lib/http-error";
import type { TestRun, TestSuite } from "./types";
import { parseTestReport } from "./report";

// Process-local state deliberately contains no logs, keys, emails or restaurant data.
const testing = globalThis as typeof globalThis & { tipitTestRun?: TestRun };

export function testingRunnerEnabled() {
  return (
    process.env.TIPIT_TEST_RUNNER_ENABLED === "true" && !process.env.VERCEL
  );
}

export function testingSnapshot() {
  return { enabled: testingRunnerEnabled(), run: testing.tipitTestRun ?? null };
}

async function executeSuite(suite: TestSuite, config: string, baseURL: string) {
  suite.status = "running";
  await new Promise<void>((resolve) => {
    execFile(
      process.execPath,
      [
        path.join(process.cwd(), "node_modules/@playwright/test/cli.js"),
        "test",
        `--config=${config}`,
        "--reporter=json",
        `--output=test-results/testing-console/${config.includes("db") ? "database" : "browser"}`,
      ],
      {
        cwd: process.cwd(),
        timeout: 300_000,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        env: {
          ...process.env,
          FORCE_COLOR: "0",
          PLAYWRIGHT_BASE_URL: baseURL,
          CLERK_TEST_LIVE: getAuthConfiguration().enabled ? "1" : "0",
        },
      },
      (error, stdout) => {
        try {
          Object.assign(suite, parseTestReport(stdout, Boolean(error)));
          if (suite.status === "failed")
            suite.message =
              "Checks failed or were skipped. Run the CLI suite locally for detailed diagnostics.";
        } catch {
          suite.status = "failed";
          suite.message =
            "The runner could not produce a report. Check the local installation, browser and server, then use the CLI for diagnostics.";
        }
        resolve();
      },
    );
  });
}

export function startTestingRun() {
  if (!testingRunnerEnabled())
    throw new HttpError(
      409,
      "runner_disabled",
      "The local test runner is disabled on this deployment.",
    );
  if (testing.tipitTestRun?.status === "running")
    throw new HttpError(
      409,
      "run_in_progress",
      "A test run is already in progress.",
    );
  if (
    testing.tipitTestRun?.finishedAt &&
    Date.now() - Date.parse(testing.tipitTestRun.finishedAt) < 30_000
  )
    throw new HttpError(
      429,
      "runner_cooldown",
      "Wait 30 seconds before running the suite again.",
    );
  const baseURL = process.env.TIPIT_TEST_BASE_URL || "http://localhost:3001";
  const target = new URL(baseURL);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
    target.protocol !== "http:" ||
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.search ||
    target.hash
  )
    throw new HttpError(
      409,
      "invalid_test_target",
      "Testing must target this local application over HTTP.",
    );
  const run: TestRun = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    status: "running",
    suites: [
      {
        name: "Database, tenant isolation and payment adapters",
        status: "queued",
        tests: [],
      },
      {
        name: "Browser workflows, helpers and access controls",
        status: "queued",
        tests: [],
      },
    ],
  };
  testing.tipitTestRun = run;
  // Only predefined, fixture-based suites are executable. No request value is a command.
  void (async () => {
    try {
      await executeSuite(run.suites[0], "playwright.db.config.ts", baseURL);
      await executeSuite(run.suites[1], "playwright.config.ts", baseURL);
      run.status = run.suites.every((suite) => suite.status === "passed")
        ? "passed"
        : "failed";
    } catch {
      run.status = "failed";
    } finally {
      run.finishedAt = new Date().toISOString();
    }
  })();
  return testingSnapshot();
}
