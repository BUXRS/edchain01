/**
 * Admin Sync Events Endpoint
 * 
 * Returns recent blockchain events from chain_events table
 * Supports filtering, pagination, and search
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function GET(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const fromBlock = searchParams.get("fromBlock")
    const toBlock = searchParams.get("toBlock")
    const eventName = searchParams.get("eventName")
    const txHash = searchParams.get("txHash")

    // Build WHERE clause
    let whereClause = sql``
    let hasWhere = false

    if (fromBlock) {
      whereClause = sql`WHERE block_number >= ${BigInt(fromBlock)}`
      hasWhere = true
    }

    if (toBlock) {
      whereClause = hasWhere 
        ? sql`${whereClause} AND block_number <= ${BigInt(toBlock)}`
        : sql`WHERE block_number <= ${BigInt(toBlock)}`
      hasWhere = true
    }

    if (eventName) {
      whereClause = hasWhere
        ? sql`${whereClause} AND event_name = ${eventName}`
        : sql`WHERE event_name = ${eventName}`
      hasWhere = true
    }

    if (txHash) {
      whereClause = hasWhere
        ? sql`${whereClause} AND tx_hash = ${txHash}`
        : sql`WHERE tx_hash = ${txHash}`
      hasWhere = true
    }

    // Get total count
    const totalCount = await sql`
      SELECT COUNT(*) as count
      FROM chain_events
      ${whereClause}
    `.then(r => Number(r[0]?.count || 0))

    // Get events
    const events = await sql`
      SELECT 
        id,
        chain_id,
        tx_hash,
        log_index,
        event_name,
        contract_address,
        block_number,
        block_hash,
        event_data,
        is_finalized,
        confirmation_depth,
        processed,
        processed_at,
        projection_applied,
        created_at
      FROM chain_events
      ${whereClause}
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return NextResponse.json({
      events: events.map((e: any) => ({
        id: e.id,
        chainId: Number(e.chain_id),
        txHash: e.tx_hash,
        logIndex: e.log_index,
        eventName: e.event_name,
        contractAddress: e.contract_address,
        blockNumber: Number(e.block_number),
        blockHash: e.block_hash,
        eventData: e.event_data,
        isFinalized: e.is_finalized,
        confirmationDepth: e.confirmation_depth,
        processed: e.processed,
        processedAt: e.processed_at,
        projectionApplied: e.projection_applied,
        createdAt: e.created_at,
      })),
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error: any) {
    console.error("[AdminSyncEvents] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch events", details: error.message },
      { status: 500 }
    )
  }
}
