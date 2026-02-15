/**
 * University-scoped issuer: DELETE = soft delete (is_active = false, status = 'inactive').
 * Call after revoking on-chain if the issuer was active.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql, getDbUniversityIdFromSessionId } from "@/lib/db"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) return university

  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Issuer ID required" }, { status: 400 })
    }

    const universityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)
    const existing = await sql`
      SELECT id FROM issuers
      WHERE id = ${Number(id)} AND university_id = ${universityId}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 })
    }

    await sql`
      UPDATE issuers
      SET is_active = false, status = 'inactive', updated_at = NOW()
      WHERE id = ${Number(id)} AND university_id = ${universityId}
    `

    return NextResponse.json({ success: true, message: "Issuer removed" })
  } catch (error) {
    console.error("[UniversityIssuersDelete] Error:", error)
    return NextResponse.json({ error: "Failed to remove issuer" }, { status: 500 })
  }
}
