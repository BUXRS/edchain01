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

    // revokers table uses "status" not "onboarding_status"
    const revokers = await sql`
      SELECT 
        r.id, r.name, r.email, r.status,
        u.name as university_name, u.id as university_id
      FROM revokers r
      JOIN universities u ON r.university_id = u.id
      WHERE r.onboarding_token = ${token}
    `

    if (revokers.length === 0) {
      return NextResponse.json({ error: "Invalid or expired onboarding link" }, { status: 404 })
    }

    const revoker = revokers[0] as { id: number; name: string; email: string; status: string; university_name: string; university_id: number }

    return NextResponse.json({
      revoker: {
        id: revoker.id,
        name: revoker.name,
        email: revoker.email,
        universityName: revoker.university_name,
        universityId: revoker.university_id,
        onboardingStatus: revoker.status,
      }
    })
  } catch (error) {
    console.error("[v0] Error fetching revoker onboarding:", error)
    return NextResponse.json({ error: "Failed to fetch onboarding data" }, { status: 500 })
  }
}
