import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { fetchAllUniversities } from "@/lib/blockchain"

/**
 * Get all issuers across all universities
 * ✅ BLOCKCHAIN FIRST: Syncs from blockchain before returning
 */
export async function GET(request: NextRequest) {
  try {
    // Get all universities from blockchain
    const universities = await fetchAllUniversities()

    // Sync issuers for all universities
    const syncPromises = universities.map(uni => 
      blockchainSync.syncIssuersForUniversity(Number(uni.id)).catch(err => {
        console.warn(`[AllIssuersAPI] Sync failed for university ${uni.id}:`, err)
        return null
      })
    )
    await Promise.all(syncPromises)

    // Fetch all issuers from database
    const issuers = await sql`
      SELECT 
        i.*,
        u.name_en as university_name,
        u.blockchain_id as university_blockchain_id
      FROM issuers i
      JOIN universities u ON i.university_id = u.id
      WHERE i.is_active = true
      ORDER BY u.name_en, i.created_at DESC
    `

    return NextResponse.json({ 
      issuers: issuers.map((i: any) => ({
        id: i.id,
        walletAddress: i.wallet_address,
        universityId: i.university_id,
        universityName: i.university_name,
        universityBlockchainId: i.university_blockchain_id,
        name: i.name,
        email: i.email,
        phone: i.phone,
        department: i.department,
        position: i.position,
        isActive: i.is_active,
        createdAt: i.created_at,
        blockchainVerified: i.blockchain_verified,
      }))
    })
  } catch (error) {
    console.error("[AllIssuersAPI] Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch issuers",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
