/**
 * Transaction Registration Endpoint
 * 
 * Registers a pending transaction from the UI.
 * UI sends txHash after wallet signing, then polls DB endpoints
 * to confirm when indexer applies the event.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { txHash, actionType, refs, initiatedBy } = body

    if (!txHash || !actionType) {
      return NextResponse.json(
        { error: "txHash and actionType are required" },
        { status: 400 }
      )
    }

    // Register transaction in pending_transactions table
    const result = await sql`
      INSERT INTO pending_transactions (
        tx_hash, action, entity_type, entity_id, university_id,
        initiated_by, data, status
      ) VALUES (
        ${txHash}, ${actionType}, ${refs?.entityType || null}, ${refs?.entityId || null},
        ${refs?.universityId || null}, ${initiatedBy || null}, ${JSON.stringify(refs || {})}::jsonb, 'pending'
      )
      ON CONFLICT (tx_hash) DO UPDATE SET
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      transaction: result[0],
      message: "Transaction registered. Poll /api/tx/status/:txHash to check confirmation.",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
