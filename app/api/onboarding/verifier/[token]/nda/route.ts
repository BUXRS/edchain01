import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { accepted, signature } = body

    if (!accepted) {
      return NextResponse.json(
        { error: "NDA must be accepted" },
        { status: 400 }
      )
    }

    if (!signature || !signature.trim()) {
      return NextResponse.json(
        { error: "Signature (full name) is required" },
        { status: 400 }
      )
    }

    // Find verifier by onboarding token
    const verifiers = await sql`
      SELECT id, nda_signed FROM verifiers
      WHERE onboarding_token = ${token}
    `

    if (verifiers.length === 0) {
      return NextResponse.json(
        { error: "Invalid onboarding token" },
        { status: 404 }
      )
    }

    const verifier = verifiers[0]

    if (verifier.nda_signed) {
      return NextResponse.json(
        { error: "NDA already signed" },
        { status: 400 }
      )
    }

    // Update verifier with NDA signed and signature
    await sql`
      UPDATE verifiers
      SET 
        nda_signed = true,
        nda_signed_at = NOW(),
        nda_signature = ${signature.trim()},
        status = 'pending',
        updated_at = NOW()
      WHERE id = ${verifier.id}
    `

    return NextResponse.json({
      success: true,
      message: "NDA signed successfully",
    })
  } catch (error) {
    console.error("Error submitting NDA:", error)
    return NextResponse.json(
      { error: "Failed to submit NDA" },
      { status: 500 }
    )
  }
}
