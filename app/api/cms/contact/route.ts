import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"

export async function GET() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json([])
    }

    const result = await sql`SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 100`
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching contacts:", error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, organization, role, subject, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 })
    }

    if (!isDatabaseAvailable()) {
      // Still return success for user experience
      return NextResponse.json(
        {
          success: true,
          message: "Thank you for your message. We'll get back to you soon.",
        },
        { status: 201 },
      )
    }

    await sql`
      INSERT INTO contact_submissions (name, email, organization, role, subject, message)
      VALUES (${name}, ${email}, ${organization || null}, ${role || null}, ${subject || null}, ${message})
    `

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for your message. We'll get back to you soon.",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating contact:", error)
    return NextResponse.json({ error: "Failed to submit form" }, { status: 500 })
  }
}
