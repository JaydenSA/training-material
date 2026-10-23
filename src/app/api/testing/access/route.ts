import { canAccessTesting } from "@/lib/testing/auth";
import { json } from "@/lib/api-response";
export async function GET() {
  try {
    return json({ allowed: await canAccessTesting() });
  } catch {
    return json({ allowed: false });
  }
}
