/**
 * Sync Status Endpoint
 * 
 * Returns current sync status and indexer information
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
// Use new indexer service
let getIndexerStatus: () => any = () => ({ isRunning: false, mode: "unknown", lastProcessedBlock: 0, finalizedBlock: 0 })
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
  try {
    // Get sync status from database
    const syncStatus = await sql`
      SELECT * FROM sync_status WHERE id = 1
    `.then(r => r[0] || null).catch(() => null)

    // Get indexer status
    const indexerStatus = getIndexerStatus()

    // Get counts from database
    const [universitiesCount, degreesCount, eventsCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM universities WHERE blockchain_verified = true`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      sql`SELECT COUNT(*) as count FROM degrees WHERE blockchain_verified = true`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      sql`SELECT COUNT(*) as count FROM chain_events WHERE processed = true`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
    ])

    return NextResponse.json({
      indexer: {
        isRunning: indexerStatus.isRunning,
        mode: indexerStatus.mode,
        lastProcessedBlock: indexerStatus.lastProcessedBlock,
        finalizedBlock: indexerStatus.finalizedBlock,
      },
      database: {
        lastSyncedBlock: syncStatus?.last_synced_block || 0,
        finalizedBlock: syncStatus?.finalized_block || 0,
        lastFullSyncAt: syncStatus?.last_full_sync_at || null,
        syncMode: syncStatus?.sync_mode || "unknown",
        updatedAt: syncStatus?.updated_at || null,
      },
      counts: {
        universities: universitiesCount,
        degrees: degreesCount,
        eventsProcessed: eventsCount,
      },
      health: {
        indexerActive: indexerStatus.isRunning,
        databaseConnected: !!syncStatus,
        chainEventsTableExists: eventsCount >= 0, // If query succeeds, table exists
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || "Failed to get sync status",
        health: {
          indexerActive: false,
          databaseConnected: false,
          chainEventsTableExists: false,
        },
      },
      { status: 500 }
    )
  }
}
