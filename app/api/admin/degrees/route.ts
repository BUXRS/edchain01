/**
 * Admin Degrees Endpoint
 * 
 * Returns comprehensive degrees list with filters, pagination, sorting, and aggregated stats
 * All data from DB projection (blockchain is source of truth, DB is derived)
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

// Use new indexer service
let getIndexerStatus: () => any = () => ({ 
  isRunning: false, 
  mode: "unknown", 
  lastProcessedBlock: 0, 
  finalizedBlock: 0 
})

try {
  const { indexerService } = require("@/lib/services/indexer/IndexerService")
  getIndexerStatus = () => indexerService.getStatus()
} catch {
  try {
    const oldIndexer = require("@/lib/services/websocket-indexer")
    getIndexerStatus = oldIndexer.getIndexerStatus
  } catch {}
}

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
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const status = searchParams.get("status") || "all" // "all" | "active" | "revoked"
    const universityId = searchParams.get("universityId")
    const search = searchParams.get("q") || searchParams.get("search") || ""
    const sortBy = searchParams.get("sort") || "newest" // "newest" | "oldest" | "newest_revoked" | "tokenId_asc" | "tokenId_desc"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10)

    // Determine date range
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

    // Build WHERE clause using conditional fragments (postgres doesn't support sql.join)
    let whereClause = sql``
    let hasWhere = false

    // Date range filter (on created_at for issued, revoked_at for revoked)
    if (status === "revoked") {
      whereClause = sql`WHERE d.revoked_at >= ${startDate} AND d.revoked_at <= ${endDate}`
      hasWhere = true
    } else {
      whereClause = sql`WHERE d.created_at >= ${startDate} AND d.created_at <= ${endDate}`
      hasWhere = true
    }

    // Status filter
    if (status === "active") {
      whereClause = sql`${whereClause} AND d.is_revoked = false`
    } else if (status === "revoked") {
      whereClause = sql`${whereClause} AND d.is_revoked = true`
    }

    // University filter
    if (universityId) {
      whereClause = sql`${whereClause} AND d.university_id = ${Number(universityId)}`
    }

    // Search filter
    if (search) {
      const searchPattern = `%${search}%`
      whereClause = sql`${whereClause} AND (
        d.token_id::text ILIKE ${searchPattern} OR
        d.student_address ILIKE ${searchPattern} OR
        d.student_name ILIKE ${searchPattern} OR
        d.student_name_ar ILIKE ${searchPattern} OR
        d.major ILIKE ${searchPattern} OR
        d.major_ar ILIKE ${searchPattern} OR
        u.name_en ILIKE ${searchPattern} OR
        u.name_ar ILIKE ${searchPattern} OR
        d.tx_hash ILIKE ${searchPattern}
      )`
    }

    // Build ORDER BY clause
    let orderByClause
    switch (sortBy) {
      case "oldest":
        orderByClause = sql`ORDER BY d.created_at ASC`
        break
      case "newest_revoked":
        orderByClause = sql`ORDER BY d.revoked_at DESC NULLS LAST, d.created_at DESC`
        break
      case "tokenId_asc":
        orderByClause = sql`ORDER BY CAST(d.token_id AS BIGINT) ASC`
        break
      case "tokenId_desc":
        orderByClause = sql`ORDER BY CAST(d.token_id AS BIGINT) DESC`
        break
      case "newest":
      default:
        orderByClause = sql`ORDER BY d.created_at DESC`
    }

    // Get total count
    const totalCount = await sql`
      SELECT COUNT(*) as count
      FROM degrees d
      LEFT JOIN universities u ON d.university_id = u.id
      ${whereClause}
    `.then(r => Number(r[0]?.count || 0))

    // Get degrees with university info
    const degrees = await sql`
      SELECT 
        d.*,
        u.name_en as university_name,
        u.name_ar as university_name_ar,
        u.blockchain_id as university_blockchain_id,
        u.wallet_address as university_wallet
      FROM degrees d
      LEFT JOIN universities u ON d.university_id = u.id
      ${whereClause}
      ${orderByClause}
      LIMIT ${pageSize}
      OFFSET ${offset}
    `

    // Get aggregated stats for KPIs
    const [totalMinted, mintedInRange, totalRevoked, revokedInRange, pendingRevocations] = await Promise.all([
      // Total minted (all time)
      sql`SELECT COUNT(*) as count FROM degrees WHERE is_revoked = false`.then(r => Number(r[0]?.count || 0)),
      // Minted in range
      sql`SELECT COUNT(*) as count FROM degrees WHERE created_at >= ${startDate} AND created_at <= ${endDate} AND is_revoked = false`.then(r => Number(r[0]?.count || 0)),
      // Total revoked (all time)
      sql`SELECT COUNT(*) as count FROM degrees WHERE is_revoked = true`.then(r => Number(r[0]?.count || 0)),
      // Revoked in range
      sql`SELECT COUNT(*) as count FROM degrees WHERE revoked_at >= ${startDate} AND revoked_at <= ${endDate} AND is_revoked = true`.then(r => Number(r[0]?.count || 0)),
      // Pending revocations (from revocation_requests)
      sql`SELECT COUNT(*) as count FROM revocation_requests WHERE status = 'pending'`.then(r => Number(r[0]?.count || 0)),
    ])

    // Get sync metadata
    const indexerStatus = getIndexerStatus()
    const syncStatus = await sql`
      SELECT last_synced_block, finalized_block, sync_mode, updated_at
      FROM sync_status WHERE id = 1
    `.then(r => r[0] || null).catch(() => null)

    // Get chart data: degrees minted over time (daily buckets)
    const mintedOverTime = await sql`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM degrees
      WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
        AND is_revoked = false
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `

    // Get chart data: revocations over time (daily buckets)
    const revokedOverTime = await sql`
      SELECT 
        DATE_TRUNC('day', revoked_at) as date,
        COUNT(*) as count
      FROM degrees
      WHERE revoked_at >= ${startDate} 
        AND revoked_at <= ${endDate}
        AND is_revoked = true
      GROUP BY DATE_TRUNC('day', revoked_at)
      ORDER BY date ASC
    `

    // Get top universities by minted degrees
    const topUniversities = await sql`
      SELECT 
        u.id,
        u.name_en,
        u.name_ar,
        u.blockchain_id,
        COUNT(d.id) as degrees_count
      FROM universities u
      LEFT JOIN degrees d ON u.id = d.university_id 
        AND d.created_at >= ${startDate} 
        AND d.created_at <= ${endDate}
        AND d.is_revoked = false
      WHERE u.blockchain_verified = true
      GROUP BY u.id, u.name_en, u.name_ar, u.blockchain_id
      HAVING COUNT(d.id) > 0
      ORDER BY degrees_count DESC
      LIMIT 10
    `

    return NextResponse.json({
      degrees: degrees.map((d: any) => ({
        id: d.id,
        tokenId: d.token_id,
        studentAddress: d.student_address,
        studentName: d.student_name,
        studentNameAr: d.student_name_ar,
        universityId: d.university_id,
        universityName: d.university_name,
        universityNameAr: d.university_name_ar,
        universityBlockchainId: d.university_blockchain_id,
        degreeType: d.degree_type,
        degreeTypeAr: d.degree_type_ar,
        major: d.major,
        majorAr: d.major_ar,
        graduationDate: d.graduation_date,
        cgpa: d.cgpa,
        honors: d.honors,
        honorsAr: d.honors_ar,
        isRevoked: d.is_revoked,
        revokedBy: d.revoked_by,
        revokedAt: d.revoked_at,
        revocationReason: d.revocation_reason,
        txHash: d.tx_hash,
        issuedBy: d.issued_by,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        status: d.is_revoked ? "revoked" : "active",
      })),
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      stats: {
        totalMinted,
        mintedInRange,
        totalRevoked,
        revokedInRange,
        pendingRevocations,
      },
      charts: {
        mintedOverTime: mintedOverTime.map((r: any) => ({
          date: r.date.toISOString().split("T")[0],
          count: Number(r.count),
        })),
        revokedOverTime: revokedOverTime.map((r: any) => ({
          date: r.date.toISOString().split("T")[0],
          count: Number(r.count),
        })),
        topUniversities: topUniversities.map((u: any) => ({
          id: u.id,
          name: u.name_en || `University #${u.blockchain_id}`,
          nameAr: u.name_ar,
          blockchainId: u.blockchain_id,
          degreesCount: Number(u.degrees_count),
        })),
      },
      sync: {
        lastSyncedBlock: syncStatus?.last_synced_block || indexerStatus.lastProcessedBlock || 0,
        finalizedBlock: syncStatus?.finalized_block || indexerStatus.finalizedBlock || 0,
        syncedAt: syncStatus?.updated_at || null,
        syncMode: syncStatus?.sync_mode || indexerStatus.mode || "unknown",
        indexerRunning: indexerStatus.isRunning || false,
      },
    })
  } catch (error: any) {
    console.error("[AdminDegrees] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch degrees", details: error.message },
      { status: 500 }
    )
  }
}
