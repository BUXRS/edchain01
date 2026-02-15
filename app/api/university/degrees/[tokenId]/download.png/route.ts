/**
 * University Degree NFT Image Download
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
    const imageUrl = nftData.imageUrl || nftData.metadata?.image

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image available for this degree NFT" },
        { status: 404 }
      )
    }

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image")
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get("content-type") || "image/png"

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="degree-${tokenIdStr}-nft.${contentType.split("/")[1] || "png"}"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("[UniversityDownloadPNG] Error:", error)
    return NextResponse.json(
      { error: "Failed to download NFT image", details: error.message },
      { status: 500 }
    )
  }
}
