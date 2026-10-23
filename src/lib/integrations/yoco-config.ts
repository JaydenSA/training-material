import "server-only";
import { z } from "zod";
import { HttpError } from "../http-error";
const merchantSchema = z
  .object({
    secretKey: z.string().regex(/^sk_(test|live)_\S+$/),
    webhookSecret: z.string().startsWith("whsec_"),
  })
  .strict();
export function paymentMode() {
  const mode = process.env.TIPIT_MODE || "demo";
  if (!["demo", "yoco_test", "live"].includes(mode))
    throw new HttpError(
      503,
      "payment_configuration",
      "Payment configuration is invalid.",
    );
  return mode as "demo" | "yoco_test" | "live";
}
export function merchantFor(organizationId: string) {
  let parsed;
  try {
    parsed = JSON.parse(process.env.YOCO_MERCHANTS_JSON || "{}");
  } catch {
    throw new HttpError(
      503,
      "payment_configuration",
      "Merchant configuration is invalid.",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new HttpError(
      503,
      "payment_configuration",
      "Merchant configuration is invalid.",
    );
  if (!Object.hasOwn(parsed, organizationId)) return null;
  const merchant = merchantSchema.safeParse(parsed[organizationId]);
  if (!merchant.success)
    throw new HttpError(
      503,
      "payment_configuration",
      "This restaurant's Yoco credentials are incomplete.",
    );
  return {
    ...merchant.data,
    mode: merchant.data.secretKey.startsWith("sk_test_")
      ? ("test" as const)
      : ("live" as const),
  };
}
export function appBaseUrl() {
  const base = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
  );
  if (
    base.username ||
    base.password ||
    (base.protocol !== "https:" &&
      !(base.protocol === "http:" && base.hostname === "localhost"))
  )
    throw new HttpError(
      503,
      "payment_configuration",
      "Configure an HTTPS application URL before enabling Yoco.",
    );
  return base.origin;
}
