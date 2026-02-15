/**
 * Health Check Endpoint
 * 
 * Returns comprehensive health status:
 * - Database connectivity
 * - RPC connectivity (HTTP)
 * - WebSocket connectivity (if available)
 * - Indexer status
 * - Sync status (last synced block, finalized block)
 */

import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { getReadOnlyProvider } from "@/lib/blockchain"
import { CHAIN_ID } from "@/lib/contracts/abi"

export async function GET() {
  const health = {
    status: "healthy" as "healthy" | "degraded" | "unhealthy",
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      error: null as string | null,
    },
    rpc: {
      http: {
        connected: false,
        chainId: null as number | null,
        currentBlock: null as number | null,
        error: null as string | null,
      },
      websocket: {
        available: false,
        connected: false,
        error: null as string | null,
      },
    },
    indexer: {
      running: false,
      mode: null as "websocket" | "polling" | "manual" | null,
      lastProcessedBlock: null as number | null,
      finalizedBlock: null as number | null,
      error: null as string | null,
    },
    sync: {
      lastSyncedBlock: null as number | null,
      finalizedBlock: null as number | null,
      syncMode: null as string | null,
      syncedAt: null as string | null,
      eventsProcessed: null as number | null,
      eventsFailed: null as number | null,
      reorgDetected: false,
      lastReorgAt: null as string | null,
    },
  }

  // Check database
  try {
    if (isDatabaseAvailable()) {
      await sql`SELECT 1`
      health.database.connected = true
    } else {
      health.database.error = "Database not configured"
    }
  } catch (error) {
    health.database.connected = false
    health.database.error = error instanceof Error ? error.message : "Unknown error"
  }

  // Check RPC (HTTP)
  try {
    const provider = getReadOnlyProvider()
    const network = await provider.getNetwork()
    const currentBlock = await provider.getBlockNumber()

    health.rpc.http.connected = true
    health.rpc.http.chainId = Number(network.chainId)
    health.rpc.http.currentBlock = currentBlock
  } catch (error) {
    health.rpc.http.connected = false
    health.rpc.http.error = error instanceof Error ? error.message : "Unknown error"
  }

  // Check WebSocket (optional - may not be available)
  try {
    // Try to create WebSocket provider (will fail if not supported)
    const BASE_RPC_WS_URL = process.env.BASE_RPC_WS_URL || "wss://mainnet.base.org"
    const { JsonRpcProvider } = await import("ethers")
    const wsProvider = new JsonRpcProvider(BASE_RPC_WS_URL, {
      chainId: CHAIN_ID,
      name: "base",
    })

    try {
      await Promise.race([
        wsProvider.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
      ])
      health.rpc.websocket.available = true
      health.rpc.websocket.connected = true
      await wsProvider.destroy()
    } catch {
      health.rpc.websocket.available = false
      health.rpc.websocket.error = "WebSocket not supported or unavailable"
    }
  } catch (error) {
    health.rpc.websocket.available = false
    health.rpc.websocket.error = error instanceof Error ? error.message : "Unknown error"
  }

  // Check indexer status
  try {
    const { indexerService } = await import("@/lib/services/indexer/IndexerService")
    const indexerStatus = indexerService.getStatus()
    health.indexer.running = indexerStatus.isRunning
    health.indexer.mode = indexerStatus.mode
    health.indexer.lastProcessedBlock = indexerStatus.lastProcessedBlock
    health.indexer.finalizedBlock = indexerStatus.finalizedBlock
  } catch (error) {
    health.indexer.error = error instanceof Error ? error.message : "Indexer service not available"
  }

  // Get sync status from database
  try {
    if (isDatabaseAvailable()) {
      const syncStatus = await sql`
        SELECT 
          last_synced_block, finalized_block, sync_mode, updated_at,
          events_processed_count, events_failed_count,
          reorg_detected, last_reorg_at
        FROM sync_status WHERE id = 1
      `

      if (syncStatus.length > 0) {
        const status = syncStatus[0]
        health.sync.lastSyncedBlock = Number(status.last_synced_block || 0)
        health.sync.finalizedBlock = Number(status.finalized_block || 0)
        health.sync.syncMode = status.sync_mode || null
        health.sync.syncedAt = status.updated_at ? new Date(status.updated_at).toISOString() : null
        health.sync.eventsProcessed = Number(status.events_processed_count || 0)
        health.sync.eventsFailed = Number(status.events_failed_count || 0)
        health.sync.reorgDetected = status.reorg_detected || false
        health.sync.lastReorgAt = status.last_reorg_at ? new Date(status.last_reorg_at).toISOString() : null
      }
    }
  } catch (error) {
    // Sync status unavailable
  }

  // Determine overall health status
  if (!health.database.connected || !health.rpc.http.connected) {
    health.status = "unhealthy"
  } else if (!health.indexer.running || health.sync.reorgDetected) {
    health.status = "degraded"
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
