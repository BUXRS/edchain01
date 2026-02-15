import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { generatePassword, generateOnboardingToken, sendWelcomeEmail } from "@/lib/services/email-service"
import { registerUniversity } from "@/lib/blockchain"
import { sql, sqlJoin, isDatabaseAvailable } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function POST(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }
  try {
    // Check database availability first
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { 
          error: "Database is not configured. Please ensure DATABASE_URL is set in environment variables.",
          suggestion: "You can still use 'Blockchain Only' registration which doesn't require a database."
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const {
      name,
      nameAr,
      adminName,
      adminEmail,
      phone,
      address,
      city,
      country,
      website,
      isTrial,
      trialDays,
      subscriptionPlan,
      notes,
    } = body

    // Validate required fields
    if (!name || !adminName || !adminEmail) {
      return NextResponse.json(
        { error: "Name, admin name, and admin email are required" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUniversity = await sql`
      SELECT id FROM universities WHERE admin_email = ${adminEmail}
    `

    if (existingUniversity.length > 0) {
      return NextResponse.json(
        { error: "A university with this admin email already exists" },
        { status: 400 }
      )
    }

    // Generate credentials
    const password = generatePassword()
    const passwordHash = await bcrypt.hash(password, 10)
    const onboardingToken = generateOnboardingToken()

    // Calculate trial end date
    const trialEndDate = isTrial
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      : null

    // Create university in database
    const universities = await sql`
      INSERT INTO universities (
        name,
        name_ar,
        admin_name,
        admin_email,
        admin_password_hash,
        phone,
        address,
        city,
        subscription_type,
        subscription_expires_at,
        is_active,
        status,
        created_at
      ) VALUES (
        ${name},
        ${nameAr || null},
        ${adminName},
        ${adminEmail},
        ${passwordHash},
        ${phone || null},
        ${address || null},
        ${city || null},
        ${isTrial ? "trial" : subscriptionPlan},
        ${trialEndDate},
        false,
        'pending',
        NOW()
      )
      RETURNING id
    `

    const universityId = universities[0].id

    // Create registration record
    await sql`
      INSERT INTO university_registrations (
        university_id,
        registration_type,
        subscription_plan,
        trial_start_date,
        trial_end_date,
        is_trial,
        payment_status,
        onboarding_token,
        created_at
      ) VALUES (
        ${universityId},
        'admin_added',
        ${isTrial ? "trial" : subscriptionPlan},
        ${isTrial ? new Date() : null},
        ${trialEndDate},
        ${isTrial},
        ${isTrial ? "pending" : "completed"},
        ${onboardingToken},
        NOW()
      )
    `

    // Send welcome email
    console.log(`[UniversityRegistration] 📧 Attempting to send welcome email to ${adminEmail}`)
    const emailResult = await sendWelcomeEmail({
      to: adminEmail,
      universityName: name,
      adminName,
      password,
      onboardingToken,
      trialEndDate: trialEndDate ? trialEndDate.toLocaleDateString() : undefined,
      isTrialAccount: isTrial,
      trialDays,
    })

    if (!emailResult.success) {
      console.error(`[UniversityRegistration] ❌ Failed to send welcome email:`, emailResult.error)
      // Don't fail the registration if email fails, but log it and include in response
      return NextResponse.json({
        success: true,
        university: {
          id: universityId,
          name,
          adminEmail,
        },
        message: "University created successfully",
        warning: "Email could not be sent. Please send credentials manually.",
        credentials: {
          email: adminEmail,
          password,
          onboardingToken,
          onboardingUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"}/onboarding/${onboardingToken}`,
        },
        emailError: emailResult.error,
      })
    }

    console.log(`[UniversityRegistration] ✅ Welcome email sent successfully to ${adminEmail}`)

    // Log activity
    await sql`
      INSERT INTO activity_logs (
        action,
        entity_type,
        entity_id,
        details,
        created_at
      ) VALUES (
        'university_created',
        'university',
        ${universityId},
        ${JSON.stringify({ name, adminEmail, isTrial, trialDays })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      university: {
        id: universityId,
        name,
        adminEmail,
      },
      message: "University created and invitation email sent",
    })
  } catch (error) {
    console.error("Error creating university:", error)
    return NextResponse.json(
      { error: "Failed to create university" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const includeRegistration = searchParams.get("includeRegistration") === "true"
    const search = searchParams.get("search") || ""
    const hasAdmin = searchParams.get("hasAdmin") // "true" | "false" | null
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = (page - 1) * limit
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Build WHERE conditions
    const conditions: any[] = []
    
    if (status) {
      conditions.push(sql`u.status = ${status}`)
    }
    
    if (search) {
      conditions.push(sql`(
        u.name_en ILIKE ${`%${search}%`} OR
        u.name_ar ILIKE ${`%${search}%`} OR
        u.admin_email ILIKE ${`%${search}%`} OR
        u.admin_wallet ILIKE ${`%${search}%`} OR
        CAST(u.blockchain_id AS TEXT) ILIKE ${`%${search}%`}
      )`)
    }
    
    if (hasAdmin === "true") {
      conditions.push(sql`u.admin_wallet IS NOT NULL AND u.admin_wallet != ''`)
    } else if (hasAdmin === "false") {
      conditions.push(sql`(u.admin_wallet IS NULL OR u.admin_wallet = '')`)
    }

    const whereClause = conditions.length > 0 
      ? sql`WHERE ${sqlJoin(conditions, sql` AND `)}`
      : sql``

    // Validate sortBy to prevent SQL injection
    const validSortColumns: Record<string, string> = {
      "created_at": "u.created_at",
      "name_en": "u.name_en",
      "name_ar": "u.name_ar",
      "blockchain_id": "u.blockchain_id",
      "is_active": "u.is_active",
      "status": "u.status",
    }
    const sortColumn = validSortColumns[sortBy] || validSortColumns["created_at"]
    const safeSortOrder = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC"

    // Get total count for pagination
    const totalResult = await sql`
      SELECT COUNT(*) as count
      FROM universities u
      ${whereClause}
    `
    const total = Number(totalResult[0]?.count || 0)

    // Build ORDER BY clause based on sort column
    let orderByClause
    if (sortColumn === "u.created_at") {
      orderByClause = sql`ORDER BY u.created_at ${sql.unsafe(safeSortOrder)}`
    } else if (sortColumn === "u.name_en") {
      orderByClause = sql`ORDER BY u.name_en ${sql.unsafe(safeSortOrder)}`
    } else if (sortColumn === "u.name_ar") {
      orderByClause = sql`ORDER BY u.name_ar ${sql.unsafe(safeSortOrder)}`
    } else if (sortColumn === "u.blockchain_id") {
      orderByClause = sql`ORDER BY u.blockchain_id ${sql.unsafe(safeSortOrder)} NULLS LAST`
    } else if (sortColumn === "u.is_active") {
      orderByClause = sql`ORDER BY u.is_active ${sql.unsafe(safeSortOrder)}`
    } else {
      orderByClause = sql`ORDER BY u.status ${sql.unsafe(safeSortOrder)}`
    }

    // Get universities with aggregated stats
    const universities = await sql`
      SELECT 
        u.*,
        ur.registration_type,
        ur.is_trial,
        ur.trial_end_date,
        ur.nda_signed,
        ur.wallet_submitted,
        ur.account_activated,
        ur.payment_status,
        -- Aggregated role counts
        COALESCE(issuer_counts.issuers_count, 0) as issuers_count,
        COALESCE(revoker_counts.revokers_count, 0) as revokers_count,
        COALESCE(verifier_counts.verifiers_count, 0) as verifiers_count,
        -- Degree counts
        COALESCE(degree_stats.degrees_issued, 0) as degrees_issued,
        COALESCE(degree_stats.degrees_revoked, 0) as degrees_revoked,
        -- Request counts
        COALESCE(request_stats.pending_degree_requests, 0) as pending_degree_requests,
        COALESCE(request_stats.pending_revocation_requests, 0) as pending_revocation_requests,
        -- Last activity (from chain_events)
        last_activity.last_event_at
      FROM universities u
      LEFT JOIN university_registrations ur ON u.id = ur.university_id
      LEFT JOIN (
        SELECT 
          university_id,
          COUNT(*) FILTER (WHERE is_active = true AND blockchain_verified = true) as issuers_count
        FROM issuers
        GROUP BY university_id
      ) issuer_counts ON u.id = issuer_counts.university_id
      LEFT JOIN (
        SELECT 
          university_id,
          COUNT(*) FILTER (WHERE is_active = true AND blockchain_verified = true) as revokers_count
        FROM revokers
        GROUP BY university_id
      ) revoker_counts ON u.id = revoker_counts.university_id
      LEFT JOIN (
        SELECT 
          university_id,
          COUNT(*) FILTER (WHERE is_active = true AND blockchain_verified = true) as verifiers_count
        FROM verifiers
        GROUP BY university_id
      ) verifier_counts ON u.id = verifier_counts.university_id
      LEFT JOIN (
        SELECT 
          university_id,
          COUNT(*) FILTER (WHERE is_revoked = false) as degrees_issued,
          COUNT(*) FILTER (WHERE is_revoked = true) as degrees_revoked
        FROM degrees
        GROUP BY university_id
      ) degree_stats ON u.id = degree_stats.university_id
      LEFT JOIN (
        SELECT 
          university_id,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_degree_requests,
          0 as pending_revocation_requests
        FROM degree_requests
        GROUP BY university_id
      ) request_stats ON u.id = request_stats.university_id
      LEFT JOIN (
        SELECT 
          (event_data->>'universityId')::int as university_id,
          MAX(created_at) as last_event_at
        FROM chain_events
        WHERE event_name IN ('UniversityRegistered', 'DegreeIssued', 'DegreeRevoked', 'IssuerUpdated', 'RevokerUpdated')
          AND event_data IS NOT NULL
        GROUP BY (event_data->>'universityId')::int
      ) last_activity ON u.blockchain_id = last_activity.university_id
      ${whereClause}
      ${orderByClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return NextResponse.json({
      universities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        status: status || null,
        search: search || null,
        hasAdmin: hasAdmin || null,
      },
      sort: {
        sortBy: sortBy,
        sortOrder: safeSortOrder.toLowerCase(),
      },
    })
  } catch (error) {
    console.error("Error fetching universities:", error)
    return NextResponse.json(
      { error: "Failed to fetch universities" },
      { status: 500 }
    )
  }
}
