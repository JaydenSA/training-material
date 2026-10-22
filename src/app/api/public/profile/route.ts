import { z } from "zod";
import { getPool } from "@/lib/db";
import { readPublicProfile } from "@/lib/db/workspace-repository";
import { apiError, json } from "@/lib/api-response";
import { getStorageConfiguration } from "@/lib/storage-config";
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
    return state
      ? json({ state })
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
