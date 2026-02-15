/**
 * University-scoped suspend revoker.
 * Call after revoking on-chain (revokeRevoker). Updates DB: is_active = false, status = 'suspended'.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql, getDbUniversityIdFromSessionId } from "@/lib/db"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) return university

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { txHash } = body as { txHash?: string }

    if (!id) {
      return NextResponse.json({ error: "Revoker ID required" }, { status: 400 })
    }

    const universityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)
    const existing = await sql`
      SELECT id FROM revokers
      WHERE id = ${Number(id)} AND university_id = ${universityId}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "Revoker not found" }, { status: 404 })
    }

    await sql`
      UPDATE revokers
      SET is_active = false, status = 'suspended', tx_hash = COALESCE(${txHash ?? null}, tx_hash), updated_at = NOW()
      WHERE id = ${Number(id)} AND university_id = ${universityId}
    `

    return NextResponse.json({ success: true, message: "Revoker suspended" })
  } catch (error) {
    console.error("[UniversityRevokersSuspend] Error:", error)
    return NextResponse.json({ error: "Failed to suspend revoker" }, { status: 500 })
  }
}
