/**
 * Backfill degrees table from degree_requests where status=ISSUED but no degree row exists.
 * Fixes issued degrees that never made it into the DB (e.g. indexer/DB down or projector skip).
 */

import { type NextRequest, NextResponse } from "next/server"
import { backfillIssuedDegrees } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { synced, errors } = await backfillIssuedDegrees()
    return NextResponse.json({
      ok: true,
      synced,
      errors: errors.length > 0 ? errors : undefined,
      message: synced > 0
        ? `Synced ${synced} issued degree(s) from degree_requests into degrees table.`
        : errors.length > 0
          ? "No degrees synced. Check errors."
          : "No missing issued degrees to sync.",
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }
  try {
    const { synced, errors } = await backfillIssuedDegrees()
    return NextResponse.json({ ok: true, synced, errors })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
