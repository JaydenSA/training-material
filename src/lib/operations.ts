export type OperationsSnapshot = {
  mode: string;
  configured: boolean;
  credentialMatch: boolean;
  configurationError: boolean;
  lastWebhook: string | null;
  liveFailed: number;
  testFailed: number;
  livePending: number;
  testPending: number;
  checkedAt: string;
  sample: boolean;
};
export type OperationAlert = {
  id: string;
  severity: "warning" | "info";
  title: string;
  detail: string;
  href: string;
};
export function operationAlerts(value: OperationsSnapshot): OperationAlert[] {
  const alerts: OperationAlert[] = [];
  if (value.configurationError)
    alerts.push({
      id: "configuration",
      severity: "warning",
      title: "Payment configuration needs attention",
      detail:
        "Merchant settings are invalid or incomplete. Review server configuration before accepting payments.",
      href: "/dashboard/settings#payments",
    });
  else if (value.mode === "demo")
    alerts.push({
      id: "demo",
      severity: "info",
      title: "Payments are simulated",
      detail:
        "Checkout does not collect money in the selected mode. Configure and verify your restaurant’s Yoco account before enabling real payments.",
      href: "/dashboard/settings#payments",
    });
  else if (!value.configured || !value.credentialMatch)
    alerts.push({
      id: "merchant",
      severity: "warning",
      title: "Payment account is not ready",
      detail:
        "Restaurant credentials are missing or do not match the selected payment mode.",
      href: "/dashboard/settings#payments",
    });
  for (const [mode, failed, pending] of [
    ["Live", value.liveFailed, value.livePending],
    ["Test", value.testFailed, value.testPending],
  ] as const) {
    const label = value.sample ? "Demo" : mode;
    if (failed)
      alerts.push({
        id: `${mode}-failed`,
        severity: "warning",
        title: `${failed} failed ${label.toLowerCase()} checkout${failed === 1 ? "" : "s"}`,
        detail:
          "Recorded in the last 24 hours. Review transaction references; do not assume a retry was charged.",
        href: "/dashboard/tips",
      });
    if (pending)
      alerts.push({
        id: `${mode}-pending`,
        severity: "warning",
        title: `${pending} ${label.toLowerCase()} payment confirmation${pending === 1 ? "" : "s"} delayed`,
        detail:
          "Pending for over 30 minutes. Check the provider and webhook delivery before taking further action. A delay alone does not prove webhook failure.",
        href: "/dashboard/settings#payments",
      });
  }
  return alerts;
}
