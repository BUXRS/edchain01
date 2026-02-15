/**
 * Reindex Endpoint - Rebuild Materialized Tables from chain_events
 * 
 * SECURED: Should be protected by admin authentication
 * 
 * This endpoint:
 * 1. Optionally wipes materialized tables (universities, issuers, revokers, verifiers, degrees, etc.)
 * 2. Replays all events from chain_events table
 * 3. Rebuilds entire read-model from event store
 * 
 * This is the "gold standard" test: Can we rebuild DB from scratch?
 */

import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { eventProjector } from "@/lib/services/indexer/EventProjector"
import { CHAIN_ID, CORE_CONTRACT_ADDRESS } from "@/lib/contracts/abi"

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    // const { user } = await getAuth()
    // if (!user || !isAdmin(user)) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const body = await request.json().catch(() => ({}))
    const { wipeTables = false, fromBlock = null } = body

    const result = {
      success: false,
      wiped: false,
      eventsReplayed: 0,
      errors: [] as string[],
      startTime: new Date().toISOString(),
      endTime: null as string | null,
    }

    try {
      // Step 1: Optionally wipe materialized tables
      if (wipeTables) {
        console.log("[Reindex] Wiping materialized tables...")
        
        // Delete in reverse dependency order
        await sql`DELETE FROM revocation_request_approvals`
        await sql`DELETE FROM revocation_requests`
        await sql`DELETE FROM degree_request_approvals`
        await sql`DELETE FROM degree_requests`
        await sql`DELETE FROM degrees`
        await sql`DELETE FROM verifiers`
        await sql`DELETE FROM revokers`
        await sql`DELETE FROM issuers`
        await sql`DELETE FROM universities`

        // Mark all events as unprocessed
        await sql`
          UPDATE chain_events
          SET projection_applied = false, processed = false
          WHERE chain_id = ${CHAIN_ID}
            AND contract_address = ${CORE_CONTRACT_ADDRESS.toLowerCase()}
        `

        result.wiped = true
        console.log("[Reindex] ✅ Tables wiped")
      }

      // Step 2: Replay events
      console.log("[Reindex] Replaying events from chain_events...")

      if (fromBlock) {
        // Replay from specific block
        const projectionResult = await eventProjector.replayFromBlock(Number(fromBlock))
        result.eventsReplayed = projectionResult.eventsProcessed
        result.errors.push(...projectionResult.errors)
      } else {
        // Replay all unprocessed events
        let totalProcessed = 0
        let hasMore = true

        while (hasMore) {
          const projectionResult = await eventProjector.processUnprocessedEvents(1000)
          totalProcessed += projectionResult.eventsProcessed
          result.errors.push(...projectionResult.errors)

          // Check if there are more events
          const remaining = await sql`
            SELECT COUNT(*) as count
            FROM chain_events
            WHERE chain_id = ${CHAIN_ID}
              AND contract_address = ${CORE_CONTRACT_ADDRESS.toLowerCase()}
              AND projection_applied = false
          `
          hasMore = Number(remaining[0]?.count || 0) > 0

          console.log(`[Reindex] Processed ${totalProcessed} events, ${remaining[0]?.count || 0} remaining...`)
        }

        result.eventsReplayed = totalProcessed
      }

      result.success = result.errors.length === 0
      result.endTime = new Date().toISOString()

      console.log(`[Reindex] ✅ Reindex completed: ${result.eventsReplayed} events replayed`)

      return NextResponse.json(result)
    } catch (error) {
      result.endTime = new Date().toISOString()
      result.errors.push(error instanceof Error ? error.message : "Unknown error")
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({
      error: "Failed to reindex",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
