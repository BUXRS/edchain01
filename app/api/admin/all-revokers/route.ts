import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { fetchAllUniversities } from "@/lib/blockchain"

/**
 * Get all revokers across all universities
 * ✅ BLOCKCHAIN FIRST: Syncs from blockchain before returning
 */
export async function GET(request: NextRequest) {
  try {
    // Get all universities from blockchain
    const universities = await fetchAllUniversities()

    // Sync revokers for all universities
    const syncPromises = universities.map(uni => 
      blockchainSync.syncRevokersForUniversity(Number(uni.id)).catch(err => {
        console.warn(`[AllRevokersAPI] Sync failed for university ${uni.id}:`, err)
        return null
      })
    )
    await Promise.all(syncPromises)

    // Fetch all revokers from database
    const revokers = await sql`
      SELECT 
        r.*,
        u.name_en as university_name,
        u.blockchain_id as university_blockchain_id
      FROM revokers r
      JOIN universities u ON r.university_id = u.id
      WHERE r.is_active = true
      ORDER BY u.name_en, r.created_at DESC
    `

    return NextResponse.json({ 
      revokers: revokers.map((r: any) => ({
        id: r.id,
        walletAddress: r.wallet_address,
        universityId: r.university_id,
        universityName: r.university_name,
        universityBlockchainId: r.university_blockchain_id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        department: r.department,
        position: r.position,
        isActive: r.is_active,
        createdAt: r.created_at,
        blockchainVerified: r.blockchain_verified,
      }))
    })
  } catch (error) {
    console.error("[AllRevokersAPI] Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch revokers",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
