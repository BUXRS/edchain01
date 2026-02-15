import { NextResponse } from "next/server"
import { getStats, isDatabaseAvailable } from "@/lib/db"

export async function GET() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        stats: {
          universities: 0,
          degrees: 0,
          issuers: 0,
          revokers: 0,
          pendingApprovals: 0,
        },
      })
    }

    const stats = await getStats()
    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({
      stats: {
        universities: 0,
        degrees: 0,
        issuers: 0,
        revokers: 0,
        pendingApprovals: 0,
      },
    })
  }
}
