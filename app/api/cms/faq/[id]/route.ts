import { NextResponse } from "next/server"
import { query, isDatabaseAvailable } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { question, answer, category, sort_order, is_published } = body

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    const result = await query(
      `UPDATE faq_items SET question = $1, answer = $2, category = $3, sort_order = $4, is_published = $5, updated_at = NOW() WHERE id = $6 RETURNING *`,
      [question, answer, category, sort_order, is_published, id],
    )
    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating FAQ:", error)
    return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    await query("DELETE FROM faq_items WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting FAQ:", error)
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 })
  }
}
