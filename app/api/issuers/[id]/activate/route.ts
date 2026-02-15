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
      return NextResponse.json({ error: "Issuer ID required" }, { status: 400 })
    }

    const universityId = Number(university.id)
    const existing = await sql`
      SELECT i.id, i.name, i.email, i.wallet_address, i.pending_wallet_address, i.status,
             i.university_id, u.name as university_name
      FROM issuers i
      JOIN universities u ON i.university_id = u.id
      WHERE i.id = ${Number(id)} AND i.university_id = ${universityId}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 })
    }

    const issuer = existing[0] as {
      id: number
      name: string
      email: string
      wallet_address: string | null
      pending_wallet_address: string | null
      status: string
      university_name: string
    }
    const finalWallet =
      bodyWallet || issuer.pending_wallet_address || issuer.wallet_address

    if (!finalWallet) {
      return NextResponse.json(
        { error: "Wallet address required. Provide walletAddress or ensure issuer has submitted one." },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE issuers 
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
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 })
    }

    try {
      await sendRoleActivationEmail({
        to: issuer.email,
        roleName: issuer.name,
        universityName: issuer.university_name,
        personName: issuer.name,
        walletAddress: finalWallet.toLowerCase(),
        role: "issuer",
      })
    } catch (emailError) {
      console.error("Failed to send issuer activation email:", emailError)
    }

    return NextResponse.json({
      success: true,
      issuer: result[0],
    })
  } catch (error) {
    console.error("[v0] Error activating issuer:", error)
    return NextResponse.json({ error: "Failed to activate issuer" }, { status: 500 })
  }
}
