/**
 * Auto Sync API
 * 
 * Endpoints to control automatic blockchain-to-database synchronization
 */

import { type NextRequest, NextResponse } from "next/server"
import { getAutoSyncWorker, startAutoSync, stopAutoSync } from "@/lib/services/auto-sync-worker"
import { realtimeSync } from "@/lib/services/realtime-sync"

/**
 * GET - Get auto sync status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const worker = getAutoSyncWorker()
    const stats = worker.getStats()
    const realtimeStats = {
      isRunning: realtimeSync.isRunning(),
    }

    return NextResponse.json({
      success: true,
      autoSync: stats,
      realtimeSync: realtimeStats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get sync status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Start/stop auto sync or update configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, config } = body

    switch (action) {
      case "start": {
        // Start auto sync worker
        await startAutoSync(config)
        return NextResponse.json({
          success: true,
          message: "Auto sync started",
        })
      }

      case "stop": {
        // Stop auto sync worker
        await stopAutoSync()
        return NextResponse.json({
          success: true,
          message: "Auto sync stopped",
        })
      }

      case "restart": {
        // Restart auto sync worker
        await stopAutoSync()
        await startAutoSync(config)
        return NextResponse.json({
          success: true,
          message: "Auto sync restarted",
        })
      }

      case "update_config": {
        // Update configuration
        if (!config) {
          return NextResponse.json(
            { error: "Config is required" },
            { status: 400 }
          )
        }
        const worker = getAutoSyncWorker()
        worker.updateConfig(config)
        return NextResponse.json({
          success: true,
          message: "Configuration updated",
          config: worker.getStats().config,
        })
      }

      case "start_realtime": {
        // Start realtime sync
        await realtimeSync.start()
        return NextResponse.json({
          success: true,
          message: "Realtime sync started",
        })
      }

      case "stop_realtime": {
        // Stop realtime sync
        realtimeSync.stop()
        return NextResponse.json({
          success: true,
          message: "Realtime sync stopped",
        })
      }

      case "full_sync": {
        // Trigger immediate full sync
        await realtimeSync.performFullSync()
        return NextResponse.json({
          success: true,
          message: "Full sync completed",
        })
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid action. Valid actions: start, stop, restart, update_config, start_realtime, stop_realtime, full_sync",
          },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to execute action",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
