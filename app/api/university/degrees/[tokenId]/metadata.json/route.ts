/**
 * University Degree NFT Metadata JSON Download
 * Only for degrees belonging to the authenticated university.
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireUniversity, isErrorResponse } from "@/lib/middleware/university-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const university = await requireUniversity(request)
  if (isErrorResponse(university)) {
    return university
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

    const cookieHeader = request.headers.get("cookie")
    const headers: HeadersInit = {}
    if (cookieHeader) headers["cookie"] = cookieHeader

    const nftResponse = await fetch(`${request.nextUrl.origin}/api/university/degrees/${tokenIdStr}/nft`, {
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

    return new NextResponse(JSON.stringify(nftData.metadata, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="degree-${tokenIdStr}-metadata.json"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("[UniversityDownloadMetadata] Error:", error)
    return NextResponse.json(
      { error: "Failed to download metadata", details: error.message },
      { status: 500 }
    )
  }
}
