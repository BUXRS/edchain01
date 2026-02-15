/**
 * Admin Degree NFT Image Download Endpoint
 * 
 * Downloads the NFT image (PNG) for a degree
 * Fetches from tokenURI metadata or generates placeholder
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

    // Fetch NFT metadata (which includes imageUrl)
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
    const imageUrl = nftData.imageUrl || nftData.metadata?.image

    if (!imageUrl) {
      // Return a placeholder image or error
      return NextResponse.json(
        { error: "No image available for this degree NFT" },
        { status: 404 }
      )
    }

    // Fetch the image from the URL
    try {
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error("Failed to fetch image")
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      const contentType = imageResponse.headers.get("content-type") || "image/png"

      // Return the image with proper headers
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="degree-${tokenIdStr}-nft.${contentType.split("/")[1] || "png"}"`,
          "Cache-Control": "public, max-age=3600",
        },
      })
    } catch (error: any) {
      console.error(`[DownloadPNG] Failed to fetch image from ${imageUrl}:`, error.message)
      return NextResponse.json(
        { error: "Failed to download image", details: error.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("[DownloadPNG] Error:", error)
    return NextResponse.json(
      { error: "Failed to download NFT image", details: error.message },
      { status: 500 }
    )
  }
}
