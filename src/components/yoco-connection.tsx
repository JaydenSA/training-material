"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Badge } from "@/components/ui";
type Status = {
  organizationId: string;
  configured: boolean;
  enabled: boolean;
  mode: string;
  credentialMode: string | null;
  webhookUrl: string | null;
};
export function YocoConnection() {
  const { orgId } = useAuth();
  const [result, setResult] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    fetch("/api/yoco/status", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok)
          throw new Error(value.error || "Unable to check Yoco connection.");
        if (!controller.signal.aborted) setResult(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [orgId, retry]);
  const visible = result?.organizationId === orgId ? result : null;
  return (
    <>
      <Badge muted={!visible?.enabled}>
        {!visible
          ? "Checking connection…"
          : visible.enabled
            ? visible.credentialMode === "test"
              ? "Yoco test connected"
              : "Yoco live connected"
            : "Demo payments"}
      </Badge>
      <h3>Your restaurant’s Yoco account</h3>
      <p>
        Payments use this restaurant’s merchant credentials. Restaurant
        management handles staff distribution and processing fees.
      </p>
      {error && <p role="alert">{error}</p>}
      {visible && !visible.enabled && (
        <p>
          {visible.configured
            ? "Credentials are configured, but the selected payment mode is not enabled for them."
            : "Create a Yoco account and configure Checkout API test credentials to start testing. Until then, checkout remains a demo."}
        </p>
      )}
      {visible && (
        <>
          <label>
            Restaurant workspace ID
            <input readOnly value={visible.organizationId} />
          </label>
          {visible.webhookUrl && (
            <label>
              Webhook URL
              <input readOnly value={visible.webhookUrl} />
            </label>
          )}
        </>
      )}
      <p>
        Merchant credentials are configured on the server. Start with test keys
        before enabling real payments.
      </p>
      <div className="actions">
        <a
          className="button secondary"
          href="https://www.yoco.com/za/"
          target="_blank"
          rel="noreferrer"
        >
          Open Yoco
        </a>
        <button
          className="button secondary"
          onClick={() => setRetry((n) => n + 1)}
        >
          Refresh connection
        </button>
      </div>
    </>
  );
}
