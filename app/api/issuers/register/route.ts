import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { sql, isDatabaseAvailable, getDbUniversityIdFromSessionId } from "@/lib/db"
import { 
  generatePassword, 
  generateOnboardingToken, 
  sendIssuerOnboardingEmail 
} from "@/lib/services/email-service"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

export async function POST(request: NextRequest) {
  // Same flow as Super Admin creating university: require session, use session university id
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) {
    return university
  }

  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      department,
      position,
    } = body

    // Resolve session id to DB primary key so issuer is stored under correct university_id
    const universityId = isDatabaseAvailable()
      ? (await getDbUniversityIdFromSessionId(Number(university.id))) ?? Number(university.id)
      : Number(university.id)

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Check database availability
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { 
          error: "Database is not configured. Please ensure DATABASE_URL is set.",
          suggestion: "Please ensure DATABASE_URL is configured and the database is accessible."
        },
        { status: 503 }
      )
    }

    // Check if email already exists for this university
    const existingIssuer = await sql`
      SELECT id FROM issuers 
      WHERE LOWER(email) = LOWER(${email}) AND university_id = ${universityId}
      LIMIT 1
    `

    if (existingIssuer && existingIssuer.length > 0) {
      return NextResponse.json(
        { error: "An issuer with this email already exists for this university" },
        { status: 400 }
      )
    }

    // Get university info for email
    const universities = await sql`
      SELECT id, name, name_ar, admin_email, admin_name
      FROM universities 
      WHERE id = ${universityId}
      LIMIT 1
    `

    if (!universities || universities.length === 0) {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 }
      )
    }

    const universityRow = universities[0] as { name?: string; name_ar?: string; admin_email?: string; admin_name?: string }
    const universityName = universityRow.name ?? "Your University"

    // Generate temporary password and onboarding token
    const temporaryPassword = generatePassword(12)
    const passwordHash = await bcrypt.hash(temporaryPassword, 10)
    const onboardingToken = generateOnboardingToken()
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create issuer record in database (pending activation)
    // DB columns: onboarding_token_expires_at, status (not onboarding_status)
    const result = await sql`
      INSERT INTO issuers (
        university_id,
        name,
        email,
        phone,
        department,
        position,
        password_hash,
        onboarding_token,
        onboarding_token_expires_at,
        status,
        is_active,
        added_by,
        created_at,
        updated_at
      ) VALUES (
        ${universityId},
        ${name},
        ${email.toLowerCase()},
        ${phone || null},
        ${department || null},
        ${position || null},
        ${passwordHash},
        ${onboardingToken},
        ${tokenExpiry.toISOString()},
        'pending_nda',
        false,
        ${university.walletAddress?.toLowerCase() || null},
        NOW(),
        NOW()
      )
      RETURNING id, name, email, status
    `

    const newIssuer = result[0] as { id: number; name: string; email: string; status: string }

    // Send onboarding email
    const emailResult = await sendIssuerOnboardingEmail({
      to: email,
      issuerName: name,
      universityName,
      temporaryPassword,
      onboardingToken,
    })

    if (!emailResult.success) {
      console.error("[v0] Failed to send issuer onboarding email:", emailResult.error)
    }

    return NextResponse.json({
      success: true,
      message: "Issuer registered successfully. Onboarding email sent.",
      issuer: {
        id: newIssuer.id,
        name: newIssuer.name,
        email: newIssuer.email,
        status: newIssuer.status,
        emailSent: emailResult.success,
      },
    })
  } catch (error) {
    console.error("Error registering issuer:", error)
    return NextResponse.json(
      { error: "Failed to register issuer" },
      { status: 500 }
    )
  }
}
