import { type NextRequest, NextResponse } from "next/server"
import { getUniversityById, updateUniversityStatus, logActivity } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const university = await getUniversityById(Number(id))

    if (!university) {
      return NextResponse.json({ error: "University not found" }, { status: 404 })
    }

    return NextResponse.json({ university })
  } catch (error) {
    console.error("Error fetching university:", error)
    return NextResponse.json({ error: "Failed to fetch university" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const university = await updateUniversityStatus(Number(id), status)

    await logActivity({
      actorType: "admin",
      action: `university_${status}`,
      entityType: "university",
      entityId: id,
      details: { newStatus: status },
    })

    return NextResponse.json({ university })
  } catch (error) {
    console.error("Error updating university:", error)
    return NextResponse.json({ error: "Failed to update university" }, { status: 500 })
  }
}
