/**
 * Health Check Endpoint
 *
 * Returns comprehensive health status with timeouts so the route never hangs
 * (DB, RPC, WebSocket checks are capped to avoid serverless timeout).
 */

import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { getReadOnlyProvider } from "@/lib/blockchain"
import { CHAIN_ID } from "@/lib/contracts/abi"

const CHECK_TIMEOUT_MS = 3000
const WS_CHECK_TIMEOUT_MS = 1500

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

export async function GET() {
  const health = {
    status: "healthy" as "healthy" | "degraded" | "unhealthy",
    timestamp: new Date().toISOString(),
    database: { connected: false, error: null as string | null },
    rpc: {
      http: {
        connected: false,
        chainId: null as number | null,
        currentBlock: null as number | null,
        error: null as string | null,
      },
      websocket: { available: false, connected: false, error: null as string | null },
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

  // Check database (with timeout)
  try {
    if (isDatabaseAvailable()) {
      await withTimeout(sql`SELECT 1`, CHECK_TIMEOUT_MS, "Database")
      health.database.connected = true
    } else {
      health.database.error = "Database not configured"
    }
  } catch (error) {
    health.database.connected = false
    health.database.error = error instanceof Error ? error.message : "Unknown error"
  }

  // Check RPC HTTP (with timeout)
  try {
    const provider = getReadOnlyProvider()
    const network = await withTimeout(provider.getNetwork(), CHECK_TIMEOUT_MS, "RPC getNetwork")
    const currentBlock = await withTimeout(provider.getBlockNumber(), CHECK_TIMEOUT_MS, "RPC getBlockNumber")
    health.rpc.http.connected = true
    health.rpc.http.chainId = Number(network.chainId)
    health.rpc.http.currentBlock = currentBlock
  } catch (error) {
    health.rpc.http.connected = false
    health.rpc.http.error = error instanceof Error ? error.message : "Unknown error"
  }

  // WebSocket check: skip on serverless or use short timeout to avoid hanging
  try {
    const BASE_RPC_WS_URL = process.env.BASE_RPC_WS_URL || "wss://mainnet.base.org"
    const { JsonRpcProvider } = await import("ethers")
    const wsProvider = new JsonRpcProvider(BASE_RPC_WS_URL, { chainId: CHAIN_ID, name: "base" })
    await withTimeout(wsProvider.getNetwork(), WS_CHECK_TIMEOUT_MS, "RPC WebSocket")
    health.rpc.websocket.available = true
    health.rpc.websocket.connected = true
    await wsProvider.destroy()
    // eslint-disable-next-line no-empty
    try { } catch { }
  } catch {
    health.rpc.websocket.available = false
    health.rpc.websocket.error = "WebSocket not supported or unavailable"
  }

  // Indexer status (no network call, fast)
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

  // Sync status from DB (with timeout)
  try {
    if (isDatabaseAvailable()) {
      const syncStatus = await withTimeout(
        sql`SELECT last_synced_block, finalized_block, sync_mode, updated_at, events_processed_count, events_failed_count, reorg_detected, last_reorg_at FROM sync_status WHERE id = 1`,
        CHECK_TIMEOUT_MS,
        "Sync status"
      )
      if (syncStatus.length > 0) {
        const s = syncStatus[0] as Record<string, unknown>
        health.sync.lastSyncedBlock = Number(s.last_synced_block ?? 0)
        health.sync.finalizedBlock = Number(s.finalized_block ?? 0)
        health.sync.syncMode = (s.sync_mode as string) || null
        health.sync.syncedAt = s.updated_at ? new Date(s.updated_at as string).toISOString() : null
        health.sync.eventsProcessed = Number(s.events_processed_count ?? 0)
        health.sync.eventsFailed = Number(s.events_failed_count ?? 0)
        health.sync.reorgDetected = Boolean(s.reorg_detected)
        health.sync.lastReorgAt = s.last_reorg_at ? new Date(s.last_reorg_at as string).toISOString() : null
      }
    }
  } catch {
    // Sync status unavailable (e.g. table missing or timeout)
  }

  if (!health.database.connected || !health.rpc.http.connected) {
    health.status = "unhealthy"
  } else if (!health.indexer.running || health.sync.reorgDetected) {
    health.status = "degraded"
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503
  return NextResponse.json(health, { status: statusCode })
}
