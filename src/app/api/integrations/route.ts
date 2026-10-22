import { NextResponse } from "next/server";
import { getStorageConfiguration } from "@/lib/storage-config";
export async function GET() {
  return NextResponse.json(
    {
      mode: getStorageConfiguration().enabled ? "database" : "demo",
      payments: process.env.TIPIT_MODE === "live" ? "disabled" : "simulated",
      storage: getStorageConfiguration().enabled
        ? "postgresql"
        : "browser-local",
      liveReady: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
