/**
 * Admin Degree NFT Metadata JSON Download Endpoint
 * 
 * Downloads the NFT metadata as JSON file
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  // Enforce Super Admin authorization
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const { tokenId } = await params
    const tokenIdStr = String(tokenId).trim()

    if (!tokenIdStr || tokenIdStr === "undefined" || tokenIdStr === "null") {
      return NextResponse.json(
        { error: "Invalid token ID" },
        { status: 400 }
      )
    }

    // Fetch NFT metadata
    // Forward authorization headers for internal API call
    const authHeader = request.headers.get("authorization")
    const cookieHeader = request.headers.get("cookie")
    
    const headers: HeadersInit = {}
    if (authHeader) headers["authorization"] = authHeader
    if (cookieHeader) headers["cookie"] = cookieHeader
    
    const nftResponse = await fetch(`${request.nextUrl.origin}/api/admin/degrees/${tokenIdStr}/nft`, {
      headers,
    })
    
    if (!nftResponse.ok) {
      const errorData = await nftResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch NFT metadata" },
        { status: nftResponse.status }
      )
    }

    const nftData = await nftResponse.json()

    if (!nftData.metadata) {
      return NextResponse.json(
        { error: "Metadata not available" },
        { status: 404 }
      )
    }

    // Return metadata as JSON file
    return new NextResponse(JSON.stringify(nftData.metadata, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="degree-${tokenIdStr}-metadata.json"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("[DownloadMetadata] Error:", error)
    return NextResponse.json(
      { error: "Failed to download metadata", details: error.message },
      { status: 500 }
    )
  }
}
