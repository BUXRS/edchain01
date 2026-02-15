/**
 * Admin Metrics Endpoint
 * 
 * Returns comprehensive metrics for Super Admin Dashboard
 * All data computed from DB tables (blockchain projection)
 * Supports time range filtering
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  endDate.setUTCHours(23, 59, 59, 999) // End of today UTC
  
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
      startDate = new Date(0) // Beginning of time
      break
    default:
      startDate.setUTCDate(endDate.getUTCDate() - 30) // Default to 30 days
  }
  
  startDate.setUTCHours(0, 0, 0, 0) // Start of day UTC
  
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

    // Core KPIs - Total counts (not filtered by range)
    const [totalUniversities, activeUniversities, totalIssuers, totalRevokers, totalVerifiers] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM universities WHERE blockchain_verified = true`.then(r => Number(r[0]?.count || 0)),
      sql`SELECT COUNT(*) as count FROM universities WHERE blockchain_verified = true AND is_active = true`.then(r => Number(r[0]?.count || 0)),
      sql`SELECT COUNT(*) as count FROM issuers WHERE is_active = true AND blockchain_verified = true`.then(r => Number(r[0]?.count || 0)),
      sql`SELECT COUNT(*) as count FROM revokers WHERE is_active = true AND blockchain_verified = true`.then(r => Number(r[0]?.count || 0)),
      sql`SELECT COUNT(*) as count FROM verifiers WHERE is_active = true AND blockchain_verified = true`.then(r => Number(r[0]?.count || 0)),
    ])

    // Range-filtered metrics
    // Degrees issued in range (use created_at from degrees table)
    const degreesIssuedInRange = await sql`
      SELECT COUNT(*) as count 
      FROM degrees 
      WHERE created_at >= ${startDate} 
        AND created_at <= ${endDate}
        AND blockchain_verified = true
    `.then(r => Number(r[0]?.count || 0))

    // Degrees revoked in range
    const degreesRevokedInRange = await sql`
      SELECT COUNT(*) as count 
      FROM degrees 
      WHERE revoked_at >= ${startDate} 
        AND revoked_at <= ${endDate}
        AND is_revoked = true
    `.then(r => Number(r[0]?.count || 0))

    // Total degrees (all time)
    const totalDegrees = await sql`
      SELECT COUNT(*) as count FROM degrees WHERE blockchain_verified = true
    `.then(r => Number(r[0]?.count || 0))

    // Degree Requests by status (in range)
    const degreeRequestsStats = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM degree_requests
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY status
    `.then(results => {
      const stats: Record<string, number> = {
        pending: 0,
        approved: 0,
        rejected: 0,
        executed: 0,
        expired: 0,
      }
      results.forEach((r: any) => {
        const status = r.status?.toLowerCase() || "pending"
        if (stats.hasOwnProperty(status)) {
          stats[status] = Number(r.count || 0)
        }
      })
      return stats
    })

    // Revocation Requests by status (in range)
    const revocationRequestsStats = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM revocation_requests
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY status
    `.then(results => {
      const stats: Record<string, number> = {
        pending: 0,
        approved: 0,
        rejected: 0,
        executed: 0,
        expired: 0,
      }
      results.forEach((r: any) => {
        const status = r.status?.toLowerCase() || "pending"
        if (stats.hasOwnProperty(status)) {
          stats[status] = Number(r.count || 0)
        }
      })
      return stats
    })

    // Events observed in range (from chain_events)
    // Use created_at as proxy for block timestamp (created_at is set when event is indexed)
    const eventsInRange = await sql`
      SELECT COUNT(*) as count 
      FROM chain_events 
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND processed = true
    `.then(r => Number(r[0]?.count || 0))

    // Total events processed
    const totalEvents = await sql`
      SELECT COUNT(*) as count FROM chain_events WHERE processed = true
    `.then(r => Number(r[0]?.count || 0))

    return NextResponse.json({
      // Core KPIs (all time)
      totalUniversities,
      activeUniversities,
      totalRoles: {
        issuers: totalIssuers,
        revokers: totalRevokers,
        verifiers: totalVerifiers,
        total: totalIssuers + totalRevokers + totalVerifiers,
      },
      totalDegrees,
      
      // Range-filtered metrics
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        range,
      },
      degreesIssuedInRange,
      degreesRevokedInRange,
      degreeRequests: degreeRequestsStats,
      revocationRequests: revocationRequestsStats,
      eventsInRange,
      totalEvents,
    })
  } catch (error: any) {
    console.error("[AdminMetrics] Error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to get metrics",
        totalUniversities: 0,
        activeUniversities: 0,
        totalRoles: { issuers: 0, revokers: 0, verifiers: 0, total: 0 },
        totalDegrees: 0,
        degreesIssuedInRange: 0,
        degreesRevokedInRange: 0,
        degreeRequests: { pending: 0, approved: 0, rejected: 0, executed: 0, expired: 0 },
        revocationRequests: { pending: 0, approved: 0, rejected: 0, executed: 0, expired: 0 },
        eventsInRange: 0,
        totalEvents: 0,
      },
      { status: 500 }
    )
  }
}
