import { type NextRequest, NextResponse } from "next/server"
import { sql, getDbUniversityIdFromSessionId } from "@/lib/db"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"
import { sendIssuerWalletRequestEmail } from "@/lib/services/email-service"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) return university

  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "Issuer ID required" }, { status: 400 })

    const universityId = (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)
    const rows = await sql`
      SELECT id, email, name, onboarding_token FROM issuers
      WHERE id = ${Number(id)} AND university_id = ${universityId}
      LIMIT 1
    `
    if (!rows?.length) return NextResponse.json({ error: "Issuer not found" }, { status: 404 })

    const row = rows[0] as { email: string; name: string | null; onboarding_token: string | null }
    const onboardingUrl = row.onboarding_token
      ? `${baseUrl}/onboarding/issuer/${row.onboarding_token}`
      : `${baseUrl}/issuer/login`

    const result = await sendIssuerWalletRequestEmail({
      to: row.email,
      issuerName: row.name || "Issuer",
      universityName: university.name ?? "Your University",
      onboardingUrl,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error ?? "Failed to send email" }, { status: 502 })
    }
    return NextResponse.json({ success: true, message: "Wallet request email sent." })
  } catch (e) {
    console.error("[RequestWallet] Error:", e)
    return NextResponse.json({ error: "Failed to send wallet request" }, { status: 500 })
  }
}
