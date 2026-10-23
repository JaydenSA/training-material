import nextEnv from "@next/env";
import pg from "pg";
import { readFile, writeFile } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());
class SetupError extends Error {}
const organizationId = process.argv[2];
let pool;
try {
  if (!/^org_[a-zA-Z0-9]+$/.test(organizationId || ""))
    throw new SetupError(
      "Pass the restaurant workspace ID shown in Settings > Payments.",
    );
  const merchants = JSON.parse(process.env.YOCO_MERCHANTS_JSON || "{}");
  const merchant = merchants[organizationId];
  if (!merchant?.secretKey?.startsWith("sk_test_"))
    throw new SetupError(
      "This setup command requires a restaurant-specific Yoco test key in YOCO_MERCHANTS_JSON.",
    );
  const base = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
  );
  if (
    base.protocol !== "https:" ||
    base.hostname === "localhost" ||
    base.username ||
    base.password
  )
    throw new SetupError(
      "Set NEXT_PUBLIC_APP_URL to your publicly reachable HTTPS deployment or tunnel URL first.",
    );
  // Read the file before registering: the one-time secret must have a writable destination.
  const path = ".env.local";
  const source = await readFile(path, "utf8");
  if (!process.env.DATABASE_URL)
    throw new SetupError("DATABASE_URL is required.");
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10000,
  });
  const restaurant = (
    await pool.query(
      "SELECT id FROM restaurants WHERE clerk_org_id=$1 AND deleted_at IS NULL",
      [organizationId],
    )
  ).rows[0];
  if (!restaurant)
    throw new SetupError(
      "Complete restaurant onboarding before registering its webhook.",
    );
  const url = `${base.origin}/api/webhooks/yoco?restaurant=${restaurant.id}`;
  const headers = {
    Authorization: `Bearer ${merchant.secretKey}`,
    "Content-Type": "application/json",
  };
  const listing = await fetch("https://payments.yoco.com/api/webhooks", {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!listing.ok)
    throw new SetupError(
      `Yoco could not list webhooks (HTTP ${listing.status}).`,
    );
  const existing = await listing.json();
  if (!Array.isArray(existing.subscriptions))
    throw new SetupError("Yoco returned an unexpected webhook list.");
  if (existing.subscriptions.some((entry) => entry.url === url)) {
    if (!merchant.webhookSecret?.startsWith("whsec_"))
      throw new SetupError(
        "This webhook already exists, but its signing secret is missing locally. Restore the original secret; Yoco only returns it once.",
      );
    console.log(
      "The restaurant webhook is already registered. No duplicate was created.",
    );
  } else {
    const response = await fetch("https://payments.yoco.com/api/webhooks", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: `Tipit test ${organizationId}`, url }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new SetupError(
        `Yoco webhook registration failed (HTTP ${response.status}).`,
      );
    const result = await response.json();
    if (
      result.mode !== "test" ||
      typeof result.secret !== "string" ||
      !result.secret.startsWith("whsec_")
    )
      throw new SetupError(
        "Yoco did not return a valid test webhook signing secret.",
      );
    merchants[organizationId] = {
      secretKey: merchant.secretKey,
      webhookSecret: result.secret,
    };
    const line = `YOCO_MERCHANTS_JSON='${JSON.stringify(merchants)}'`;
    const updated = /^YOCO_MERCHANTS_JSON=.*$/m.test(source)
      ? source.replace(/^YOCO_MERCHANTS_JSON=.*$/m, () => line)
      : `${source}\n${line}\n`;
    await writeFile(path, updated, { mode: 0o600 });
    console.log(
      "Test webhook registered. The signing secret was saved directly to .env.local without being displayed.",
    );
  }
} catch (error) {
  // Never print provider response bodies or database connection details.
  console.error(
    error instanceof SetupError
      ? error.message
      : "Setup failed. Check the local configuration, file permissions and network connection. No credentials were displayed.",
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
