/**
 * Full Blockchain Migration API
 * 
 * Fetches ALL data from the smart contract and populates the database.
 * This is a one-time migration that should be run after setting up the database.
 */

import { NextRequest, NextResponse } from "next/server"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { fetchAllBlockchainData } from "@/lib/services/fetch-all-data"
import { serializeBigInt } from "@/lib/utils/serialize-bigint"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {

  try {
    console.log("[FullMigration] Starting full blockchain migration...")
    const startTime = Date.now()

    const results = {
      universities: { added: 0, updated: 0, errors: [] as string[] },
      degrees: { added: 0, updated: 0, errors: [] as string[] },
      issuers: { added: 0, updated: 0, errors: [] as string[] },
      revokers: { added: 0, updated: 0, errors: [] as string[] },
      verifiers: { added: 0, updated: 0, errors: [] as string[] },
      totalTime: 0,
    }

    // Fetch all data from blockchain in one comprehensive call
    console.log("[FullMigration] Fetching all data from blockchain...")
    const blockchainData = await fetchAllBlockchainData()
    
    console.log(`[FullMigration] Found ${blockchainData.totalUniversities} universities and ${blockchainData.totalDegrees} degrees`)

    // Step 1: Migrate all universities with issuers/revokers
    console.log("[FullMigration] Migrating universities...")
    for (const uni of blockchainData.universities) {
      try {
        const syncResult = await blockchainSync.syncUniversity(uni.id)
        results.universities.added += syncResult.added
        results.universities.updated += syncResult.updated
        results.universities.errors.push(...syncResult.errors)

        const uniId = Number(uni.id)

        // ✅ Sync issuers from blockchain events (not from uni.issuers which may be empty)
        try {
          const issuerSyncResult = await blockchainSync.syncIssuersForUniversity(uniId)
          results.issuers.added += issuerSyncResult.added
          results.issuers.updated += issuerSyncResult.updated
          results.issuers.errors.push(...issuerSyncResult.errors)
        } catch (error) {
          results.issuers.errors.push(`University ${uni.id} issuers sync: ${error}`)
        }

        // ✅ Sync revokers from blockchain events (not from uni.revokers which may be empty)
        try {
          const revokerSyncResult = await blockchainSync.syncRevokersForUniversity(uniId)
          results.revokers.added += revokerSyncResult.added
          results.revokers.updated += revokerSyncResult.updated
          results.revokers.errors.push(...revokerSyncResult.errors)
        } catch (error) {
          results.revokers.errors.push(`University ${uni.id} revokers sync: ${error}`)
        }

        // ✅ Sync verifiers from blockchain (V2 only)
        try {
          const verifierSyncResult = await blockchainSync.syncVerifiersForUniversity(uniId)
          results.verifiers.added += verifierSyncResult.added
          results.verifiers.updated += verifierSyncResult.updated
          results.verifiers.errors.push(...verifierSyncResult.errors)
        } catch (error) {
          results.verifiers.errors.push(`University ${uni.id} verifiers sync: ${error}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        results.universities.errors.push(`University ${uni.id}: ${errorMsg}`)
        console.error(`[FullMigration] Error syncing university ${uni.id}:`, error)
      }
    }

    // Step 2: Migrate all degrees
    console.log("[FullMigration] Migrating degrees...")
    for (const degree of blockchainData.degrees) {
      try {
        if (degree.tokenId > 0) {
          const syncResult = await blockchainSync.syncDegree(degree.tokenId)
          results.degrees.added += syncResult.added
          results.degrees.updated += syncResult.updated
          results.degrees.errors.push(...syncResult.errors)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        results.degrees.errors.push(`Degree ${degree.tokenId}: ${errorMsg}`)
      }
    }

    // Step 3: Update sync status
    try {
      await sql`
        INSERT INTO sync_status (id, last_synced_block, last_full_sync_at, updated_at)
        VALUES (1, ${blockchainData.lastBlockNumber}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          last_synced_block = ${blockchainData.lastBlockNumber},
          last_full_sync_at = NOW(),
          updated_at = NOW()
      `
    } catch (error) {
      console.warn("[FullMigration] Could not update sync_status:", error)
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2)
    results.totalTime = Number(totalTime)

    console.log(`[FullMigration] Migration completed in ${totalTime}s`)
    console.log(`[FullMigration] Results:`, results)

    // Serialize any BigInt values in results
    const serializedResults = serializeBigInt(results)
    
    return NextResponse.json({
      success: true,
      message: "Full migration completed",
      results: serializedResults,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[FullMigration] Fatal error:", error)
    return NextResponse.json({
      success: false,
      error: "Migration failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Full blockchain migration endpoint",
    usage: "POST to /api/migrate/full to start migration",
    note: "This will fetch ALL data from the smart contract and populate the database",
  })
}

