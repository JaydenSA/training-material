import { NextResponse } from "next/server";
import { z } from "zod";
import { getStorageConfiguration } from "@/lib/storage-config";
const input = z
  .object({
    amount: z.number().int().min(500).max(1000000),
    employeeId: z.string().min(1).max(100),
    tagId: z.string().max(100).optional(),
  })
  .strict();
export async function POST(request: Request) {
  if (
    process.env.TIPIT_MODE === "live" ||
    getStorageConfiguration().invalid
  )
    return NextResponse.json(
      {
        error:
          "Live checkout is not enabled. Complete merchant onboarding, durable storage, and verified webhooks before switching from demo mode.",
      },
      { status: 503 },
    );
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 2048)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const parsed = input.safeParse(JSON.parse(body));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Choose a valid employee and a tip between R5 and R10,000." },
        { status: 400 },
      );
    return NextResponse.json(
      { mode: "demo", id: `demo-${crypto.randomUUID()}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid checkout request." },
      { status: 400 },
    );
  }
}
