import { type NextRequest, NextResponse } from "next/server"
import { getDegreeByTokenId, revokeDegree, logActivity } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ tokenId: string }> }) {
  try {
    const { tokenId } = await params
    const degree = await getDegreeByTokenId(Number(tokenId))

    if (!degree) {
      return NextResponse.json({ error: "Degree not found" }, { status: 404 })
    }

    return NextResponse.json({ degree })
  } catch (error) {
    console.error("Error fetching degree:", error)
    return NextResponse.json({ error: "Failed to fetch degree" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tokenId: string }> }) {
  try {
    const { tokenId } = await params
    const body = await request.json()
    const { revokedBy, reason } = body

    if (!revokedBy || !reason) {
      return NextResponse.json({ error: "Revoked by and reason are required" }, { status: 400 })
    }

    const degree = await revokeDegree(Number(tokenId), revokedBy, reason)

    if (!degree) {
      return NextResponse.json({ error: "Degree not found" }, { status: 404 })
    }

    await logActivity({
      actorType: "revoker",
      actorAddress: revokedBy,
      action: "degree_revoked",
      entityType: "degree",
      entityId: tokenId,
      details: { reason },
    })

    return NextResponse.json({ degree })
  } catch (error) {
    console.error("Error revoking degree:", error)
    return NextResponse.json({ error: "Failed to revoke degree" }, { status: 500 })
  }
}
