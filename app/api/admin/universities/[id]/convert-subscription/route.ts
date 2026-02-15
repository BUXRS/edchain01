import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { plan, paymentMethod, paymentReference } = body

    if (!plan) {
      return NextResponse.json(
        { error: "Subscription plan is required" },
        { status: 400 }
      )
    }

    // Calculate subscription expiry (1 year for now)
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    // Update registration
    await sql`
      UPDATE university_registrations
      SET 
        is_trial = false,
        subscription_plan = ${plan},
        payment_status = 'completed',
        payment_method = ${paymentMethod || null},
        payment_reference = ${paymentReference || null}
      WHERE university_id = ${id}
    `

    // Update university
    await sql`
      UPDATE universities
      SET 
        subscription_type = ${plan},
        subscription_expires_at = ${expiryDate},
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
        'subscription_converted',
        'university',
        ${id},
        ${JSON.stringify({ plan, paymentMethod, paymentReference, expiryDate: expiryDate.toISOString() })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Subscription converted to permanent successfully",
      subscription: {
        plan,
        expiryDate: expiryDate.toISOString(),
      },
    })
  } catch (error) {
    console.error("Error converting subscription:", error)
    return NextResponse.json(
      { error: "Failed to convert subscription" },
      { status: 500 }
    )
  }
}
