/**
 * University Pending Requests
 *
 * Returns pending degree and revocation requests for the logged-in university only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql, getDbUniversityIdFromSessionId } from "@/lib/db"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

export async function GET(request: NextRequest) {
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) {
    return university
  }

  try {
    const dbUniversityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)

    const [degreeRequests, revocationRequests] = await Promise.all([
      sql`
        SELECT request_id, recipient_address, requester_address, student_name, student_name_ar,
               approval_count, required_approvals, status, created_at, created_tx_hash, token_id
        FROM degree_requests
        WHERE university_id = ${dbUniversityId} AND LOWER(status) IN ('pending', 'issued', 'rejected', 'expired')
        ORDER BY COALESCE(requested_at, created_at) DESC
        LIMIT 50
      `,
      sql`
        SELECT request_id, token_id, requester_address, approval_count, required_approvals, status, created_at, created_tx_hash
        FROM revocation_requests
        WHERE university_id = ${dbUniversityId} AND LOWER(status) IN ('pending', 'executed', 'rejected', 'expired')
        ORDER BY COALESCE(requested_at, created_at) DESC
        LIMIT 50
      `,
    ])

    const degreeList = degreeRequests ?? []
    const revocationList = revocationRequests ?? []
    const totalPendingDegree = degreeList.filter((r: { status?: string }) => String(r?.status).toLowerCase() === "pending").length
    const totalPendingRevocation = revocationList.filter((r: { status?: string }) => String(r?.status).toLowerCase() === "pending").length
    const totalPending = totalPendingDegree + totalPendingRevocation

    return NextResponse.json({
      degreeRequests: degreeList,
      revocationRequests: revocationList,
      totalPending,
      totalPendingDegree,
      totalPendingRevocation,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[UniversityPendingRequests] Error:", error)
    return NextResponse.json(
      { error: message, degreeRequests: [], revocationRequests: [], totalPending: 0 },
      { status: 500 }
    )
  }
}
