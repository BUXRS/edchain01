/**
 * Admin Activity Endpoint
 * 
 * Returns recent chain events for activity feed
 * Reads from chain_events table
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
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    // Get recent chain events with decoded information
    const events = await sql`
      SELECT 
        id,
        chain_id,
        contract_address,
        event_name,
        block_number,
        block_hash,
        tx_hash,
        log_index,
        event_data,
        processed,
        created_at
      FROM chain_events
      WHERE processed = true
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Format events for display
    const formattedEvents = events.map((event: any) => {
      let decodedType = event.event_name || "Unknown"
      let description = ""
      
      // Decode event type and create description
      try {
        const args = typeof event.event_data === "string" 
          ? JSON.parse(event.event_data) 
          : event.event_data || {}
        
        switch (event.event_name) {
          case "UniversityRegistered":
            description = `University #${args.universityId || args[0]} registered: ${args.nameEn || args[1] || "Unknown"}`
            break
          case "DegreeIssued":
            description = `Degree #${args.tokenId || args[0]} issued to ${args.recipient || args[1] || "Unknown"}`
            break
          case "DegreeRevoked":
            description = `Degree #${args.tokenId || args[0]} revoked`
            break
          case "IssuerUpdated":
            description = `Issuer ${args.issuer || args[1] || "Unknown"} ${args.isActive ? "added" : "removed"} for University #${args.universityId || args[0]}`
            break
          case "RevokerUpdated":
            description = `Revoker ${args.revoker || args[1] || "Unknown"} ${args.isActive ? "added" : "removed"} for University #${args.universityId || args[0]}`
            break
          case "VerifierUpdated":
            description = `Verifier ${args.verifier || args[1] || "Unknown"} ${args.isActive ? "added" : "removed"} for University #${args.universityId || args[0]}`
            break
          case "DegreeRequested":
            description = `Degree request #${args.requestId || args[0]} created for University #${args.universityId || args[1]}`
            break
          case "DegreeRequestApproved":
            description = `Degree request #${args.requestId || args[0]} approved by ${args.verifier || args[1] || "Unknown"}`
            break
          case "RevocationRequested":
            description = `Revocation request #${args.requestId || args[0]} created for token #${args.tokenId || args[1]}`
            break
          default:
            description = `${decodedType} event`
        }
      } catch {
        description = `${decodedType} event`
      }

      return {
        id: event.id,
        type: decodedType,
        description,
        txHash: event.tx_hash,
        blockNumber: Number(event.block_number || 0),
        timestamp: event.created_at,
        contractAddress: event.contract_address,
      }
    })

    return NextResponse.json({
      events: formattedEvents,
      total: formattedEvents.length,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error("[AdminActivity] Error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to get activity",
        events: [],
        total: 0,
      },
      { status: 500 }
    )
  }
}
