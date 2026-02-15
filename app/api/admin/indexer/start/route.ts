/**
 * Admin Indexer Control Endpoint
 * 
 * Allows Super Admin to start/stop/restart the indexer
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

// Use new indexer service
let indexerService: any = null
let getIndexerStatus: () => any = () => ({ 
  isRunning: false, 
  mode: "unknown", 
  lastProcessedBlock: 0, 
  finalizedBlock: 0 
})

try {
  const indexerModule = require("@/lib/services/indexer/IndexerService")
  indexerService = indexerModule.indexerService
  getIndexerStatus = () => indexerService.getStatus()
} catch {
  // Fallback to old indexer if new one not available
  try {
    const oldIndexer = require("@/lib/services/websocket-indexer")
    indexerService = { start: oldIndexer.startWebSocketIndexer, stop: oldIndexer.stopWebSocketIndexer }
    getIndexerStatus = oldIndexer.getIndexerStatus
  } catch {}
}

export async function POST(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const body = await request.json()
    const { action } = body

    if (!indexerService) {
      return NextResponse.json(
        { error: "Indexer service not available" },
        { status: 503 }
      )
    }

    if (action === "start" || action === "restart") {
      // Stop first if restarting
      if (action === "restart" && indexerService.stop) {
        try {
          await indexerService.stop()
          console.log("[AdminIndexer] Stopped indexer for restart")
        } catch (err) {
          console.warn("[AdminIndexer] Error stopping indexer:", err)
        }
      }

      // Start the indexer
      try {
        await indexerService.start()
        const status = getIndexerStatus()
        return NextResponse.json({
          success: true,
          message: "Indexer started successfully",
          status: {
            isRunning: status.isRunning,
            mode: status.mode,
            lastProcessedBlock: status.lastProcessedBlock,
            finalizedBlock: status.finalizedBlock,
          },
        })
      } catch (error: any) {
        console.error("[AdminIndexer] Error starting indexer:", error)
        return NextResponse.json(
          {
            error: "Failed to start indexer",
            details: error.message || String(error),
          },
          { status: 500 }
        )
      }
    }

    if (action === "stop") {
      if (!indexerService.stop) {
        return NextResponse.json(
          { error: "Indexer stop not supported" },
          { status: 400 }
        )
      }

      try {
        await indexerService.stop()
        return NextResponse.json({
          success: true,
          message: "Indexer stopped successfully",
        })
      } catch (error: any) {
        console.error("[AdminIndexer] Error stopping indexer:", error)
        return NextResponse.json(
          {
            error: "Failed to stop indexer",
            details: error.message || String(error),
          },
          { status: 500 }
        )
      }
    }

    if (action === "status") {
      const status = getIndexerStatus()
      return NextResponse.json({
        status: {
          isRunning: status.isRunning,
          mode: status.mode,
          lastProcessedBlock: status.lastProcessedBlock,
          finalizedBlock: status.finalizedBlock,
          wsConnected: status.wsConnected || false,
        },
      })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'start', 'stop', 'restart', or 'status'" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("[AdminIndexer] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to control indexer" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const status = getIndexerStatus()
    return NextResponse.json({
      status: {
        isRunning: status.isRunning,
        mode: status.mode,
        lastProcessedBlock: status.lastProcessedBlock,
        finalizedBlock: status.finalizedBlock,
        wsConnected: status.wsConnected || false,
      },
    })
  } catch (error: any) {
    console.error("[AdminIndexer] Error getting status:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get indexer status" },
      { status: 500 }
    )
  }
}
