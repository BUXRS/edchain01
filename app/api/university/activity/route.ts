/**
 * University Activity Endpoint
 *
 * Same concept as Super Admin activity but filtered to events for this university.
 * Uses chain_events where event_data.universityId matches this university's blockchain_id.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql, getDbUniversityIdFromSessionId } from "@/lib/db"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

export async function GET(request: NextRequest) {
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) {
    return university
  }

  try {
    const dbUniversityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    // Get this university's blockchain_id (chain events use blockchain id)
    const uniRow = await sql`
      SELECT blockchain_id FROM universities WHERE id = ${dbUniversityId} LIMIT 1
    `
    const blockchainId = uniRow[0]?.blockchain_id != null ? String(uniRow[0].blockchain_id) : null

    if (!blockchainId) {
      return NextResponse.json({
        events: [],
        total: 0,
        limit,
        offset,
      })
    }

    // Get recent chain events for this university (event_data.universityId matches blockchain_id)
    const events = await sql`
      SELECT 
        id, event_name, block_number, tx_hash, event_data, created_at,
        contract_address
      FROM chain_events
      WHERE processed = true
        AND (event_data->>'universityId') = ${blockchainId}
      ORDER BY block_number DESC, id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    const formattedEvents = events.map((event: Record<string, unknown>) => {
      let decodedType = (event.event_name as string) || "Unknown"
      let description = ""
      try {
        const args = typeof event.event_data === "string"
          ? JSON.parse(event.event_data as string)
          : (event.event_data as Record<string, unknown>) || {}
        switch (event.event_name) {
          case "DegreeIssued":
            description = `Degree #${args.tokenId ?? args[0]} issued to ${(args.recipient ?? args[1] ?? "Unknown") as string}`
            break
          case "DegreeRevoked":
            description = `Degree #${args.tokenId ?? args[0]} revoked`
            break
          case "IssuerUpdated":
            description = `Issuer ${(args.issuer ?? args[1] ?? "Unknown") as string} ${args.isActive ? "added" : "removed"}`
            break
          case "RevokerUpdated":
            description = `Revoker ${(args.revoker ?? args[1] ?? "Unknown") as string} ${args.isActive ? "added" : "removed"}`
            break
          case "VerifierUpdated":
            description = `Verifier ${(args.verifier ?? args[1] ?? "Unknown") as string} ${args.isActive ? "added" : "removed"}`
            break
          case "DegreeRequested":
            description = `Degree request #${args.requestId ?? args[0]} created`
            break
          case "DegreeRequestApproved":
            description = `Degree request #${args.requestId ?? args[0]} approved`
            break
          case "RevocationRequested":
            description = `Revocation request #${args.requestId ?? args[0]} for token #${args.tokenId ?? args[1]}`
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
        blockNumber: Number(event.block_number ?? 0),
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[UniversityActivity] Error:", error)
    return NextResponse.json(
      { error: message, events: [], total: 0 },
      { status: 500 }
    )
  }
}
