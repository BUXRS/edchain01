/**
 * University-scoped reactivate issuer.
 * Call after adding the issuer back on-chain (grantIssuer). Updates DB: is_active = true, status = 'active'.
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
      return NextResponse.json({ error: "Issuer ID required" }, { status: 400 })
    }

    const universityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)
    const existing = await sql`
      SELECT id, university_id FROM issuers
      WHERE id = ${Number(id)} AND university_id = ${universityId}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 })
    }

    await sql`
      UPDATE issuers
      SET is_active = true, status = 'active', tx_hash = COALESCE(${txHash ?? null}, tx_hash), blockchain_verified = true, updated_at = NOW()
      WHERE id = ${Number(id)} AND university_id = ${universityId}
    `

    return NextResponse.json({ success: true, message: "Issuer reactivated" })
  } catch (error) {
    console.error("[UniversityIssuersReactivate] Error:", error)
    return NextResponse.json({ error: "Failed to reactivate issuer" }, { status: 500 })
  }
}
