import { type NextRequest, NextResponse } from "next/server"
import { updatePendingApproval, logActivity } from "@/lib/db"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, reviewedBy } = body

    if (!status || !reviewedBy) {
      return NextResponse.json({ error: "Status and reviewedBy are required" }, { status: 400 })
    }

    const approval = await updatePendingApproval(Number(id), status, reviewedBy)

    await logActivity({
      actorType: "university",
      actorAddress: reviewedBy,
      action: `approval_${status}`,
      entityType: "pending_approval",
      entityId: id,
      details: { newStatus: status },
    })

    return NextResponse.json({ approval })
  } catch (error) {
    console.error("Error updating approval:", error)
    return NextResponse.json({ error: "Failed to update approval" }, { status: 500 })
  }
}
