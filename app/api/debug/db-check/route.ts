/**
 * Debug endpoint to check what's actually in the database
 * This helps diagnose why data isn't showing in UI
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Check all tables
    const [universities, issuers, revokers, verifiers, degrees] = await Promise.all([
      sql`SELECT id, blockchain_id, name_en, is_active, blockchain_verified FROM universities ORDER BY id`,
      sql`SELECT id, university_id, wallet_address, is_active, blockchain_verified FROM issuers ORDER BY id`,
      sql`SELECT id, university_id, wallet_address, is_active, blockchain_verified FROM revokers ORDER BY id`,
      sql`SELECT id, university_id, wallet_address, is_active, blockchain_verified FROM verifiers ORDER BY id`,
      sql`SELECT id, token_id, university_id, is_revoked, blockchain_verified FROM degrees ORDER BY id LIMIT 10`,
    ])

    // Count active entities
    const activeIssuers = issuers.filter((i: any) => i.is_active).length
    const activeRevokers = revokers.filter((r: any) => r.is_active).length
    const activeVerifiers = verifiers.filter((v: any) => v.is_active).length

    return NextResponse.json({
      summary: {
        universities: {
          total: universities.length,
          active: universities.filter((u: any) => u.is_active).length,
          blockchainVerified: universities.filter((u: any) => u.blockchain_verified).length,
        },
        issuers: {
          total: issuers.length,
          active: activeIssuers,
          blockchainVerified: issuers.filter((i: any) => i.blockchain_verified).length,
        },
        revokers: {
          total: revokers.length,
          active: activeRevokers,
          blockchainVerified: revokers.filter((r: any) => r.blockchain_verified).length,
        },
        verifiers: {
          total: verifiers.length,
          active: activeVerifiers,
          blockchainVerified: verifiers.filter((v: any) => v.blockchain_verified).length,
        },
        degrees: {
          total: degrees.length,
          active: degrees.filter((d: any) => !d.is_revoked).length,
        },
      },
      details: {
        universities: universities,
        issuers: issuers,
        revokers: revokers,
        verifiers: verifiers,
        degrees: degrees,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || "Failed to check database",
        details: error.stack,
      },
      { status: 500 }
    )
  }
}
