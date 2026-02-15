/**
 * Transaction Status Endpoint
 * 
 * Returns the status of a registered transaction.
 * UI polls this endpoint to check if transaction is confirmed
 * (when indexer has applied the event to DB).
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { txHash: string } }
) {
  try {
    const txHash = params.txHash

    // Check pending_transactions
    const pending = await sql`
      SELECT * FROM pending_transactions WHERE tx_hash = ${txHash} LIMIT 1
    `

    if (pending.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    const tx = pending[0]

    // Check if event has been processed (in chain_events)
    const event = await sql`
      SELECT * FROM chain_events
      WHERE tx_hash = ${txHash} AND chain_id = 8453
      ORDER BY block_number DESC, log_index DESC
      LIMIT 1
    `

    // Determine status
    let status = tx.status
    let confirmed = false
    let blockNumber = tx.block_number || null
    let eventData = null

    if (event.length > 0) {
      status = "confirmed"
      confirmed = true
      blockNumber = event[0].block_number
      eventData = {
        eventName: event[0].event_name,
        blockNumber: event[0].block_number,
        processed: event[0].processed,
        finalized: event[0].is_finalized,
      }
    } else if (status === "pending") {
      // Still pending, check if enough time has passed (might be failed)
      const createdAt = new Date(tx.created_at)
      const now = new Date()
      const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / 1000 / 60

      if (minutesSinceCreation > 10) {
        status = "timeout" // Likely failed or not mined
      }
    }

    return NextResponse.json({
      txHash,
      status,
      confirmed,
      blockNumber,
      eventData,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
