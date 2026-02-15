import { type NextRequest, NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { checkIsIssuerOnChain } from "@/lib/blockchain"

/**
 * GET /api/issuers/verify?walletAddress=0x...&universityId=1
 * Verifies if a wallet is an issuer for a university
 * Checks both database (fast) and blockchain (source of truth)
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
    const universityId = searchParams.get("universityId")

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress parameter is required" },
        { status: 400 }
      )
    }

    const normalizedAddress = walletAddress.toLowerCase()

    // If universityId provided, check specific university
    if (universityId) {
      const uniId = Number(universityId)
      
      // Check database first (fast)
      // Use COALESCE to handle missing name_en column gracefully
      const dbResult = await sql`
        SELECT 
          i.*,
          u.blockchain_id,
          COALESCE(u.name_en, u.name) as name_en,
          u.name
        FROM issuers i
        INNER JOIN universities u ON i.university_id = u.id
        WHERE i.wallet_address = ${normalizedAddress}
          AND u.blockchain_id = ${uniId}
          AND i.is_active = true
        LIMIT 1
      `

      const isInDb = dbResult.length > 0 && dbResult[0].is_active

      // Check blockchain (source of truth)
      let isOnChain = false
      try {
        isOnChain = await checkIsIssuerOnChain(uniId, normalizedAddress)
      } catch (error) {
        console.error("[VerifyIssuer] Blockchain check failed:", error)
      }

      // If mismatch, log it
      if (isInDb !== isOnChain) {
        console.warn(`[VerifyIssuer] MISMATCH for ${normalizedAddress} at university ${uniId}: DB=${isInDb}, Blockchain=${isOnChain}`)
      }

      return NextResponse.json({
        walletAddress: normalizedAddress,
        universityId: uniId,
        isIssuer: isOnChain, // Blockchain is source of truth
        inDatabase: isInDb,
        onBlockchain: isOnChain,
        mismatch: isInDb !== isOnChain,
        dbData: dbResult.length > 0 ? {
          isActive: dbResult[0].is_active,
          blockchainVerified: dbResult[0].blockchain_verified,
          lastVerifiedAt: dbResult[0].last_verified_at,
        } : null,
      })
    }

    // No universityId - check all universities
    // Use COALESCE to handle missing name_en column gracefully
    const dbResult = await sql`
      SELECT DISTINCT
        u.blockchain_id,
        COALESCE(u.name_en, u.name) as name_en,
        u.name,
        i.is_active,
        i.blockchain_verified
      FROM issuers i
      INNER JOIN universities u ON i.university_id = u.id
      WHERE i.wallet_address = ${normalizedAddress}
        AND i.is_active = true
    `

    const universities = []
    for (const row of dbResult) {
      const uniId = Number(row.blockchain_id)
      try {
        const isOnChain = await checkIsIssuerOnChain(uniId, normalizedAddress)
        universities.push({
          universityId: uniId,
          name: row.name_en || row.name || "",
          isIssuer: isOnChain,
          inDatabase: row.is_active,
          onBlockchain: isOnChain,
          mismatch: row.is_active !== isOnChain,
        })
      } catch (error) {
        console.error(`[VerifyIssuer] Failed to check university ${uniId}:`, error)
      }
    }

    return NextResponse.json({
      walletAddress: normalizedAddress,
      universities,
      total: universities.length,
      verified: universities.filter((u) => u.isIssuer).length,
    })
  } catch (error: any) {
    console.error("[API] Error verifying issuer:", error)
    return NextResponse.json(
      { error: "Failed to verify issuer", details: error.message },
      { status: 500 }
    )
  }
}
