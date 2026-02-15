import { type NextRequest, NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { checkIsIssuerOnChain } from "@/lib/blockchain"

/**
 * GET /api/issuers/check-wallet?walletAddress=0x...
 * Comprehensive check: Shows if wallet is issuer/revoker in DB and on blockchain
 */
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("walletAddress")

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress parameter is required" },
        { status: 400 }
      )
    }

    const normalizedAddress = walletAddress.toLowerCase()

    // Check database for issuers
    const dbIssuers = await sql`
      SELECT 
        i.*,
        u.blockchain_id,
        COALESCE(u.name_en, u.name) as university_name
      FROM issuers i
      INNER JOIN universities u ON i.university_id = u.id
      WHERE i.wallet_address = ${normalizedAddress}
    `

    // Check database for revokers
    const dbRevokers = await sql`
      SELECT 
        r.*,
        u.blockchain_id,
        COALESCE(u.name_en, u.name) as university_name
      FROM revokers r
      INNER JOIN universities u ON r.university_id = u.id
      WHERE r.wallet_address = ${normalizedAddress}
    `

    // Check blockchain for each university found
    const issuerResults = []
    for (const issuer of dbIssuers) {
      const uniId = Number(issuer.blockchain_id)
      try {
        const isOnChain = await checkIsIssuerOnChain(uniId, normalizedAddress)
        issuerResults.push({
          universityId: uniId,
          universityName: issuer.university_name,
          inDatabase: true,
          dbActive: issuer.is_active,
          dbVerified: issuer.blockchain_verified,
          onBlockchain: isOnChain,
          mismatch: issuer.is_active !== isOnChain,
        })
      } catch (error) {
        issuerResults.push({
          universityId: uniId,
          universityName: issuer.university_name,
          inDatabase: true,
          dbActive: issuer.is_active,
          dbVerified: issuer.blockchain_verified,
          onBlockchain: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      walletAddress: normalizedAddress,
      asIssuer: {
        inDatabase: dbIssuers.length > 0,
        count: dbIssuers.length,
        universities: issuerResults,
        activeCount: dbIssuers.filter((i) => i.is_active).length,
      },
      asRevoker: {
        inDatabase: dbRevokers.length > 0,
        count: dbRevokers.length,
        universities: dbRevokers.map((r) => ({
          universityId: Number(r.blockchain_id),
          universityName: r.university_name,
          isActive: r.is_active,
        })),
      },
      summary: {
        isIssuerInDb: dbIssuers.length > 0,
        isRevokerInDb: dbRevokers.length > 0,
        isIssuerOnChain: issuerResults.some((r) => r.onBlockchain),
        recommendation: dbIssuers.length === 0 && dbRevokers.length > 0
          ? "Wallet is registered as REVOKER, not ISSUER. If you need to issue degrees, the wallet must be added as an issuer on the blockchain."
          : dbIssuers.length > 0 && !issuerResults.some((r) => r.onBlockchain)
          ? "Wallet is in database but not verified on blockchain. The indexer may need to sync, or the wallet may have been removed from blockchain."
          : "Wallet status verified",
      },
    })
  } catch (error: any) {
    console.error("[API] Error checking wallet:", error)
    return NextResponse.json(
      { error: "Failed to check wallet", details: error.message },
      { status: 500 }
    )
  }
}
