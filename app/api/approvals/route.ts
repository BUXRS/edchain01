import { type NextRequest, NextResponse } from "next/server"
import { getPendingApprovals, createPendingApproval, logActivity, isDatabaseAvailable } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({ approvals: [] })
    }

    const { searchParams } = new URL(request.url)
    const universityId = searchParams.get("universityId")
    const status = searchParams.get("status")

    const approvals = await getPendingApprovals(universityId ? Number(universityId) : undefined, status || undefined)

    return NextResponse.json({ approvals })
  } catch (error) {
    console.error("Error fetching approvals:", error)
    return NextResponse.json({ approvals: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const { universityId, walletAddress, role, requesterEmail, requesterName } = body

    if (!universityId || !walletAddress || !role) {
      return NextResponse.json({ error: "University ID, wallet address, and role are required" }, { status: 400 })
    }

    const approval = await createPendingApproval({
      universityId,
      walletAddress,
      role,
      requesterEmail,
      requesterName,
    })

    try {
      await logActivity({
        actorType: "system",
        action: "approval_requested",
        entityType: "pending_approval",
        entityId: String(approval.id),
        details: { walletAddress, role, universityId },
      })
    } catch (logError) {
      console.error("Error logging activity:", logError)
    }

    return NextResponse.json({ approval })
  } catch (error) {
    console.error("Error creating approval:", error)
    return NextResponse.json({ error: "Failed to create approval" }, { status: 500 })
  }
}
