import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    // issuers table uses "status" not "onboarding_status"
    const issuers = await sql`
      SELECT 
        i.id, i.name, i.email, i.status,
        u.name as university_name, u.id as university_id
      FROM issuers i
      JOIN universities u ON i.university_id = u.id
      WHERE i.onboarding_token = ${token}
    `

    if (issuers.length === 0) {
      return NextResponse.json({ error: "Invalid or expired onboarding link" }, { status: 404 })
    }

    const issuer = issuers[0] as { id: number; name: string; email: string; status: string; university_name: string; university_id: number }

    return NextResponse.json({
      issuer: {
        id: issuer.id,
        name: issuer.name,
        email: issuer.email,
        universityName: issuer.university_name,
        universityId: issuer.university_id,
        onboardingStatus: issuer.status,
      }
    })
  } catch (error) {
    console.error("[v0] Error fetching issuer onboarding:", error)
    return NextResponse.json({ error: "Failed to fetch onboarding data" }, { status: 500 })
  }
}
