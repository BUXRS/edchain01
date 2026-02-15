/**
 * Verify Degree Endpoint
 * 
 * Backend-only endpoint that verifies a degree on-chain.
 * UI must call this endpoint, never read from blockchain directly.
 * 
 * Returns:
 * - DB record (if exists)
 * - On-chain validity check
 * - Sync metadata
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"
import { fetchDegreeFromBlockchain, isValidDegree } from "@/lib/blockchain"
// Use new indexer service
let getIndexerStatus: () => any = () => ({ isRunning: false, mode: "unknown", lastProcessedBlock: 0, finalizedBlock: 0 })
try {
  const { indexerService } = require("@/lib/services/indexer/IndexerService")
  getIndexerStatus = () => indexerService.getStatus()
} catch {
  try {
    const oldIndexer = require("@/lib/services/websocket-indexer")
    getIndexerStatus = oldIndexer.getIndexerStatus
  } catch {}
}

/** Convert BigInt and other non-JSON-serializable values so NextResponse.json() works */
function serializeForJson(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "bigint") return Number(obj)
  if (Array.isArray(obj)) return obj.map(serializeForJson)
  if (typeof obj === "object" && obj.constructor === Object) {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeForJson(v)
    }
    return out
  }
  return obj
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId: tokenIdParam } = await params
    const tokenId = Number.parseInt(tokenIdParam)

    if (!tokenIdParam || Number.isNaN(tokenId) || tokenId < 1) {
      return NextResponse.json(
        { error: "Invalid token ID" },
        { status: 400 }
      )
    }

    // Database (optional - only when DB is configured)
    let dbDegree: any[] = []
    if (isDatabaseAvailable()) {
      try {
        dbDegree = await sql`
          SELECT * FROM degrees WHERE token_id = ${String(tokenId)} LIMIT 1
        `
      } catch {
        // DB error: continue with blockchain only
      }
    }

    // On-chain verification (authoritative)
    let onChainValid = false
    let onChainDegree = null
    let onChainError = null

    try {
      onChainDegree = await fetchDegreeFromBlockchain(tokenId)
      if (onChainDegree) {
        onChainValid = await isValidDegree(tokenId)
      }
    } catch (error: any) {
      onChainError = error?.message || "Failed to verify on-chain"
    }

    // Sync status (optional)
    let syncStatus: any = null
    const indexerStatus = getIndexerStatus()
    if (isDatabaseAvailable()) {
      try {
        const rows = await sql`
          SELECT last_synced_block, finalized_block, sync_mode, updated_at
          FROM sync_status WHERE id = 1
        `
        syncStatus = rows[0] || null
      } catch {
        // ignore
      }
    }

    const payload = {
      tokenId,
      database: dbDegree.length > 0 ? {
        exists: true,
        data: serializeForJson(dbDegree[0]),
        syncedAt: dbDegree[0].last_verified_at,
      } : {
        exists: false,
        data: null,
      },
      blockchain: {
        exists: !!onChainDegree,
        isValid: onChainValid,
        data: onChainDegree ? serializeForJson(onChainDegree) : null,
        error: onChainError,
      },
      verified: onChainValid && !!onChainDegree,
      sync: {
        lastSyncedBlock: Number(syncStatus?.last_synced_block ?? 0),
        finalizedBlock: Number(syncStatus?.finalized_block ?? 0),
        syncedAt: syncStatus?.updated_at ?? null,
        syncMode: syncStatus?.sync_mode ?? indexerStatus?.mode ?? "unknown",
        indexerRunning: indexerStatus?.isRunning ?? false,
      },
    }
    return NextResponse.json(payload)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
