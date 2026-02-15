import { type NextRequest, NextResponse } from "next/server"
import { getActivityLogs } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    const logs = await getActivityLogs(limit ? Number(limit) : undefined, offset ? Number(offset) : undefined)

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching activity logs:", error)
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 })
  }
}
