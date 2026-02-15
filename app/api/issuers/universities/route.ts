import { type NextRequest, NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"

/**
 * GET /api/issuers/universities?walletAddress=0x...
 * Returns all universities where the wallet address is an active issuer
 * Uses database (synced by indexer/WebSocket) for fast queries
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

    // Query database for universities where this wallet is an active issuer
    // This is much faster than checking blockchain for each university
    // Use COALESCE to handle missing name_en column gracefully
    const result = await sql`
      SELECT DISTINCT
        u.id,
        u.blockchain_id,
        u.name,
        COALESCE(u.name_en, u.name) as name_en,
        u.name_ar,
        u.wallet_address,
        u.admin_wallet,
        u.is_active,
        u.status,
        i.wallet_address as issuer_wallet,
        i.is_active as issuer_active,
        i.blockchain_verified as issuer_verified
      FROM issuers i
      INNER JOIN universities u ON i.university_id = u.id
      WHERE i.wallet_address = ${normalizedAddress}
        AND i.is_active = true
        AND u.is_active = true
      ORDER BY COALESCE(u.name_en, u.name), u.name
    `

    const universities = result.map((row: any) => ({
      id: Number(row.blockchain_id || row.id),
      dbId: row.id,
      name: row.name_en || row.name || "",
      nameEn: row.name_en || row.name || "",
      nameAr: row.name_ar || "",
      walletAddress: row.wallet_address || row.admin_wallet,
      adminWallet: row.admin_wallet || row.wallet_address,
      isActive: row.is_active,
      status: row.status,
      issuerWallet: row.issuer_wallet,
      issuerActive: row.issuer_active,
      issuerVerified: row.issuer_verified,
    }))

    return NextResponse.json({
      success: true,
      universities,
      count: universities.length,
    })
  } catch (error: any) {
    console.error("[API] Error fetching issuer universities:", error)
    return NextResponse.json(
      { error: "Failed to fetch issuer universities", details: error.message },
      { status: 500 }
    )
  }
}
