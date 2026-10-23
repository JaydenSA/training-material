import { getPool } from "@/lib/db";
import { getStorageConfiguration } from "@/lib/storage-config";
import { getAuthConfiguration } from "@/lib/auth-config";
import { json } from "@/lib/api-response";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const storage = getStorageConfiguration();
    const auth = getAuthConfiguration();
    if (storage.invalid || auth.invalid || (storage.enabled && !auth.enabled))
      return json({ status: "unavailable" }, 503);
    if (storage.enabled) await getPool().query("SELECT 1");
    return json({ status: "ok" });
  } catch {
    return json({ status: "unavailable" }, 503);
  }
}
