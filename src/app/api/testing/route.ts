import { requireTestingAccess } from "@/lib/testing/auth";
import { startTestingRun, testingSnapshot } from "@/lib/testing/runner";
import { json, apiError } from "@/lib/api-response";
import { HttpError } from "@/lib/http-error";
export const runtime = "nodejs";
export async function GET() {
  try {
    await requireTestingAccess();
    return json(testingSnapshot());
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    await requireTestingAccess();
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new HttpError(
        403,
        "invalid_origin",
        "Use the testing page to run checks.",
      );
    return json(startTestingRun(), 202);
  } catch (error) {
    return apiError(error);
  }
}
