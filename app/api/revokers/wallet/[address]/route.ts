import { type NextRequest, NextResponse } from "next/server"
import { getRevokerByWallet } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await params
    const revoker = await getRevokerByWallet(address)

    if (!revoker) {
      return NextResponse.json({ error: "Revoker not found" }, { status: 404 })
    }

    return NextResponse.json({ revoker })
  } catch (error) {
    console.error("Error fetching revoker:", error)
    return NextResponse.json({ error: "Failed to fetch revoker" }, { status: 500 })
  }
}
