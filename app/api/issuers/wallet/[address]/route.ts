import { type NextRequest, NextResponse } from "next/server"
import { getIssuerByWallet } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await params
    const issuer = await getIssuerByWallet(address)

    if (!issuer) {
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 })
    }

    return NextResponse.json({ issuer })
  } catch (error) {
    console.error("Error fetching issuer:", error)
    return NextResponse.json({ error: "Failed to fetch issuer" }, { status: 500 })
  }
}
