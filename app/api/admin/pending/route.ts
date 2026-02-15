/**
 * Admin Pending Actions Endpoint
 * 
 * Returns unified feed of pending degree requests, revocation requests, and optional pending transactions
 * All data from DB projection (blockchain is source of truth, DB is derived)
 * Supports filtering, pagination, sorting
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  endDate.setUTCHours(23, 59, 59, 999)
  
  let startDate = new Date()
  
  switch (range) {
    case "7d":
      startDate.setUTCDate(endDate.getUTCDate() - 7)
      break
    case "30d":
      startDate.setUTCDate(endDate.getUTCDate() - 30)
      break
    case "90d":
      startDate.setUTCDate(endDate.getUTCDate() - 90)
      break
    case "all":
      startDate = new Date(0)
      break
    default:
      startDate.setUTCDate(endDate.getUTCDate() - 30)
  }
  
  startDate.setUTCHours(0, 0, 0, 0)
  
  return { startDate, endDate }
}

export async function GET(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "30d"
    const universityId = searchParams.get("universityId")
    const type = searchParams.get("type") // "degree" | "revocation" | "tx" | null (all)
    const status = searchParams.get("status") || "pending"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10)
    const sort = searchParams.get("sort") || "created_at_desc" // "created_at_desc" | "created_at_asc" | "approval_progress_desc"
    const search = searchParams.get("search") || ""

    // Determine date range
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    let startDate: Date
    let endDate: Date
    
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
      startDate.setUTCHours(0, 0, 0, 0)
      endDate.setUTCHours(23, 59, 59, 999)
    } else {
      const rangeDates = getDateRange(range)
      startDate = rangeDates.startDate
      endDate = rangeDates.endDate
    }

    const offset = (page - 1) * pageSize

    // Parse sort
    const [sortField, sortOrder] = sort.split("_")
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC"

    // Build results array
    let results: any[] = []

    // Helper to build WHERE clause for degree requests
    const buildDegreeWhere = () => {
      // Build WHERE clause using conditional fragments (postgres doesn't have sql.join)
      let whereClause = sql`WHERE dr.status = ${status} AND dr.created_at >= ${startDate} AND dr.created_at <= ${endDate}`
      
      if (universityId) {
        whereClause = sql`${whereClause} AND dr.university_id = ${Number(universityId)}`
      }
      
      if (search) {
        whereClause = sql`${whereClause} AND (
          CAST(dr.request_id AS TEXT) ILIKE ${`%${search}%`} OR
          dr.recipient_address ILIKE ${`%${search}%`} OR
          dr.requester_address ILIKE ${`%${search}%`} OR
          dr.student_name ILIKE ${`%${search}%`}
        )`
      }
      
      return whereClause
    }

    // Helper to build WHERE clause for revocation requests
    const buildRevocationWhere = () => {
      // Build WHERE clause using conditional fragments (postgres doesn't have sql.join)
      let whereClause = sql`WHERE rr.status = ${status} AND rr.created_at >= ${startDate} AND rr.created_at <= ${endDate}`
      
      if (universityId) {
        whereClause = sql`${whereClause} AND rr.university_id = ${Number(universityId)}`
      }
      
      if (search) {
        whereClause = sql`${whereClause} AND (
          CAST(rr.request_id AS TEXT) ILIKE ${`%${search}%`} OR
          rr.requester_address ILIKE ${`%${search}%`} OR
          CAST(rr.token_id AS TEXT) ILIKE ${`%${search}%`}
        )`
      }
      
      return whereClause
    }

    // Fetch pending degree requests
    if (!type || type === "degree") {
      const degreeWhere = buildDegreeWhere()
      // When type is "all", fetch pageSize from each to combine and sort
      const limit = type === "degree" ? pageSize : pageSize
      const degreeOffset = type === "degree" ? offset : 0

      const degreeRequests = await sql`
        SELECT 
          dr.*,
          u.name as university_name,
          u.name_ar as university_name_ar,
          u.blockchain_id as university_blockchain_id,
          COALESCE(dr.approval_count, 0) as approvals_received,
          COALESCE(dr.required_approvals, 0) as approvals_required,
          CASE 
            WHEN COALESCE(dr.required_approvals, 0) = 0 THEN 0
            ELSE ROUND((COALESCE(dr.approval_count, 0)::numeric / dr.required_approvals::numeric) * 100, 2)
          END as approval_progress
        FROM degree_requests dr
        LEFT JOIN universities u ON dr.university_id = u.id
        ${degreeWhere}
        ORDER BY dr.created_at ${sql.unsafe(safeSortOrder)}
        LIMIT ${limit}
        OFFSET ${degreeOffset}
      `

      for (const req of degreeRequests) {
        results.push({
          itemType: "degree",
          id: req.request_id,
          dbId: req.id,
          universityId: req.university_id,
          universityName: req.university_name || `University #${req.university_id}`,
          universityNameAr: req.university_name_ar,
          universityBlockchainId: req.university_blockchain_id,
          recipientAddress: req.recipient_address,
          requesterAddress: req.requester_address,
          studentName: req.student_name,
          studentNameAr: req.student_name_ar,
          facultyEn: req.faculty_en,
          majorEn: req.major_en,
          degreeNameEn: req.degree_name_en,
          gpa: req.gpa,
          year: req.year,
          status: req.status,
          approvalsReceived: Number(req.approvals_received || 0),
          approvalsRequired: Number(req.approvals_required || 0),
          approvalProgress: Number(req.approval_progress || 0),
          createdAt: req.created_at,
          createdAtChain: req.created_at, // Use created_at as proxy for chain timestamp
          executedAt: req.executed_at,
          tokenId: req.token_id,
          // Next action needed
          actorsNeeded: req.approvals_required > req.approval_count 
            ? `Awaiting ${req.approvals_required - req.approval_count} more verifier approval(s)`
            : "Ready to issue",
          lastUpdatedChain: req.executed_at || req.created_at,
        })
      }
    }

    // Fetch pending revocation requests
    if (!type || type === "revocation") {
      const revWhere = buildRevocationWhere()
      // When type is "all", fetch pageSize from each to combine and sort
      const limit = type === "revocation" ? pageSize : pageSize
      const revOffset = type === "revocation" ? offset : 0

      const revocationRequests = await sql`
        SELECT 
          rr.*,
          u.name as university_name,
          u.name_ar as university_name_ar,
          u.blockchain_id as university_blockchain_id,
          COALESCE(rr.approval_count, 0) as approvals_received,
          COALESCE(rr.required_approvals, 0) as approvals_required,
          CASE 
            WHEN COALESCE(rr.required_approvals, 0) = 0 THEN 0
            ELSE ROUND((COALESCE(rr.approval_count, 0)::numeric / rr.required_approvals::numeric) * 100, 2)
          END as approval_progress
        FROM revocation_requests rr
        LEFT JOIN universities u ON rr.university_id = u.id
        ${revWhere}
        ORDER BY rr.created_at ${sql.unsafe(safeSortOrder)}
        LIMIT ${limit}
        OFFSET ${revOffset}
      `

      for (const req of revocationRequests) {
        results.push({
          itemType: "revocation",
          id: req.request_id,
          dbId: req.id,
          universityId: req.university_id,
          universityName: req.university_name || `University #${req.university_id}`,
          universityNameAr: req.university_name_ar,
          universityBlockchainId: req.university_blockchain_id,
          tokenId: req.token_id,
          requesterAddress: req.requester_address,
          status: req.status,
          approvalsReceived: Number(req.approvals_received || 0),
          approvalsRequired: Number(req.approvals_required || 0),
          approvalProgress: Number(req.approval_progress || 0),
          createdAt: req.created_at,
          createdAtChain: req.created_at,
          executedAt: req.executed_at,
          // Next action needed
          actorsNeeded: req.approvals_required > req.approval_count
            ? `Awaiting ${req.approvals_required - req.approval_count} more verifier approval(s)`
            : "Ready to revoke",
          lastUpdatedChain: req.executed_at || req.created_at,
        })
      }
    }

    // Get total counts for pagination and sync metadata
    const [degreeCount, revocationCount, syncStatus] = await Promise.all([
      sql`
        SELECT COUNT(*) as count
        FROM degree_requests dr
        ${buildDegreeWhere()}
      `.then(r => Number(r[0]?.count || 0)),
      sql`
        SELECT COUNT(*) as count
        FROM revocation_requests rr
        ${buildRevocationWhere()}
      `.then(r => Number(r[0]?.count || 0)),
      sql`
        SELECT last_synced_block, finalized_block, sync_mode, updated_at
        FROM sync_status WHERE id = 1
      `.then(r => r[0] || null).catch(() => null),
    ])

    const total = type === "degree" ? degreeCount : type === "revocation" ? revocationCount : degreeCount + revocationCount

    // Sort results if needed (for unified view) and apply pagination
    if (!type) {
      // Sort combined results
      if (sortField === "created_at") {
        results.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime()
          const bTime = new Date(b.createdAt).getTime()
          return sortOrder === "asc" ? aTime - bTime : bTime - aTime
        })
      } else if (sortField === "approval_progress") {
        results.sort((a, b) => {
          return sortOrder === "asc" 
            ? a.approvalProgress - b.approvalProgress
            : b.approvalProgress - a.approvalProgress
        })
      }
      
      // Apply pagination to combined results
      results = results.slice(offset, offset + pageSize)
    }

    return NextResponse.json({
      items: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        range: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        universityId: universityId ? Number(universityId) : null,
        type: type || null,
        status,
        search: search || null,
      },
      sort: {
        field: sortField,
        order: sortOrder,
      },
      sync: {
        lastSyncedBlock: syncStatus?.last_synced_block || 0,
        finalizedBlock: syncStatus?.finalized_block || 0,
        syncedAt: syncStatus?.updated_at || null,
        syncMode: syncStatus?.sync_mode || "polling",
      },
      counts: {
        degreeRequests: degreeCount,
        revocationRequests: revocationCount,
        total: degreeCount + revocationCount,
      },
    })
  } catch (error: any) {
    console.error("[AdminPending] Error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to get pending items",
        items: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        counts: { degreeRequests: 0, revocationRequests: 0, total: 0 },
      },
      { status: 500 }
    )
  }
}
