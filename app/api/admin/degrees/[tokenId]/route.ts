/**
 * Admin Degree Detail Endpoint
 * 
 * Returns comprehensive degree detail with audit trail
 * All data from DB projection
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { tokenId } = await params
    const tokenIdStr = String(tokenId).trim()

    if (!tokenIdStr || tokenIdStr === "undefined" || tokenIdStr === "null") {
      return NextResponse.json(
        { error: "Invalid token ID" },
        { status: 400 }
      )
    }

    // Get degree from database (token_id is stored as VARCHAR, so compare as string)
    const degrees = await sql`
      SELECT 
        d.*,
        u.name_en as university_name,
        u.name_ar as university_name_ar,
        u.blockchain_id as university_blockchain_id,
        u.wallet_address as university_wallet
      FROM degrees d
      LEFT JOIN universities u ON d.university_id = u.id
      WHERE d.token_id = ${tokenIdStr}
      LIMIT 1
    `

    if (degrees.length === 0) {
      return NextResponse.json(
        { error: "Degree not found" },
        { status: 404 }
      )
    }

    const degree = degrees[0]

    // Get related events from chain_events
    const events = await sql`
      SELECT 
        event_type,
        event_data,
        block_number,
        transaction_hash,
        created_at
      FROM chain_events
      WHERE event_data->>'tokenId' = ${tokenIdStr}
         OR event_data->>'token_id' = ${tokenIdStr}
      ORDER BY created_at DESC
      LIMIT 20
    `

    // Get issuer info if available
    let issuerInfo = null
    if (degree.issued_by) {
      const issuers = await sql`
        SELECT name, email, department, position
        FROM issuers
        WHERE wallet_address = ${degree.issued_by}
        LIMIT 1
      `
      if (issuers.length > 0) {
        issuerInfo = issuers[0]
      }
    }

    // Get revoker info if available
    let revokerInfo = null
    if (degree.revoked_by) {
      const revokers = await sql`
        SELECT name, email, department, position
        FROM revokers
        WHERE wallet_address = ${degree.revoked_by}
        LIMIT 1
      `
      if (revokers.length > 0) {
        revokerInfo = revokers[0]
      }
    }

    return NextResponse.json({
      degree: {
        id: degree.id,
        tokenId: degree.token_id,
        studentAddress: degree.student_address,
        studentName: degree.student_name,
        studentNameAr: degree.student_name_ar,
        universityId: degree.university_id,
        universityName: degree.university_name,
        universityNameAr: degree.university_name_ar,
        universityBlockchainId: degree.university_blockchain_id,
        universityWallet: degree.university_wallet,
        degreeType: degree.degree_type,
        degreeTypeAr: degree.degree_type_ar,
        major: degree.major,
        majorAr: degree.major_ar,
        graduationDate: degree.graduation_date,
        cgpa: degree.cgpa,
        honors: degree.honors,
        honorsAr: degree.honors_ar,
        ipfsHash: degree.ipfs_hash,
        isRevoked: degree.is_revoked,
        revokedBy: degree.revoked_by,
        revokedAt: degree.revoked_at,
        revocationReason: degree.revocation_reason,
        txHash: degree.tx_hash,
        issuedBy: degree.issued_by,
        issuerInfo,
        revokerInfo,
        createdAt: degree.created_at,
        updatedAt: degree.updated_at,
        status: degree.is_revoked ? "revoked" : "active",
      },
      events: events.map((e: any) => ({
        eventType: e.event_type,
        eventData: e.event_data,
        blockNumber: e.block_number,
        transactionHash: e.transaction_hash,
        createdAt: e.created_at,
      })),
    })
  } catch (error: any) {
    console.error("[AdminDegreeDetail] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch degree detail", details: error.message },
      { status: 500 }
    )
  }
}
