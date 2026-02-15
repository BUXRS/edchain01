import { NextResponse } from "next/server"

/** Minimal liveness check - no DB, no RPC. Use to confirm the app is reachable. */
export async function GET() {
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}
