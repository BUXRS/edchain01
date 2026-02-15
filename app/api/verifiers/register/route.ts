import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { sql, isDatabaseAvailable, getDbUniversityIdFromSessionId } from "@/lib/db"
import { 
  generatePassword, 
  generateOnboardingToken, 
  sendVerifierOnboardingEmail 
} from "@/lib/services/email-service"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

export async function POST(request: NextRequest) {
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

    // Resolve session id to DB primary key (same as issuers/register) so verifier is stored under correct university_id
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
    const existingVerifier = await sql`
      SELECT id FROM verifiers 
      WHERE LOWER(email) = LOWER(${email}) AND university_id = ${universityId}
      LIMIT 1
    `

    if (existingVerifier && existingVerifier.length > 0) {
      return NextResponse.json(
        { error: "A verifier with this email already exists for this university" },
        { status: 400 }
      )
    }

    // Check verifier count limit (max 3)
    const verifierCount = await sql`
      SELECT COUNT(*) as count FROM verifiers 
      WHERE university_id = ${universityId} AND is_active = true
    `
    const count = Number(verifierCount[0]?.count || 0)
    if (count >= 3) {
      return NextResponse.json(
        { error: "Maximum 3 verifiers allowed per university" },
        { status: 400 }
      )
    }

    // Get university info for email
    let universities = await sql`
      SELECT id, name, name_ar, admin_email, admin_name
      FROM universities 
      WHERE id = ${universityId}
      LIMIT 1
    `

    // If university not found in DB, try to sync from blockchain
    if (!universities || universities.length === 0) {
      try {
        // Try to sync university from blockchain
        const { blockchainSync } = await import("@/lib/services/blockchain-sync")
        const syncResult = await blockchainSync.syncUniversity(universityId)
        
        if (syncResult.success) {
          // Retry query after sync
          universities = await sql`
            SELECT id, name, name_ar, admin_email, admin_name
            FROM universities 
            WHERE id = ${universityId}
            LIMIT 1
          `
        }
      } catch (syncError) {
        console.error("Error syncing university from blockchain:", syncError)
      }
    }

    if (!universities || universities.length === 0) {
      return NextResponse.json(
        { error: "University not found. Please ensure the university is registered on blockchain and synced to database." },
        { status: 404 }
      )
    }

    const universityRow = universities[0] as { name?: string; name_ar?: string; admin_email?: string; admin_name?: string }

    // Generate temporary password (16 characters) and onboarding token
    const temporaryPassword = generatePassword(16)
    const passwordHash = await bcrypt.hash(temporaryPassword, 10)
    const onboardingToken = generateOnboardingToken()
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Insert verifier into database
    const result = await sql`
      INSERT INTO verifiers (
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
        added_by,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        ${universityId},
        ${name},
        ${email.toLowerCase()},
        ${phone || null},
        ${department || null},
        ${position || null},
        ${passwordHash},
        ${onboardingToken},
        ${tokenExpiry},
        'pending',
        ${university.walletAddress?.toLowerCase() || null},
        false,
        NOW(),
        NOW()
      )
      RETURNING id, name, email, status
    `

    const newVerifier = result[0] as { id: number; name: string; email: string; status: string }

    // Send verifier onboarding email (to the verifier's email address)
    const emailResult = await sendVerifierOnboardingEmail({
      to: String(email).trim().toLowerCase(),
      verifierName: String(name).trim(),
      universityName: universityRow.name ?? "Your University",
      temporaryPassword: temporaryPassword,
      onboardingToken: onboardingToken,
    })

    if (!emailResult.success) {
      console.error("[v0] Failed to send verifier onboarding email:", emailResult.error)
    }

    return NextResponse.json({
      success: true,
      message: emailResult.success
        ? "Verifier registered successfully. Onboarding email sent."
        : "Verifier registered but onboarding email could not be sent. Check RESEND_API_KEY and logs.",
      verifier: {
        id: newVerifier.id,
        name: newVerifier.name,
        email: newVerifier.email,
        status: newVerifier.status,
        emailSent: emailResult.success,
      },
    })
  } catch (error: any) {
    console.error("Error registering verifier:", error)
    return NextResponse.json(
      { 
        error: "Failed to register verifier",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    )
  }
}
