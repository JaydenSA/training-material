export type TestResult = {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
};
export type TestSuite = {
  name: string;
  status: "queued" | "running" | "passed" | "failed";
  tests: TestResult[];
  message?: string;
};
export type TestRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "passed" | "failed";
  suites: TestSuite[];
};
export type TestingSnapshot = { enabled: boolean; run: TestRun | null };
