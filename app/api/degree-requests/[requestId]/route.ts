/**
 * Single degree request with approvals (DB-only)
 * GET /api/degree-requests/[requestId]
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const id = Number(requestId)
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Invalid requestId" }, { status: 400 })
    }

    const rows = await sql`
      SELECT 
        dr.*,
        u.name_en as university_name,
        u.name_ar as university_name_ar,
        u.blockchain_id as university_blockchain_id
      FROM degree_requests dr
      LEFT JOIN universities u ON dr.university_id = u.id
      WHERE dr.request_id = ${id}
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }
    const req = rows[0]

    const approvals = await sql`
      SELECT verifier_address, approved_at, tx_hash, block_number, log_index
      FROM degree_request_approvals
      WHERE request_id = ${id}
      ORDER BY approved_at ASC
    `

    return NextResponse.json({
      request_id: req.request_id,
      university_id: req.university_id,
      university_blockchain_id: req.university_blockchain_id,
      recipient_address: req.recipient_address,
      requester_address: req.requester_address,
      gpa: req.gpa,
      year: req.year,
      approval_count: req.approval_count ?? 0,
      required_approvals: req.required_approvals ?? 0,
      status: req.status,
      student_name: req.student_name,
      student_name_ar: req.student_name_ar,
      faculty_en: req.faculty_en,
      faculty_ar: req.faculty_ar,
      major_en: req.major_en,
      major_ar: req.major_ar,
      degree_name_en: req.degree_name_en,
      degree_name_ar: req.degree_name_ar,
      name_en: req.name_en,
      name_ar: req.name_ar,
      created_at: req.created_at,
      requested_at: req.requested_at,
      executed_at: req.executed_at,
      token_id: req.token_id,
      university_name: req.university_name,
      university_name_ar: req.university_name_ar,
      created_tx_hash: req.created_tx_hash,
      created_block_number: req.created_block_number,
      approvals: approvals.map((a: any) => ({
        verifier_address: a.verifier_address,
        approved_at: a.approved_at,
        tx_hash: a.tx_hash,
        block_number: a.block_number,
        log_index: a.log_index,
      })),
    })
  } catch (error) {
    console.error("Error fetching degree request:", error)
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    )
  }
}
