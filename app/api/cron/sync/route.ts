/**
 * Cron Job Endpoint for Automatic Blockchain Sync
 * 
 * This endpoint can be called by a cron service (Vercel Cron, GitHub Actions, etc.)
 * to periodically sync blockchain data to the database.
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - External cron: Call this endpoint periodically
 * - Manual trigger: POST to /api/cron/sync
 */

import { type NextRequest, NextResponse } from "next/server"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { realtimeSync } from "@/lib/services/realtime-sync"

// Optional: Add authentication token check
const CRON_SECRET = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET

export async function GET(request: NextRequest) {
  return await handleSync(request)
}

export async function POST(request: NextRequest) {
  return await handleSync(request)
}

async function handleSync(request: NextRequest) {
  try {
    // Optional: Verify cron secret
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization")
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
    }

    console.log("[CronSync] Starting scheduled blockchain sync...")

    // Perform full sync
    const startTime = Date.now()
    await realtimeSync.performFullSync()
    const duration = Date.now() - startTime

    console.log(`[CronSync] Sync completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: "Blockchain sync completed",
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[CronSync] Sync failed:", error)
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
