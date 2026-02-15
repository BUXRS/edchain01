import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { days } = body

    if (!days || days < 1) {
      return NextResponse.json(
        { error: "Invalid number of days" },
        { status: 400 }
      )
    }

    // Get current trial end date
    const registrations = await sql`
      SELECT trial_end_date, is_trial
      FROM university_registrations
      WHERE university_id = ${id}
    `

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      )
    }

    const registration = registrations[0]

    if (!registration.is_trial) {
      return NextResponse.json(
        { error: "University is not on a trial plan" },
        { status: 400 }
      )
    }

    // Calculate new trial end date
    const currentEndDate = registration.trial_end_date
      ? new Date(registration.trial_end_date)
      : new Date()
    
    // If expired, extend from today; otherwise extend from current end date
    const baseDate = currentEndDate < new Date() ? new Date() : currentEndDate
    const newEndDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

    // Update registration
    await sql`
      UPDATE university_registrations
      SET 
        trial_end_date = ${newEndDate}
      WHERE university_id = ${id}
    `

    // Update university subscription expiry
    await sql`
      UPDATE universities
      SET 
        subscription_expires_at = ${newEndDate},
        is_active = true,
        status = 'active'
      WHERE id = ${id}
    `

    // Log activity
    await sql`
      INSERT INTO activity_logs (
        action,
        entity_type,
        entity_id,
        details,
        created_at
      ) VALUES (
        'trial_extended',
        'university',
        ${id},
        ${JSON.stringify({ days, newEndDate: newEndDate.toISOString() })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: `Trial extended by ${days} days`,
      newEndDate: newEndDate.toISOString(),
    })
  } catch (error) {
    console.error("Error extending trial:", error)
    return NextResponse.json(
      { error: "Failed to extend trial" },
      { status: 500 }
    )
  }
}
