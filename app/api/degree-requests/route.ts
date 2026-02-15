/**
 * Degree Requests API
 * Fetches pending degree requests that need verifier approval
 * ✅ BLOCKCHAIN FIRST: Enriches all data with blockchain state
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const universityId = searchParams.get("universityId")
    const universityBlockchainId = searchParams.get("universityBlockchainId")
    const statusParam = searchParams.get("status")
    const status = statusParam === "all" || statusParam === "" ? null : (statusParam || "pending")
    const requester = searchParams.get("requester")?.toLowerCase() // wallet: "my requests"

    console.log("[Degree Requests API] Query params:", { universityId, universityBlockchainId, status, requester })

    try {
      let dbUniversityId: number | null = null
      if (universityId) {
        dbUniversityId = Number(universityId)
      } else if (universityBlockchainId) {
        // Try to find by blockchain_id
        const row = await sql`SELECT id, blockchain_id FROM universities WHERE blockchain_id = ${Number(universityBlockchainId)} LIMIT 1`
        console.log("[Degree Requests API] Blockchain ID lookup:", { universityBlockchainId, found: row.length > 0, row: row[0] })
        
        if (row.length > 0) {
          dbUniversityId = Number(row[0].id)
        } else {
          // FALLBACK: If blockchain_id lookup fails, try using blockchain_id as database id
          // This handles cases where blockchain_id = database id (common in dev)
          console.log("[Degree Requests API] Blockchain ID not found, trying as database ID:", universityBlockchainId)
          const fallbackRow = await sql`SELECT id FROM universities WHERE id = ${Number(universityBlockchainId)} LIMIT 1`
          if (fallbackRow.length > 0) {
            dbUniversityId = Number(fallbackRow[0].id)
            console.log("[Degree Requests API] Found using database ID fallback:", dbUniversityId)
          }
        }
      }
      
      console.log("[Degree Requests API] Using dbUniversityId:", dbUniversityId)

      const fullRequests = await sql`
        SELECT 
          dr.*,
          u.name_en as university_name,
          u.name_ar as university_name_ar,
          u.blockchain_id as university_blockchain_id
        FROM degree_requests dr
        LEFT JOIN universities u ON dr.university_id = u.id
        WHERE 1=1
        ${status != null ? sql`AND LOWER(dr.status) = LOWER(${status})` : sql``}
        ${dbUniversityId != null ? sql`AND dr.university_id = ${dbUniversityId}` : sql``}
        ${requester ? sql`AND LOWER(dr.requester_address) = ${requester}` : sql``}
        ORDER BY COALESCE(dr.requested_at, dr.created_at) DESC
      `
      
      console.log("[Degree Requests API] Found", fullRequests.length, "requests")

      const requestIds = (fullRequests as any[]).map((r) => r.request_id).filter(Boolean)
      const approvalMap: Record<number, string[]> = {}
      if (requestIds.length > 0) {
        const approvals = await sql`
          SELECT request_id, LOWER(verifier_address) as verifier_address
          FROM degree_request_approvals
          WHERE request_id = ANY(${requestIds})
        `
        for (const a of approvals as { request_id: number; verifier_address: string }[]) {
          if (!approvalMap[a.request_id]) approvalMap[a.request_id] = []
          approvalMap[a.request_id].push(a.verifier_address)
        }
      }

      // Get sync metadata
      const syncStatus = await sql`
        SELECT last_synced_block, finalized_block, sync_mode, updated_at
        FROM sync_status WHERE id = 1
      `.then(r => r[0] || null).catch(() => null)

      return NextResponse.json({ 
        requests: fullRequests.map((req: any) => ({
          id: req.id,
          request_id: req.request_id,
          university_id: req.university_id,
          university_blockchain_id: req.university_blockchain_id,
          recipient_address: req.recipient_address,
          requester_address: req.requester_address,
          gpa: req.gpa,
          year: req.year,
          approval_count: req.approval_count ?? 0,
          required_approvals: req.required_approvals ?? 0,
          status: req.status,
          student_name: req.student_name,
          student_name_ar: req.student_name_ar,
          faculty_en: req.faculty_en,
          faculty_ar: req.faculty_ar,
          major_en: req.major_en,
          major_ar: req.major_ar,
          degree_name_en: req.degree_name_en,
          degree_name_ar: req.degree_name_ar,
          name_en: req.name_en,
          name_ar: req.name_ar,
          created_at: req.created_at,
          requested_at: req.requested_at,
          created_tx_hash: req.created_tx_hash,
          executed_at: req.executed_at,
          token_id: req.token_id,
          university_name: req.university_name,
          university_name_ar: req.university_name_ar,
          approvalProgress: `${req.approval_count ?? 0} / ${req.required_approvals ?? 0}`,
          approved_by: approvalMap[req.request_id] ?? [],
        })),
        source: "database",
        sync: {
          lastSyncedBlock: syncStatus?.last_synced_block || 0,
          finalizedBlock: syncStatus?.finalized_block || 0,
          syncedAt: syncStatus?.updated_at || null,
          syncMode: syncStatus?.sync_mode || "unknown",
        },
        note: "✅ DB-FIRST: Data from database (synced from blockchain events). Use /api/verify/degree-request/:requestId for on-chain verification."
      })
    } catch (error) {
      console.error("Error fetching degree requests:", error)
      return NextResponse.json({ 
        error: "Failed to fetch degree requests",
        requests: [],
        note: "Database unavailable. Requests must be synced from blockchain events."
      })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch degree requests",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
