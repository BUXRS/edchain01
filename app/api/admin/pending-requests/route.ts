/**
 * Pending Requests Endpoint
 * 
 * Returns pending degree and revocation requests requiring action
 * Grouped by university
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function GET(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }
  try {
    // Get pending degree requests grouped by university
    // ✅ FIX: Use u.name directly since name_en column doesn't exist in database
    const pendingDegreeRequests = await sql`
      SELECT 
        dr.*,
        u.name as university_name,
        u.name_ar as university_name_ar,
        u.blockchain_id as university_blockchain_id
      FROM degree_requests dr
      LEFT JOIN universities u ON dr.university_id = u.id
      WHERE dr.status = 'pending'
      ORDER BY dr.created_at DESC
      LIMIT 50
    `

    // Get pending revocation requests grouped by university
    // ✅ FIX: Use u.name directly since name_en column doesn't exist in database
    const pendingRevocationRequests = await sql`
      SELECT 
        rr.*,
        u.name as university_name,
        u.name_ar as university_name_ar,
        u.blockchain_id as university_blockchain_id
      FROM revocation_requests rr
      LEFT JOIN universities u ON rr.university_id = u.id
      WHERE rr.status = 'pending'
      ORDER BY rr.created_at DESC
      LIMIT 50
    `

    // Group by university
    const groupedByUniversity: Record<number, {
      universityId: number
      universityName: string
      universityNameAr?: string
      blockchainId?: number
      degreeRequests: any[]
      revocationRequests: any[]
    }> = {}

    pendingDegreeRequests.forEach((req: any) => {
      const uniId = req.university_id
      if (!groupedByUniversity[uniId]) {
        groupedByUniversity[uniId] = {
          universityId: uniId,
          universityName: req.university_name || `University #${uniId}`,
          universityNameAr: req.university_name_ar,
          blockchainId: req.university_blockchain_id,
          degreeRequests: [],
          revocationRequests: [],
        }
      }
      groupedByUniversity[uniId].degreeRequests.push({
        requestId: req.request_id,
        recipientAddress: req.recipient_address,
        studentName: req.student_name,
        approvalCount: req.approval_count || 0,
        requiredApprovals: req.required_approvals || 0,
        createdAt: req.created_at || req.requested_at,
      })
    })

    pendingRevocationRequests.forEach((req: any) => {
      const uniId = req.university_id
      if (!groupedByUniversity[uniId]) {
        groupedByUniversity[uniId] = {
          universityId: uniId,
          universityName: req.university_name || `University #${uniId}`,
          universityNameAr: req.university_name_ar,
          blockchainId: req.university_blockchain_id,
          degreeRequests: [],
          revocationRequests: [],
        }
      }
      groupedByUniversity[uniId].revocationRequests.push({
        requestId: req.request_id,
        tokenId: req.token_id,
        requesterAddress: req.requester_address,
        approvalCount: req.approval_count || 0,
        requiredApprovals: req.required_approvals || 0,
        createdAt: req.created_at,
      })
    })

    return NextResponse.json({
      grouped: Object.values(groupedByUniversity),
      totalPending: {
        degreeRequests: pendingDegreeRequests.length,
        revocationRequests: pendingRevocationRequests.length,
        total: pendingDegreeRequests.length + pendingRevocationRequests.length,
      },
    })
  } catch (error: any) {
    console.error("[PendingRequests] Error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to get pending requests",
        grouped: [],
        totalPending: { degreeRequests: 0, revocationRequests: 0, total: 0 },
      },
      { status: 500 }
    )
  }
}
