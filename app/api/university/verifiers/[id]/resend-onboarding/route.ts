import { type NextRequest, NextResponse } from "next/server"
import { sql, getDbUniversityIdFromSessionId } from "@/lib/db"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"
import { sendVerifierOnboardingReminderEmail } from "@/lib/services/email-service"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"
const loginUrl = `${baseUrl}/verifier/login`

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) return university

  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "Verifier ID required" }, { status: 400 })

    const universityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)
    const rows = await sql`
      SELECT id, email, name FROM verifiers
      WHERE id = ${Number(id)} AND university_id = ${universityId}
      LIMIT 1
    `
    if (!rows?.length) return NextResponse.json({ error: "Verifier not found" }, { status: 404 })

    const row = rows[0] as { email: string; name: string | null }
    const result = await sendVerifierOnboardingReminderEmail({
      to: row.email,
      verifierName: row.name || "Verifier",
      universityName: university.name ?? "Your University",
      loginUrl,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error ?? "Failed to send email" }, { status: 502 })
    }
    return NextResponse.json({ success: true, message: "Onboarding reminder email sent." })
  } catch (e) {
    console.error("[VerifierResendOnboarding] Error:", e)
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 })
  }
}
