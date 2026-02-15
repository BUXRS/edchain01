/**
 * Start Real-Time Sync API
 * 
 * Triggers immediate full sync and starts real-time monitoring
 */

import { NextRequest, NextResponse } from "next/server"
import { realtimeSync } from "@/lib/services/realtime-sync"
import { blockchainSync } from "@/lib/services/blockchain-sync"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "start") {
      // Start real-time sync service
      await realtimeSync.start()
      return NextResponse.json({ 
        success: true, 
        message: "Real-time sync started",
        isRunning: realtimeSync.isRunning()
      })
    }

    if (action === "stop") {
      realtimeSync.stop()
      return NextResponse.json({ 
        success: true, 
        message: "Real-time sync stopped"
      })
    }

    if (action === "full_sync") {
      // Perform immediate full sync
      const universitiesResult = await blockchainSync.syncAllUniversities()
      
      // Sync degrees for all universities (from blockchain, not just DB)
      const { fetchAllUniversities } = await import("@/lib/blockchain")
      const blockchainUniversities = await fetchAllUniversities()
      
      let totalDegreesAdded = 0
      let totalDegreesUpdated = 0

      for (const uni of blockchainUniversities) {
        try {
          const uniId = Number(uni.id)
          // Ensure university is synced first (this also syncs issuers and revokers)
          await blockchainSync.syncUniversity(uniId)
          // Explicitly sync issuers and revokers to ensure they're fetched
          await blockchainSync.syncIssuersForUniversity(uniId)
          await blockchainSync.syncRevokersForUniversity(uniId)
          // Then sync degrees
          const degreesResult = await blockchainSync.syncDegreesForUniversity(uniId)
          totalDegreesAdded += degreesResult.added
          totalDegreesUpdated += degreesResult.updated
        } catch (error) {
          console.error(`Error syncing data for university ${uni.id}:`, error)
        }
      }

      return NextResponse.json({
        success: true,
        message: "Full sync completed",
        results: {
          universities: {
            added: universitiesResult.added,
            updated: universitiesResult.updated,
          },
          degrees: {
            added: totalDegreesAdded,
            updated: totalDegreesUpdated,
          }
        }
      })
    }

    return NextResponse.json({ 
      error: "Invalid action. Use: start, stop, or full_sync" 
    }, { status: 400 })
  } catch (error) {
    console.error("[SyncStart] Error:", error)
    return NextResponse.json({ 
      error: "Failed to start sync",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    isRunning: realtimeSync.isRunning(),
    message: "Use POST with action: start, stop, or full_sync"
  })
}
