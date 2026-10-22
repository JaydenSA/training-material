import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ mode: 'demo', payments: 'simulated', storage: 'browser-local', liveReady: false }, { headers: { 'Cache-Control': 'no-store' } }); }
