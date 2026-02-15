import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendRoleActivationEmail } from "@/lib/services/email-service"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const university = await requireUniversity(request)
    if (isErrorResponse(university)) return university

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { walletAddress: bodyWallet, txHash } = body

    if (!id) {
      return NextResponse.json({ error: "Revoker ID required" }, { status: 400 })
    }

    const universityId = Number(university.id)
    const existing = await sql`
      SELECT r.id, r.name, r.email, r.wallet_address, r.pending_wallet_address, r.status,
             u.name as university_name
      FROM revokers r
      JOIN universities u ON r.university_id = u.id
      WHERE r.id = ${Number(id)} AND r.university_id = ${universityId}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "Revoker not found" }, { status: 404 })
    }

    const revoker = existing[0] as {
      id: number
      name: string
      email: string
      wallet_address: string | null
      pending_wallet_address: string | null
      status: string
      university_name: string
    }
    const finalWallet =
      bodyWallet || revoker.pending_wallet_address || revoker.wallet_address

    if (!finalWallet) {
      return NextResponse.json(
        { error: "Wallet address required. Provide walletAddress or ensure revoker has submitted one." },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE revokers 
      SET 
        wallet_address = ${finalWallet.toLowerCase()},
        pending_wallet_address = NULL,
        status = 'active',
        is_active = true,
        blockchain_added_at = NOW(),
        blockchain_verified = true,
        tx_hash = ${txHash || null},
        updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING id, name, email, wallet_address
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Revoker not found" }, { status: 404 })
    }

    try {
      await sendRoleActivationEmail({
        to: revoker.email,
        roleName: revoker.name,
        universityName: revoker.university_name,
        personName: revoker.name,
        walletAddress: finalWallet.toLowerCase(),
        role: "revoker",
      })
    } catch (emailError) {
      console.error("Failed to send revoker activation email:", emailError)
    }

    return NextResponse.json({
      success: true,
      revoker: result[0],
    })
  } catch (error) {
    console.error("[v0] Error activating revoker:", error)
    return NextResponse.json({ error: "Failed to activate revoker" }, { status: 500 })
  }
}
