import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: rawToken } = await params
    
    console.log(`[Onboarding] Raw token from params: ${rawToken?.substring(0, 20)}... (length: ${rawToken?.length || 0})`)
    
    // Decode URL-encoded token if needed
    let token: string
    try {
      token = decodeURIComponent(rawToken).trim()
    } catch (decodeError) {
      // If decoding fails, use raw token
      console.warn(`[Onboarding] URL decode failed, using raw token:`, decodeError)
      token = rawToken.trim()
    }

    console.log(`[Onboarding] Processed token: ${token.substring(0, 20)}... (length: ${token.length})`)

    if (!token || token.length === 0) {
      console.error("[Onboarding] Empty token provided")
      return NextResponse.json(
        { error: "Invalid onboarding token" },
        { status: 400 }
      )
    }

    // Validate token format (should be 64 hex characters, but allow some flexibility)
    // Remove any whitespace and validate
    const cleanToken = token.replace(/\s+/g, '')
    if (cleanToken.length !== 64 || !/^[a-f0-9]+$/i.test(cleanToken)) {
      console.error(`[Onboarding] Invalid token format: ${token.substring(0, 8)}... (length: ${token.length}, clean length: ${cleanToken.length})`)
      return NextResponse.json(
        { error: "Invalid onboarding token format" },
        { status: 400 }
      )
    }
    
    // Use cleaned token for database query
    const finalToken = cleanToken

    console.log(`[Onboarding] Searching for token: ${finalToken.substring(0, 8)}... (full length: ${finalToken.length})`)

    // First, check if the token exists in the registration table (case-sensitive exact match)
    let registrationCheck = await sql`
      SELECT 
        ur.id,
        ur.university_id,
        ur.onboarding_token,
        ur.created_at,
        ur.onboarding_token_expires_at
      FROM university_registrations ur
      WHERE ur.onboarding_token = ${finalToken}
      LIMIT 1
    `

    // If not found, try case-insensitive search as fallback
    if (registrationCheck.length === 0) {
      console.log(`[Onboarding] Exact match not found, trying case-insensitive search...`)
      registrationCheck = await sql`
        SELECT 
          ur.id,
          ur.university_id,
          ur.onboarding_token,
          ur.created_at,
          ur.onboarding_token_expires_at
        FROM university_registrations ur
        WHERE LOWER(ur.onboarding_token) = LOWER(${finalToken})
        LIMIT 1
      `
    }

    // If still not found, check if any tokens exist at all (for debugging)
    if (registrationCheck.length === 0) {
      const tokenCount = await sql`
        SELECT COUNT(*) as count 
        FROM university_registrations 
        WHERE onboarding_token IS NOT NULL
      `
      console.error(`[Onboarding] Token not found in database: ${finalToken.substring(0, 8)}...`)
      console.error(`[Onboarding] Total tokens in database: ${tokenCount[0]?.count || 0}`)
      
      // Also check for similar tokens (first 8 chars) for debugging
      const similarTokens = await sql`
        SELECT onboarding_token, created_at 
        FROM university_registrations 
        WHERE onboarding_token IS NOT NULL 
        AND onboarding_token LIKE ${finalToken.substring(0, 8) + '%'}
        LIMIT 5
      `
      if (similarTokens.length > 0) {
        console.error(`[Onboarding] Found ${similarTokens.length} tokens starting with same prefix:`, 
          similarTokens.map(t => ({ token: t.onboarding_token?.substring(0, 16) + '...', created: t.created_at })))
      }
      
      return NextResponse.json(
        { error: "Invalid onboarding token" },
        { status: 404 }
      )
    }

    const registrationRecord = registrationCheck[0]
    
    // Use the actual token from database (in case of case mismatch)
    const dbToken = registrationRecord.onboarding_token
    console.log(`[Onboarding] Token found! Database token: ${dbToken?.substring(0, 8)}..., university_id: ${registrationRecord.university_id}`)

    // Check if token is expired using expiration date if available, otherwise use 7-day default
    const now = new Date()
    let isExpired = false

    if (registrationRecord.onboarding_token_expires_at) {
      // Use explicit expiration date if set
      isExpired = new Date(registrationRecord.onboarding_token_expires_at) < now
    } else {
      // Fallback to 7-day default from created_at
      const tokenCreatedAt = new Date(registrationRecord.created_at)
      const daysDiff = (now.getTime() - tokenCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
      isExpired = daysDiff > 7
    }

    if (isExpired) {
      console.warn(`[Onboarding] Token expired: ${dbToken?.substring(0, 8)}...`)
      return NextResponse.json(
        { error: "This onboarding link has expired. Please contact the administrator for a new link." },
        { status: 410 } // 410 Gone - resource is no longer available
      )
    }

    // Now fetch full registration data with university info using the database token
    const registrations = await sql`
      SELECT 
        ur.*,
        u.name as university_name,
        u.admin_name,
        u.admin_email
      FROM university_registrations ur
      LEFT JOIN universities u ON ur.university_id = u.id
      WHERE ur.onboarding_token = ${dbToken}
      LIMIT 1
    `

    if (registrations.length === 0) {
      console.error(`[Onboarding] Registration not found after token check: ${finalToken.substring(0, 8)}...`)
      return NextResponse.json(
        { error: "Invalid onboarding token" },
        { status: 404 }
      )
    }

    const registration = registrations[0]

    // Check if university exists
    if (!registration.university_name || !registration.admin_name || !registration.admin_email) {
      console.error(`[Onboarding] University data missing for token: ${finalToken.substring(0, 8)}..., university_id: ${registration.university_id}`)
      return NextResponse.json(
        { error: "University information not found. Please contact support." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      universityName: registration.university_name,
      adminName: registration.admin_name,
      adminEmail: registration.admin_email,
      registrationType: registration.is_trial ? "trial" : "subscription",
      trialEndDate: registration.trial_end_date,
      ndaSigned: registration.nda_signed,
      walletSubmitted: registration.wallet_submitted,
      isExpired: false, // Already checked above
    })
  } catch (error) {
    console.error("[Onboarding] Error fetching onboarding data:", error)
    return NextResponse.json(
      { error: "Failed to fetch onboarding data. Please try again later." },
      { status: 500 }
    )
  }
}
