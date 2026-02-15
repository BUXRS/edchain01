import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"

export async function GET() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json([])
    }

    const result = await sql`SELECT * FROM newsletter_subscribers WHERE is_active = true ORDER BY subscribed_at DESC`
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching subscribers:", error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, organization } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        {
          success: true,
          message: "Thank you for subscribing!",
        },
        { status: 201 },
      )
    }

    // Check if already subscribed
    const existing = await sql`SELECT * FROM newsletter_subscribers WHERE email = ${email}`

    if (existing.length > 0) {
      if (existing[0].is_active) {
        return NextResponse.json({
          success: true,
          message: "You're already subscribed!",
        })
      } else {
        // Reactivate subscription
        await sql`UPDATE newsletter_subscribers SET is_active = true, unsubscribed_at = NULL WHERE email = ${email}`
        return NextResponse.json({
          success: true,
          message: "Welcome back! You've been re-subscribed.",
        })
      }
    }

    await sql`INSERT INTO newsletter_subscribers (email, name, organization) VALUES (${email}, ${name || null}, ${organization || null})`

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for subscribing!",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error subscribing:", error)
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 })
  }
}
