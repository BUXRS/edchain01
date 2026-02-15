/**
 * Full Sync Endpoint
 * 
 * Triggers immediate full sync of all blockchain data to database.
 * This is the PRIMARY way to populate the database initially.
 */

import { type NextRequest, NextResponse } from "next/server"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { fetchAllUniversities } from "@/lib/blockchain"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("[FullSync] Starting full blockchain sync...")
    
    const results = {
      universities: { added: 0, updated: 0, errors: [] as string[] },
      issuers: { added: 0, updated: 0, errors: [] as string[] },
      revokers: { added: 0, updated: 0, errors: [] as string[] },
      verifiers: { added: 0, updated: 0, errors: [] as string[] },
      degrees: { added: 0, updated: 0, errors: [] as string[] },
    }

    // Step 1: Sync all universities
    console.log("[FullSync] Syncing universities...")
    try {
      const universities = await fetchAllUniversities()
      console.log(`[FullSync] Found ${universities.length} universities on blockchain`)
      
      if (universities.length === 0) {
        console.warn("[FullSync] ⚠️ No universities found on blockchain!")
        console.warn("[FullSync] This could mean:")
        console.warn("  1. Contract address is incorrect")
        console.warn("  2. No universities have been registered yet")
        console.warn("  3. RPC endpoint is not accessible")
        console.warn("[FullSync] Check /api/sync/debug for detailed diagnostics")
      }
      
      for (const uni of universities) {
        try {
          const uniId = Number(uni.id)
          const syncResult = await blockchainSync.syncUniversity(uniId)
          results.universities.added += syncResult.added
          results.universities.updated += syncResult.updated
          results.universities.errors.push(...syncResult.errors)
          
          // Sync related data for each university
          console.log(`[FullSync] Syncing data for university ${uniId}...`)
          
          // Sync issuers
          try {
            const issuerResult = await blockchainSync.syncIssuersForUniversity(uniId)
            results.issuers.added += issuerResult.added
            results.issuers.updated += issuerResult.updated
          } catch (err: any) {
            results.issuers.errors.push(`University ${uniId}: ${err.message}`)
          }
          
          // Sync revokers
          try {
            const revokerResult = await blockchainSync.syncRevokersForUniversity(uniId)
            results.revokers.added += revokerResult.added
            results.revokers.updated += revokerResult.updated
          } catch (err: any) {
            results.revokers.errors.push(`University ${uniId}: ${err.message}`)
          }
          
          // Sync verifiers
          try {
            const verifierResult = await blockchainSync.syncVerifiersForUniversity(uniId)
            results.verifiers.added += verifierResult.added
            results.verifiers.updated += verifierResult.updated
          } catch (err: any) {
            results.verifiers.errors.push(`University ${uniId}: ${err.message}`)
          }
          
          // Sync degrees
          try {
            const degreeResult = await blockchainSync.syncDegreesForUniversity(uniId)
            results.degrees.added += degreeResult.added
            results.degrees.updated += degreeResult.updated
          } catch (err: any) {
            results.degrees.errors.push(`University ${uniId}: ${err.message}`)
          }
        } catch (err: any) {
          results.universities.errors.push(`University ${uni.id}: ${err.message}`)
        }
      }
    } catch (error: any) {
      results.universities.errors.push(`Failed to fetch universities: ${error.message}`)
    }

    // Update sync status
    try {
      const provider = await import("@/lib/blockchain").then(m => m.getReadOnlyProvider())
      const currentBlock = await provider.getBlockNumber()
      
      await sql`
        UPDATE sync_status
        SET last_synced_block = ${currentBlock},
            last_full_sync_at = NOW(),
            updated_at = NOW()
        WHERE id = 1
      `
    } catch (err) {
      console.warn("[FullSync] Could not update sync status:", err)
    }

    const totalAdded = 
      results.universities.added + 
      results.issuers.added + 
      results.revokers.added + 
      results.verifiers.added + 
      results.degrees.added
    
    const totalUpdated = 
      results.universities.updated + 
      results.issuers.updated + 
      results.revokers.updated + 
      results.verifiers.updated + 
      results.degrees.updated

    console.log(`[FullSync] Complete! Added: ${totalAdded}, Updated: ${totalUpdated}`)

    return NextResponse.json({
      success: true,
      message: "Full sync completed",
      results,
      summary: {
        totalAdded,
        totalUpdated,
        totalErrors: Object.values(results).reduce((sum, r) => sum + r.errors.length, 0),
      },
    })
  } catch (error: any) {
    console.error("[FullSync] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to perform full sync",
        message: "Check server logs for details"
      },
      { status: 500 }
    )
  }
}
