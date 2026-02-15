import { NextResponse } from "next/server"
import { getSession, getUniversitySession } from "@/lib/auth"

export async function GET() {
  const user = await getSession()
  const university = await getUniversitySession()

  if (!user && !university) {
    return NextResponse.json({ user: null, university: null }, { status: 401 })
  }

  return NextResponse.json({ user, university })
}
