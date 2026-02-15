import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { fetchAllUniversities } from "@/lib/blockchain"

/**
 * Get all verifiers across all universities
 * ✅ BLOCKCHAIN FIRST: Syncs from blockchain before returning
 */
export async function GET(request: NextRequest) {
  try {
    // Get all universities from blockchain
    const universities = await fetchAllUniversities()

    // Sync verifiers for all universities
    const syncPromises = universities.map(uni => 
      blockchainSync.syncVerifiersForUniversity(Number(uni.id)).catch(err => {
        console.warn(`[AllVerifiersAPI] Sync failed for university ${uni.id}:`, err)
        return null
      })
    )
    await Promise.all(syncPromises)

    // Fetch all verifiers from database
    const verifiers = await sql`
      SELECT 
        v.*,
        u.name_en as university_name,
        u.blockchain_id as university_blockchain_id
      FROM verifiers v
      JOIN universities u ON v.university_id = u.id
      WHERE v.is_active = true
      ORDER BY u.name_en, v.created_at DESC
    `

    return NextResponse.json({ 
      verifiers: verifiers.map((v: any) => ({
        id: v.id,
        walletAddress: v.wallet_address,
        universityId: v.university_id,
        universityName: v.university_name,
        universityBlockchainId: v.university_blockchain_id,
        name: v.name,
        email: v.email,
        phone: v.phone,
        department: v.department,
        position: v.position,
        isActive: v.is_active,
        createdAt: v.created_at,
        blockchainVerified: v.blockchain_verified,
      }))
    })
  } catch (error) {
    console.error("[AllVerifiersAPI] Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch verifiers",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
