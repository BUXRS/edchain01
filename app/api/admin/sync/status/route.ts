/**
 * Admin Sync Status Endpoint
 * 
 * Returns comprehensive sync status and indexer health
 * All data from DB tables (chain_sync_state/sync_status, chain_events)
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"
import { CHAIN_ID } from "@/lib/contracts/abi"

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
    // Get sync status from database
    const syncStatus = await sql`
      SELECT * FROM sync_status WHERE id = 1
    `.then(r => r[0] || null).catch(() => null)

    // Get indexer status
    const indexerStatus = getIndexerStatus()

    // Get latest event timestamp from chain_events
    const lastEvent = await sql`
      SELECT created_at, block_number
      FROM chain_events
      ORDER BY block_number DESC, created_at DESC
      LIMIT 1
    `.then(r => r[0] || null).catch(() => null)

    // Get current chain head (from indexer or calculate from last processed)
    const headBlock = indexerStatus.lastProcessedBlock || syncStatus?.last_synced_block || 0

    // Calculate lag (blocks behind)
    const lag = headBlock > 0 && syncStatus?.last_synced_block 
      ? Math.max(0, headBlock - syncStatus.last_synced_block)
      : 0

    // Get events count in last 24 hours
    const eventsLast24h = await sql`
      SELECT COUNT(*) as count
      FROM chain_events
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `.then(r => Number(r[0]?.count || 0)).catch(() => 0)

    // Get events count in last 1 hour
    const eventsLast1h = await sql`
      SELECT COUNT(*) as count
      FROM chain_events
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `.then(r => Number(r[0]?.count || 0)).catch(() => 0)

    // Get total events count
    const totalEvents = await sql`
      SELECT COUNT(*) as count FROM chain_events
    `.then(r => Number(r[0]?.count || 0)).catch(() => 0)

    // Get processed events count
    const processedEvents = await sql`
      SELECT COUNT(*) as count FROM chain_events WHERE processed = true
    `.then(r => Number(r[0]?.count || 0)).catch(() => 0)

    // Get failed events count
    const failedEvents = await sql`
      SELECT COUNT(*) as count FROM chain_events WHERE processed = false AND created_at < NOW() - INTERVAL '5 minutes'
    `.then(r => Number(r[0]?.count || 0)).catch(() => 0)

    // Check RPC health (basic connectivity)
    let rpcHealth = "unknown"
    try {
      const { getReadOnlyProvider } = await import("@/lib/blockchain")
      const provider = getReadOnlyProvider()
      await provider.getBlockNumber()
      rpcHealth = "healthy"
    } catch {
      rpcHealth = "unhealthy"
    }

    // WS health based on indexer mode
    let wsConnected = false
    let wsHealth = "not_used"
    if (indexerStatus.mode === "websocket") {
      wsConnected = indexerStatus.isRunning && indexerStatus.wsConnected !== false
      wsHealth = wsConnected ? "connected" : "disconnected"
    }

    // Calculate lag time (if we have timestamps)
    let lagTime: string | null = null
    if (lastEvent?.created_at && syncStatus?.updated_at) {
      const lagMs = new Date().getTime() - new Date(lastEvent.created_at).getTime()
      const lagSeconds = Math.floor(lagMs / 1000)
      if (lagSeconds < 60) {
        lagTime = `${lagSeconds}s`
      } else if (lagSeconds < 3600) {
        lagTime = `${Math.floor(lagSeconds / 60)}m`
      } else {
        lagTime = `${Math.floor(lagSeconds / 3600)}h`
      }
    }

    return NextResponse.json({
      chainId: CHAIN_ID,
      syncMode: syncStatus?.sync_mode || indexerStatus.mode || "polling",
      headBlock,
      lastSyncedBlock: syncStatus?.last_synced_block || indexerStatus.lastProcessedBlock || 0,
      finalizedBlock: syncStatus?.finalized_block || indexerStatus.finalizedBlock || 0,
      confirmations: syncStatus?.confirmation_depth || 10,
      syncedAt: syncStatus?.updated_at || null,
      lastEventAt: lastEvent?.created_at || null,
      lastEventBlock: lastEvent?.block_number || null,
      wsConnected,
      wsHealth,
      rpcHealth,
      indexerRunning: indexerStatus.isRunning || false,
      lag: {
        blocks: lag,
        time: lagTime,
      },
      events: {
        total: totalEvents,
        processed: processedEvents,
        failed: failedEvents,
        last1h: eventsLast1h,
        last24h: eventsLast24h,
      },
      reorg: {
        detected: syncStatus?.reorg_detected || false,
        lastReorgAt: syncStatus?.last_reorg_at || null,
      },
      indexerError: indexerStatus.lastError || null,
      indexerErrorAt: indexerStatus.lastErrorAt || null,
    })
  } catch (error: any) {
    console.error("[AdminSyncStatus] Error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to get sync status",
        chainId: CHAIN_ID,
        syncMode: "unknown",
        headBlock: 0,
        lastSyncedBlock: 0,
        finalizedBlock: 0,
        confirmations: 10,
        syncedAt: null,
        lastEventAt: null,
        wsConnected: false,
        wsHealth: "unknown",
        rpcHealth: "unknown",
        indexerRunning: false,
        lag: { blocks: 0, time: null },
        events: { total: 0, processed: 0, failed: 0, last1h: 0, last24h: 0 },
        reorg: { detected: false, lastReorgAt: null },
      },
      { status: 500 }
    )
  }
}
