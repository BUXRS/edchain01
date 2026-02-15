/**
 * University Metrics Endpoint
 *
 * Same concept as Super Admin metrics but scoped to the logged-in university.
 * Returns KPIs and range-filtered metrics for dashboard charts.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql, getDbUniversityIdFromSessionId } from "@/lib/db"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

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
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) {
    return university
  }

  try {
    const dbUniversityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "30d"
    const rangeDates = getDateRange(range)
    const startDate = rangeDates.startDate
    const endDate = rangeDates.endDate

    // Core KPIs for this university (same logic as dashboard-stats)
    const [roleCounts, degreesTotal, degreesInRange, degreesRevokedInRange, degreeRequestsStats, revocationRequestsStats] = await Promise.all([
      sql`
        SELECT 
          (SELECT COUNT(*)::int FROM issuers WHERE university_id = ${dbUniversityId} AND is_active = true AND (blockchain_verified = true OR blockchain_verified IS NULL)) as issuers_count,
          (SELECT COUNT(*)::int FROM revokers WHERE university_id = ${dbUniversityId} AND is_active = true AND (blockchain_verified = true OR blockchain_verified IS NULL)) as revokers_count,
          (SELECT COUNT(*)::int FROM verifiers WHERE university_id = ${dbUniversityId} AND is_active = true AND (blockchain_verified = true OR blockchain_verified IS NULL)) as verifiers_count
      `.then(r => r[0] as { issuers_count: number; revokers_count: number; verifiers_count: number }),
      sql`SELECT COUNT(*) as count FROM degrees WHERE university_id = ${dbUniversityId} AND is_revoked = false`.then(r => Number(r[0]?.count || 0)),
      sql`
        SELECT COUNT(*) as count FROM degrees 
        WHERE university_id = ${dbUniversityId} AND created_at >= ${startDate} AND created_at <= ${endDate}
      `.then(r => Number(r[0]?.count || 0)),
      sql`
        SELECT COUNT(*) as count FROM degrees 
        WHERE university_id = ${dbUniversityId} AND is_revoked = true AND revoked_at >= ${startDate} AND revoked_at <= ${endDate}
      `.then(r => Number(r[0]?.count || 0)),
      sql`
        SELECT status, COUNT(*) as count
        FROM degree_requests
        WHERE university_id = ${dbUniversityId} AND created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY status
      `.then(results => {
        const stats: Record<string, number> = { pending: 0, approved: 0, rejected: 0, executed: 0, expired: 0 }
        results.forEach((r: { status: string; count: string }) => {
          const s = (r.status || "").toLowerCase()
          if (Object.prototype.hasOwnProperty.call(stats, s)) stats[s] = Number(r.count || 0)
        })
        return stats
      }),
      sql`
        SELECT status, COUNT(*) as count
        FROM revocation_requests
        WHERE university_id = ${dbUniversityId} AND created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY status
      `.then(results => {
        const stats: Record<string, number> = { pending: 0, approved: 0, rejected: 0, executed: 0, expired: 0 }
        results.forEach((r: { status: string; count: string }) => {
          const s = (r.status || "").toLowerCase()
          if (Object.prototype.hasOwnProperty.call(stats, s)) stats[s] = Number(r.count || 0)
        })
        return stats
      }),
    ])

    const issuers_count = Number(roleCounts?.issuers_count ?? 0)
    const revokers_count = Number(roleCounts?.revokers_count ?? 0)
    const verifiers_count = Number(roleCounts?.verifiers_count ?? 0)

    return NextResponse.json({
      totalRoles: {
        issuers: issuers_count,
        revokers: revokers_count,
        verifiers: verifiers_count,
        total: issuers_count + revokers_count + verifiers_count,
      },
      totalDegrees: degreesTotal,
      range: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), range },
      degreesIssuedInRange: degreesInRange,
      degreesRevokedInRange: degreesRevokedInRange,
      degreeRequests: degreeRequestsStats,
      revocationRequests: revocationRequestsStats,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[UniversityMetrics] Error:", error)
    return NextResponse.json(
      { error: message, totalRoles: { issuers: 0, revokers: 0, verifiers: 0, total: 0 }, totalDegrees: 0, degreesIssuedInRange: 0, degreesRevokedInRange: 0, degreeRequests: {}, revocationRequests: {} },
      { status: 500 }
    )
  }
}
