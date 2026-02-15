import { type NextRequest, NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"

/**
 * GET /api/verifiers/universities
 * Fetches all universities where a given wallet is an active verifier
 * Query params: walletAddress (required)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get("walletAddress")

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress query parameter is required" },
        { status: 400 }
      )
    }

    const normalizedAddress = walletAddress.toLowerCase()

    // Query database for universities where wallet is an active verifier
    const universities = await sql`
      SELECT DISTINCT
        u.id,
        u.blockchain_id,
        COALESCE(u.name_en, u.name) as name_en,
        u.name_ar as name_ar,
        u.status,
        v.is_active,
        v.wallet_address
      FROM verifiers v
      JOIN universities u ON v.university_id = u.id
      WHERE LOWER(v.wallet_address) = ${normalizedAddress}
        AND v.is_active = true
        AND u.status = 'active'
      ORDER BY u.id ASC
    `

    return NextResponse.json({
      success: true,
      universities: universities.map((u: any) => ({
        id: u.id,
        blockchainId: u.blockchain_id,
        nameEn: u.name_en,
        nameAr: u.name_ar,
        isActive: u.is_active !== false,
      })),
      count: universities.length,
    })
  } catch (error: any) {
    console.error("[VerifiersUniversities] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch verifier universities", details: error.message },
      { status: 500 }
    )
  }
}
