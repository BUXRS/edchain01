import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { deactivateUniversity as deactivateOnBlockchain } from "@/lib/blockchain"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get university details
    const universities = await sql`
      SELECT * FROM universities WHERE id = ${id}
    `

    if (universities.length === 0) {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 }
      )
    }

    const university = universities[0]

    // Deactivate on blockchain if registered
    if (university.blockchain_id) {
      try {
        await deactivateOnBlockchain(university.blockchain_id)
      } catch (blockchainError) {
        console.error("Blockchain deactivation error:", blockchainError)
        // Continue with database update
      }
    }

    // Update university in database
    await sql`
      UPDATE universities
      SET 
        is_active = false,
        status = 'inactive',
        last_synced_at = NOW()
      WHERE id = ${id}
    `

    // Update registration record
    await sql`
      UPDATE university_registrations
      SET account_activated = false
      WHERE university_id = ${id}
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
        'university_deactivated',
        'university',
        ${id},
        ${JSON.stringify({ reason: 'admin_action' })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "University deactivated successfully",
    })
  } catch (error) {
    console.error("Error deactivating university:", error)
    return NextResponse.json(
      { error: "Failed to deactivate university" },
      { status: 500 }
    )
  }
}
