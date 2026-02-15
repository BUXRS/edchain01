import { type NextRequest, NextResponse } from "next/server"
import { getUniversityByWallet } from "@/lib/db"

const FALLBACK_UNIVERSITIES: Record<string, any> = {
  "0x1149ad0a7b6fa7072bdceda99baf2c96fe6104f3": {
    id: 1,
    name: "RAK University",
    name_ar: "جامعة رأس الخيمة",
    wallet_address: "0x1149AD0A7B6FA7072BdceDa99BaF2c96fe6104f3",
    country: "UAE",
    status: "active",
    blockchain_id: 1,
  },
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await params
    const normalizedAddress = address.toLowerCase()

    // Try database first
    try {
      const university = await getUniversityByWallet(address)
      if (university) {
        return NextResponse.json({ university })
      }
    } catch {
      // Database unavailable, continue to fallback
    }

    const fallbackUniversity = FALLBACK_UNIVERSITIES[normalizedAddress]
    if (fallbackUniversity) {
      return NextResponse.json({ university: fallbackUniversity })
    }

    return NextResponse.json({ error: "University not found" }, { status: 404 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch university" }, { status: 500 })
  }
}
