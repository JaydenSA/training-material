import { NextResponse } from 'next/server';
// Fail closed: never acknowledge a financial event until durable, tenant-scoped
// processing is wired. A 503 lets the provider retry instead of losing events.
export async function POST() {
  return NextResponse.json({ error: 'Webhook persistence is not configured. No payment state has been changed.' }, { status: 503 });
}
