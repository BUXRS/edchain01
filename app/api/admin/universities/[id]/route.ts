import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { id } = await params

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
        ur.payment_method,
        ur.payment_reference,
        ur.wallet_address as submitted_wallet_address
      FROM universities u
      LEFT JOIN university_registrations ur ON u.id = ur.university_id
      WHERE u.id = ${id}
    `

    if (universities.length === 0) {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 }
      )
    }

    const university = universities[0]
    
    // Use submitted wallet if main wallet is not set
    if (!university.wallet_address && university.submitted_wallet_address) {
      university.wallet_address = university.submitted_wallet_address
    }

    return NextResponse.json({ university })
  } catch (error) {
    console.error("Error fetching university:", error)
    return NextResponse.json(
      { error: "Failed to fetch university" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { id } = await params
    const body = await request.json()

    // Build update query using conditional SQL fragments (postgres package style)
    let updateClause = sql``
    let hasUpdate = false

    if (body.name !== undefined) {
      updateClause = sql`name = ${body.name}`
      hasUpdate = true
    }
    if (body.name_ar !== undefined) {
      updateClause = hasUpdate
        ? sql`${updateClause}, name_ar = ${body.name_ar}`
        : sql`name_ar = ${body.name_ar}`
      hasUpdate = true
    }
    if (body.status !== undefined) {
      updateClause = hasUpdate
        ? sql`${updateClause}, status = ${body.status}`
        : sql`status = ${body.status}`
      hasUpdate = true
    }
    if (body.is_active !== undefined) {
      updateClause = hasUpdate
        ? sql`${updateClause}, is_active = ${body.is_active}`
        : sql`is_active = ${body.is_active}`
      hasUpdate = true
    }

    if (!hasUpdate) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    // Update the university
    await sql`
      UPDATE universities 
      SET ${updateClause}, updated_at = NOW()
      WHERE id = ${id}
    `

    // Fetch the updated university
    const updatedUniversities = await sql`
      SELECT 
        u.*,
        ur.registration_type,
        ur.is_trial,
        ur.trial_end_date,
        ur.nda_signed,
        ur.wallet_submitted,
        ur.account_activated,
        ur.payment_status,
        ur.payment_method,
        ur.payment_reference,
        ur.wallet_address as submitted_wallet_address
      FROM universities u
      LEFT JOIN university_registrations ur ON u.id = ur.university_id
      WHERE u.id = ${id}
    `

    if (updatedUniversities.length === 0) {
      return NextResponse.json(
        { error: "University not found after update" },
        { status: 404 }
      )
    }

    const university = updatedUniversities[0]
    
    // Use submitted wallet if main wallet is not set
    if (!university.wallet_address && university.submitted_wallet_address) {
      university.wallet_address = university.submitted_wallet_address
    }

    return NextResponse.json({ 
      success: true,
      university 
    })
  } catch (error: any) {
    console.error("Error updating university:", error)
    return NextResponse.json(
      { error: "Failed to update university", details: error.message },
      { status: 500 }
    )
  }
}
