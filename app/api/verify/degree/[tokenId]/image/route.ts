/**
 * Public Certificate NFT Image Endpoint
 * Returns the NFT/certificate image for a verified degree (no auth required).
 * 1) Tries tokenURI metadata image; 2) Falls back to Render contract render() (SVG/data URI).
 */

import { type NextRequest, NextResponse } from "next/server"
import { Contract } from "ethers"
import {
  getCoreContractABI,
  getActiveContractAddress,
  getRenderContractABI,
  getRenderContractAddress,
} from "@/lib/contracts/abi"
import {
  getReadOnlyProvider,
  fetchDegreeFromBlockchain,
  fetchUniversityFromBlockchain,
} from "@/lib/blockchain"

/** Generate a minimal SVG certificate when no NFT image or Render output is available */
function generateFallbackCertificateSvg(
  tokenId: number,
  degree: NonNullable<Awaited<ReturnType<typeof fetchDegreeFromBlockchain>>>
): string {
  const name = (degree.nameEn || degree.nameAr || "Graduate").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const major = (degree.majorEn || degree.majorAr || "—").replace(/</g, "&lt;")
  const faculty = (degree.facultyEn || degree.facultyAr || "—").replace(/</g, "&lt;")
  const gpa = degree.gpa > 0 && degree.gpa <= 10 ? degree.gpa.toFixed(2) : (degree.gpa / 100).toFixed(2)
  const year = String(degree.year || new Date().getFullYear())
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" width="400" height="280">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1f36"/>
      <stop offset="100%" style="stop-color:#0f1219"/>
    </linearGradient>
  </defs>
  <rect width="400" height="280" fill="url(#bg)" stroke="#3d4a6a" stroke-width="2" rx="8"/>
  <text x="200" y="36" text-anchor="middle" fill="#d4a853" font-family="system-ui,sans-serif" font-size="14" font-weight="600">EDCHAIN — DEGREE CERTIFICATE</text>
  <text x="200" y="58" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="11">Token #${tokenId} • Blockchain Verified</text>
  <line x1="40" y1="78" x2="360" y2="78" stroke="#3d4a6a" stroke-width="1"/>
  <text x="200" y="118" text-anchor="middle" fill="#f0f2f8" font-family="system-ui,sans-serif" font-size="18" font-weight="600">${name}</text>
  <text x="200" y="148" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">${major}</text>
  <text x="200" y="172" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="12">${faculty}</text>
  <text x="200" y="200" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="12">GPA ${gpa} • Year ${year}</text>
  <line x1="40" y1="222" x2="360" y2="222" stroke="#3d4a6a" stroke-width="1"/>
  <text x="200" y="256" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="10">Verify at edchain.io/verify?id=${tokenId}</text>
</svg>`
}

/** Serve image from Render contract when tokenURI has no image */
async function tryRenderContractImage(
  tokenIdNum: number,
  degree: Awaited<ReturnType<typeof fetchDegreeFromBlockchain>>
): Promise<NextResponse | null> {
  if (!degree) return null
  try {
    const university = await fetchUniversityFromBlockchain(Number(degree.universityId))
    const nameAr = degree.nameAr ?? ""
    const nameEn = degree.nameEn ?? ""
    const universityNameAr = university?.nameAr ?? ""
    const universityNameEn = university?.nameEn ?? `University ${Number(degree.universityId)}`
    const facultyAr = degree.facultyAr ?? ""
    const facultyEn = degree.facultyEn ?? ""
    const majorAr = degree.majorAr ?? ""
    const majorEn = degree.majorEn ?? ""
    const degreeNameAr = degree.degreeNameAr ?? ""
    const degreeNameEn = degree.degreeNameEn ?? ""
    const gpaTimes100 = degree.gpa > 0 && degree.gpa <= 10 ? Math.round(degree.gpa * 100) : Math.round(degree.gpa)
    const year = Number(degree.year) || new Date().getFullYear()
    const isRevoked = Boolean(degree.isRevoked)
    const issuedTimestamp = Number(degree.issuedAt) || 0
    const revokedTimestamp = Number(degree.revokedAt) || 0

    const renderContract = new Contract(
      getRenderContractAddress(),
      getRenderContractABI(),
      getReadOnlyProvider()
    )
    const result: string = await renderContract.render(
      tokenIdNum,
      nameAr,
      nameEn,
      universityNameAr,
      universityNameEn,
      facultyAr,
      facultyEn,
      majorAr,
      majorEn,
      degreeNameAr,
      degreeNameEn,
      gpaTimes100,
      year,
      isRevoked,
      issuedTimestamp,
      revokedTimestamp
    )
    if (!result || typeof result !== "string") return null

    const s = result.trim()
    if (s.startsWith("data:image/")) {
      const match = s.match(/^data:(image\/[a-z+]+);base64,(.+)$/i)
      if (match) {
        const contentType = match[1]
        const buffer = Buffer.from(match[2], "base64")
        return new NextResponse(buffer, {
          headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
        })
      }
    }
    if (s.startsWith("<") && (s.includes("<svg") || s.includes("<?xml"))) {
      return new NextResponse(s, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        },
      })
    }
  } catch (err) {
    console.warn("[Verify degree image] Render contract fallback failed:", err)
  }
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params
    const tokenIdNum = Number.parseInt(tokenId)

    if (Number.isNaN(tokenIdNum) || tokenIdNum < 1) {
      return NextResponse.json({ error: "Invalid token ID" }, { status: 400 })
    }

    const degree = await fetchDegreeFromBlockchain(tokenIdNum)
    if (!degree) {
      return NextResponse.json({ error: "Degree not found" }, { status: 404 })
    }

    let tokenURI: string | null = null
    let metadata: any = null

    try {
      const coreContract = new Contract(
        getActiveContractAddress(),
        getCoreContractABI(),
        getReadOnlyProvider()
      )
      tokenURI = await coreContract.tokenURI(tokenIdNum)
    } catch (err) {
      const rendered = await tryRenderContractImage(tokenIdNum, degree)
      if (rendered) return rendered
      return NextResponse.json({ error: "Failed to fetch token URI" }, { status: 502 })
    }

    if (tokenURI && tokenURI !== "") {
      if (tokenURI.startsWith("data:application/json;base64,")) {
        const base64Data = tokenURI.split(",")[1]
        if (base64Data) {
          const jsonString = Buffer.from(base64Data, "base64").toString("utf-8")
          metadata = JSON.parse(jsonString)
        }
      } else if (tokenURI.startsWith("http://") || tokenURI.startsWith("https://")) {
        const res = await fetch(tokenURI)
        if (res.ok) metadata = await res.json()
      } else if (tokenURI.startsWith("ipfs://")) {
        const gatewayUrl = `https://ipfs.io/ipfs/${tokenURI.replace("ipfs://", "")}`
        const res = await fetch(gatewayUrl)
        if (res.ok) metadata = await res.json()
      }
    }

    let imageUrl = metadata?.image || metadata?.image_url || null
    if (imageUrl && imageUrl.startsWith("ipfs://")) {
      imageUrl = `https://ipfs.io/ipfs/${imageUrl.replace("ipfs://", "")}`
    }

    if (imageUrl && imageUrl.startsWith("data:image/")) {
      const match = imageUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i)
      if (match) {
        const buffer = Buffer.from(match[2], "base64")
        return new NextResponse(buffer, {
          headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=86400" },
        })
      }
    }

    if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
      try {
        const imageRes = await fetch(imageUrl)
        if (imageRes.ok) {
          const contentType = imageRes.headers.get("content-type") || "image/png"
          const buffer = Buffer.from(await imageRes.arrayBuffer())
          return new NextResponse(buffer, {
            headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
          })
        }
      } catch {
        // fall through to Render contract
      }
    }

    const rendered = await tryRenderContractImage(tokenIdNum, degree)
    if (rendered) return rendered

    // Last resort: generate a simple SVG certificate from degree data so something always displays
    const svg = generateFallbackCertificateSvg(tokenIdNum, degree)
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("[Verify degree image]", error)
    return NextResponse.json(
      { error: error?.message || "Failed to load certificate image" },
      { status: 500 }
    )
  }
}
