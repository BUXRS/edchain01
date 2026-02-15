import { type NextRequest, NextResponse } from "next/server"
import { fetchDegreesOwnedByWallet } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 })
    }

    // Check if wallet has any degrees
    const degrees = await fetchDegreesOwnedByWallet(walletAddress)

    if (degrees.length === 0) {
      return NextResponse.json(
        { error: "No degrees found for this wallet address" },
        { status: 404 }
      )
    }

    // Create session (wallet address as identifier)
    const session = {
      walletAddress: walletAddress.toLowerCase(),
      degreesCount: degrees.length,
      loginMethod: "wallet",
      loginAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      graduate: session,
      degrees: degrees.map((d) => ({
        tokenId: d.tokenId,
        universityId: d.universityId,
        nameEn: d.nameEn,
        nameAr: d.nameAr,
      })),
    })
  } catch (error) {
    console.error("Error in graduate wallet login:", error)
    return NextResponse.json(
      { error: "Failed to authenticate. Please try again." },
      { status: 500 }
    )
  }
}
