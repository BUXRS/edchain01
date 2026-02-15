/**
 * University Dashboard Stats API
 *
 * Returns the same aggregated counts (issuers, revokers, verifiers, degrees)
 * for the current university as used by the super admin universities list.
 * Requires university session (cookie). Uses database as source of truth.
 */

import { NextResponse } from "next/server"
import { getUniversitySession } from "@/lib/auth"
import { sql, isDatabaseAvailable, getDbUniversityIdFromSessionId } from "@/lib/db"

export async function GET() {
  try {
    const university = await getUniversitySession()
    if (!university?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in as a university admin." },
        { status: 401 }
      )
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 }
      )
    }

    const dbUniversityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)

    // Same count logic as super admin: is_active = true AND blockchain_verified = true for roles; is_revoked = false for degrees
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*)::int FROM issuers WHERE university_id = ${dbUniversityId} AND is_active = true AND blockchain_verified = true) as issuers_count,
        (SELECT COUNT(*)::int FROM revokers WHERE university_id = ${dbUniversityId} AND is_active = true AND blockchain_verified = true) as revokers_count,
        (SELECT COUNT(*)::int FROM verifiers WHERE university_id = ${dbUniversityId} AND is_active = true AND blockchain_verified = true) as verifiers_count,
        (SELECT COUNT(*)::int FROM degrees WHERE university_id = ${dbUniversityId} AND is_revoked = false) as degrees_count
    `

    const issuers_count = Number(stats?.issuers_count ?? 0)
    const revokers_count = Number(stats?.revokers_count ?? 0)
    const verifiers_count = Number(stats?.verifiers_count ?? 0)
    const degrees_count = Number(stats?.degrees_count ?? 0)

    return NextResponse.json({
      issuers_count,
      revokers_count,
      verifiers_count,
      degrees_count,
      name: university.name,
      subscriptionStatus: university.subscriptionStatus ?? "inactive",
      subscriptionPlan: university.subscriptionPlan ?? "—",
    })
  } catch (error) {
    console.error("[UniversityDashboardStats] Error:", error)
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    )
  }
}
