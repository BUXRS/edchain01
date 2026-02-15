/**
 * Admin Sync Status Endpoint
 * 
 * Returns comprehensive sync status for Super Admin Dashboard
 * Reads from chain_sync_state (or sync_status) table
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

// Use new indexer service
let getIndexerStatus: () => any = () => ({ 
  isRunning: false, 
  mode: "unknown", 
  lastProcessedBlock: 0, 
  finalizedBlock: 0 
})

try {
  const { indexerService } = require("@/lib/services/indexer/IndexerService")
  getIndexerStatus = () => indexerService.getStatus()
} catch {
  // Fallback to old indexer if new one not available
  try {
    const oldIndexer = require("@/lib/services/websocket-indexer")
    getIndexerStatus = oldIndexer.getIndexerStatus
  } catch {}
}

export async function GET(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    // Get sync status from database (chain_sync_state or sync_status)
    const syncStatus = await sql`
      SELECT * FROM sync_status WHERE id = 1
    `.then(r => r[0] || null).catch(() => null)

    // Get indexer status
    const indexerStatus = getIndexerStatus()

    // Check RPC/WS health (basic connectivity check)
    let rpcHealth = "unknown"
    let wsHealth = "unknown"
    
    try {
      const { getReadOnlyProvider } = await import("@/lib/blockchain")
      const provider = getReadOnlyProvider()
      await provider.getBlockNumber()
      rpcHealth = "healthy"
    } catch {
      rpcHealth = "unhealthy"
    }

    // WS health based on indexer mode
    if (indexerStatus.mode === "websocket") {
      wsHealth = indexerStatus.isRunning ? "connected" : "disconnected"
    } else {
      wsHealth = "not_used" // Polling mode doesn't use WS
    }

    return NextResponse.json({
      lastSyncedBlock: syncStatus?.last_synced_block || indexerStatus.lastProcessedBlock || 0,
      finalizedBlock: syncStatus?.finalized_block || indexerStatus.finalizedBlock || 0,
      syncedAt: syncStatus?.updated_at || null,
      syncMode: syncStatus?.sync_mode || indexerStatus.mode || "polling",
      indexerRunning: indexerStatus.isRunning || false,
      rpcHealth,
      wsHealth,
      lastFullSyncAt: syncStatus?.last_full_sync_at || null,
      indexerError: indexerStatus.lastError || null,
      indexerErrorAt: indexerStatus.lastErrorAt || null,
    })
  } catch (error: any) {
    console.error("[AdminSyncStatus] Error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to get sync status",
        lastSyncedBlock: 0,
        finalizedBlock: 0,
        syncedAt: null,
        syncMode: "unknown",
        indexerRunning: false,
        rpcHealth: "unknown",
        wsHealth: "unknown",
      },
      { status: 500 }
    )
  }
}
