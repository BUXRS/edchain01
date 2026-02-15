import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { clearSession } from "@/lib/auth"

export async function POST() {
  // Clear all session types
  await clearSession()
  
  // Also clear issuer and revoker sessions
  const cookieStore = await cookies()
  
  const sessionCookies = [
    "issuer_session",
    "revoker_session", 
    "graduate_session",
    "university_session"
  ]
  
  for (const cookieName of sessionCookies) {
    cookieStore.delete(cookieName)
  }
  
  return NextResponse.json({ success: true })
}
