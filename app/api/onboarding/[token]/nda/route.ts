import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { accepted } = body

    if (!accepted) {
      return NextResponse.json(
        { error: "NDA must be accepted" },
        { status: 400 }
      )
    }

    // Find registration by onboarding token
    const registrations = await sql`
      SELECT id, nda_signed FROM university_registrations
      WHERE onboarding_token = ${token}
    `

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "Invalid onboarding token" },
        { status: 404 }
      )
    }

    const registration = registrations[0]

    if (registration.nda_signed) {
      return NextResponse.json(
        { error: "NDA already signed" },
        { status: 400 }
      )
    }

    // Update registration with NDA signed
    await sql`
      UPDATE university_registrations
      SET 
        nda_signed = true,
        nda_signed_at = NOW()
      WHERE id = ${registration.id}
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
