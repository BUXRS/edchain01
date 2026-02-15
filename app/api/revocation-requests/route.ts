/**
 * Revocation Requests API
 * Fetches pending revocation requests that need verifier approval
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
    const requester = searchParams.get("requester")?.toLowerCase()

    try {
      let dbUniversityId: number | null = null
      if (universityId) {
        dbUniversityId = Number(universityId)
      } else if (universityBlockchainId) {
        // Try to find by blockchain_id
        const row = await sql`SELECT id FROM universities WHERE blockchain_id = ${Number(universityBlockchainId)} LIMIT 1`
        
        if (row.length > 0) {
          dbUniversityId = Number(row[0].id)
        } else {
          // FALLBACK: Try using blockchain_id as database id
          const fallbackRow = await sql`SELECT id FROM universities WHERE id = ${Number(universityBlockchainId)} LIMIT 1`
          if (fallbackRow.length > 0) {
            dbUniversityId = Number(fallbackRow[0].id)
          }
        }
      }

      const fullRequests = await sql`
        SELECT 
          rr.*,
          u.name_en as university_name,
          u.name_ar as university_name_ar,
          u.blockchain_id as university_blockchain_id
        FROM revocation_requests rr
        LEFT JOIN universities u ON rr.university_id = u.id
        WHERE 1=1
        ${status != null ? sql`AND LOWER(rr.status) = LOWER(${status})` : sql``}
        ${dbUniversityId != null ? sql`AND rr.university_id = ${dbUniversityId}` : sql``}
        ${requester ? sql`AND LOWER(rr.requester_address) = ${requester}` : sql``}
        ORDER BY COALESCE(rr.requested_at, rr.created_at) DESC
      `

      const requestIds = (fullRequests as any[]).map((r) => r.request_id).filter(Boolean)
      const approvalMap: Record<number, string[]> = {}
      if (requestIds.length > 0) {
        const approvals = await sql`
          SELECT request_id, LOWER(verifier_address) as verifier_address
          FROM revocation_request_approvals
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
          token_id: req.token_id,
          university_id: req.university_id,
          university_blockchain_id: req.university_blockchain_id,
          requester_address: req.requester_address,
          approval_count: req.approval_count ?? 0,
          required_approvals: req.required_approvals ?? 0,
          status: req.status,
          created_at: req.created_at,
          requested_at: req.requested_at,
          created_tx_hash: req.created_tx_hash,
          executed_at: req.executed_at,
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
        note: "✅ DB-FIRST: Data from database (synced from blockchain events). Use /api/verify/revocation-request/:requestId for on-chain verification."
      })
    } catch (error) {
      console.error("Error fetching revocation requests:", error)
      return NextResponse.json({ 
        error: "Failed to fetch revocation requests",
        requests: [],
        note: "Database unavailable. Requests must be synced from blockchain events."
      })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch revocation requests",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
