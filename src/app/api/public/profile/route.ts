import { z } from "zod";
import { getPool } from "@/lib/db";
import { readPublicProfile } from "@/lib/db/workspace-repository";
import { apiError, json } from "@/lib/api-response";
import { getStorageConfiguration } from "@/lib/storage-config";
import { merchantFor, paymentMode } from "@/lib/integrations/yoco-config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!getStorageConfiguration().enabled)
    return json({ error: "Database profiles are not configured." }, 503);
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const slug = params.get("slug");
  const employeeId = params.get("employeeId");
  if (
    code
      ? !/^[a-zA-Z0-9-]{3,64}$/.test(code)
      : !slug ||
        slug.length > 100 ||
        !z.string().uuid().safeParse(employeeId).success
  )
    return json({ error: "Invalid tipping link." }, 400);
  try {
    const state = await readPublicProfile(
      getPool(),
      code ? { code } : { slug: slug!, employeeId: employeeId! },
    );
    let checkoutMode: "demo" | "test" | "live" = "demo";
    const mode = paymentMode();
    if (state && mode !== "demo") {
      const restaurant = (
        await getPool().query(
          "SELECT clerk_org_id FROM restaurants WHERE slug=$1 AND deleted_at IS NULL",
          [state.restaurant.slug],
        )
      ).rows[0];
      const merchant = restaurant ? merchantFor(restaurant.clerk_org_id) : null;
      if (mode === "live") checkoutMode = "live";
      else if (merchant?.mode === "test") checkoutMode = "test";
    }
    return state
      ? json({ state, paymentMode: checkoutMode })
      : json(
          {
            error: "This tipping link is no longer active.",
            code: "profile_unavailable",
          },
          404,
        );
  } catch (error) {
    return apiError(error);
  }
}
