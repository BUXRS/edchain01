import { type NextRequest, NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"
import { createAdminWithPassword, getAdminByEmailWithPassword, isDatabaseAvailable } from "@/lib/db"

/**
 * ✅ Enterprise Setup Endpoint
 * Creates initial super admin - requires setup key for security
 * NO demo/auto-setup - all admins must be created via POST with setup key
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, name, setupKey } = await req.json()

    // ✅ Require database
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { message: "Database unavailable. Please configure database first." },
        { status: 503 }
      )
    }

    // ✅ Require setup key for security (must be set in environment)
    const expectedSetupKey = process.env.ADMIN_SETUP_KEY
    if (!expectedSetupKey) {
      return NextResponse.json(
        { message: "Admin setup is not configured. Please set ADMIN_SETUP_KEY in environment." },
        { status: 503 }
      )
    }

    if (setupKey !== expectedSetupKey) {
      return NextResponse.json({ message: "Invalid setup key" }, { status: 403 })
    }

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check if admin already exists
    const existingAdmin = await getAdminByEmailWithPassword(email)
    if (existingAdmin?.password_hash) {
      return NextResponse.json(
        { message: "Admin already exists. Use login endpoint instead." },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    const admin = await createAdminWithPassword({
      clerkUserId: `admin_${Date.now()}`,
      email: email.toLowerCase(),
      name: name || "Super Admin",
      passwordHash,
      isSuperAdmin: true,
    })

    return NextResponse.json({
      success: true,
      message: "Super admin created successfully",
      admin: { id: admin.id, email: admin.email, name: admin.name },
    })
  } catch (error) {
    console.error("[Setup] Error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * ✅ GET endpoint removed - no auto-setup/demo creation
 * All admins must be created via POST with proper setup key
 */
export async function GET() {
  return NextResponse.json(
    {
      message: "Admin setup requires POST request with setup key",
      instructions: "Use POST /api/auth/setup with { email, password, name, setupKey }",
    },
    { status: 405 }
  )
}
