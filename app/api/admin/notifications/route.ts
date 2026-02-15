import { type NextRequest, NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"

export async function GET(request: NextRequest) {
  // Return empty if database is not available
  if (!isDatabaseAvailable()) {
    return NextResponse.json({ notifications: [], source: "no_db" })
  }

  try {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"
    const limit = parseInt(searchParams.get("limit") || "20")

    let notifications
    if (unreadOnly) {
      notifications = await sql`
        SELECT * FROM admin_notifications 
        WHERE is_read = false 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `
    } else {
      notifications = await sql`
        SELECT * FROM admin_notifications 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `
    }

    return NextResponse.json({ notifications: notifications || [], source: "database" })
  } catch (error) {
    // Silently return empty array on database errors
    return NextResponse.json({ notifications: [], source: "error" })
  }
}

export async function PATCH(request: NextRequest) {
  if (!isDatabaseAvailable()) {
    return NextResponse.json({ success: false, error: "Database not available" })
  }

  try {
    const { notificationId, markAllRead } = await request.json()

    if (markAllRead) {
      await sql`UPDATE admin_notifications SET is_read = true WHERE is_read = false`
    } else if (notificationId) {
      await sql`UPDATE admin_notifications SET is_read = true WHERE id = ${notificationId}`
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update" })
  }
}
