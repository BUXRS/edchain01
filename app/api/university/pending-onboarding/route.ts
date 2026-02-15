/**
 * University Pending Onboarding
 *
 * Returns issuers, revokers, and verifiers who have submitted their wallet
 * and are awaiting university admin to add them on-chain (activation).
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

    const [issuers, revokers, verifiers] = await Promise.all([
      sql`
        SELECT id, name, email, pending_wallet_address, wallet_submitted_at, status, created_at
        FROM issuers
        WHERE university_id = ${dbUniversityId}
          AND pending_wallet_address IS NOT NULL
          AND (status = 'pending_activation' OR status = 'pending_blockchain')
          AND (is_active = false OR blockchain_verified = false)
        ORDER BY wallet_submitted_at DESC
        LIMIT 50
      `,
      sql`
        SELECT id, name, email, pending_wallet_address, wallet_submitted_at, status, created_at
        FROM revokers
        WHERE university_id = ${dbUniversityId}
          AND pending_wallet_address IS NOT NULL
          AND (status = 'pending_activation' OR status = 'pending_blockchain')
          AND (is_active = false OR blockchain_verified = false)
        ORDER BY wallet_submitted_at DESC
        LIMIT 50
      `,
      sql`
        SELECT id, name, email, pending_wallet_address, wallet_submitted_at, status, created_at
        FROM verifiers
        WHERE university_id = ${dbUniversityId}
          AND pending_wallet_address IS NOT NULL
          AND (status = 'pending_activation' OR account_activated = false)
        ORDER BY wallet_submitted_at DESC
        LIMIT 50
      `,
    ])

    const mapRow = (row: Record<string, unknown>, role: string) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      walletAddress: row.pending_wallet_address,
      submittedAt: row.wallet_submitted_at,
      status: row.status,
      createdAt: row.created_at,
      role,
    })

    const pendingIssuers = (issuers ?? []).map((r) => mapRow(r as Record<string, unknown>, "issuer"))
    const pendingRevokers = (revokers ?? []).map((r) => mapRow(r as Record<string, unknown>, "revoker"))
    const pendingVerifiers = (verifiers ?? []).map((r) => mapRow(r as Record<string, unknown>, "verifier"))

    const all = [
      ...pendingIssuers,
      ...pendingRevokers,
      ...pendingVerifiers,
    ].sort(
      (a, b) =>
        new Date((b.submittedAt as string) ?? 0).getTime() -
        new Date((a.submittedAt as string) ?? 0).getTime()
    )

    return NextResponse.json({
      issuers: pendingIssuers,
      revokers: pendingRevokers,
      verifiers: pendingVerifiers,
      all,
      totalPending: all.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[UniversityPendingOnboarding] Error:", error)
    return NextResponse.json(
      {
        error: message,
        issuers: [],
        revokers: [],
        verifiers: [],
        all: [],
        totalPending: 0,
      },
      { status: 500 }
    )
  }
}
