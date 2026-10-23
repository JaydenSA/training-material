import { NextResponse } from "next/server";
import { getStorageConfiguration } from "@/lib/storage-config";
import { paymentMode } from "@/lib/integrations/yoco-config";
export async function GET() {
  return NextResponse.json(
    {
      mode: getStorageConfiguration().enabled ? "database" : "demo",
      payments:
        paymentMode() === "demo"
          ? "simulated"
          : paymentMode() === "yoco_test"
            ? "yoco_test"
            : "yoco_live",
      storage: getStorageConfiguration().enabled
        ? "postgresql"
        : "browser-local",
      liveReady: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
