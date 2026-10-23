import type { TestResult } from "./types";

type ReporterSuite = {
  title: string;
  suites?: ReporterSuite[];
  specs?: {
    title: string;
    tests: {
      results: { status: string; duration: number }[];
      expectedStatus: string;
    }[];
  }[];
};

/** Extract only display-safe test metadata; never return provider errors or logs. */
export function collectResults(
  suites: ReporterSuite[],
  prefix = "",
): TestResult[] {
  return suites.flatMap((suite) => {
    const name = [prefix, suite.title].filter(Boolean).join(" / ");
    return [
      ...(suite.specs ?? []).flatMap((spec) =>
        spec.tests.map((test) => {
          const result = test.results.at(-1);
          return {
            name: `${name} / ${spec.title}`,
            status:
              result?.status === "skipped"
                ? ("skipped" as const)
                : result?.status === "passed" &&
                    test.expectedStatus === "passed"
                  ? ("passed" as const)
                  : ("failed" as const),
            duration: result?.duration ?? 0,
          };
        }),
      ),
      ...collectResults(suite.suites ?? [], name),
    ];
  });
}

export function parseTestReport(stdout: string, processFailed: boolean) {
  const report = JSON.parse(stdout) as {
    suites: ReporterSuite[];
    errors?: unknown[];
  };
  const tests = collectResults(report.suites);
  const passed =
    !processFailed &&
    !report.errors?.length &&
    tests.length > 0 &&
    tests.every((test) => test.status === "passed");
  return { tests, status: passed ? ("passed" as const) : ("failed" as const) };
}
