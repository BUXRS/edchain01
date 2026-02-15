import { cookies } from "next/headers"
import { jwtVerify, SignJWT } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "university-degree-protocol-secret-key-change-in-production",
)

export interface AdminUser {
  id: string
  email: string
  name?: string
  role: "super_admin"
  walletAddress?: string
}

export interface UniversityUser {
  id: number
  name: string
  nameAr?: string
  email: string
  walletAddress?: string
  country?: string
  status: string
  subscriptionStatus?: string
  subscriptionPlan?: string
}

export async function createToken(user: AdminUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
}

export async function createUniversityToken(university: UniversityUser): Promise<string> {
  return new SignJWT({ ...university, type: "university" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<AdminUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AdminUser
  } catch {
    return null
  }
}

export async function verifyUniversityToken(token: string): Promise<UniversityUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if ((payload as { type?: string }).type === "university") {
      return payload as unknown as UniversityUser
    }
    return null
  } catch {
    return null
  }
}

export async function getSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getUniversitySession(): Promise<UniversityUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("university_token")?.value
  if (!token) return null
  return verifyUniversityToken(token)
}

export async function setSession(user: AdminUser): Promise<void> {
  const token = await createToken(user)
  const cookieStore = await cookies()
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

export async function setUniversitySession(university: UniversityUser): Promise<void> {
  const token = await createUniversityToken(university)
  const cookieStore = await cookies()
  cookieStore.set("university_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("auth_token")
  cookieStore.delete("university_token") // Also clear university token on logout
}

import bcrypt from "bcryptjs"

/**
 * Hash password using bcrypt (enterprise standard)
 * All passwords must be hashed with bcrypt before storage
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Verify password against bcrypt hash
 * Supports both bcrypt hashes ($2a$, $2b$, $2y$) and legacy SHA-256 hashes for migration
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // If hash is bcrypt format (starts with $2a$, $2b$, $2y$)
  if (hash.startsWith("$2")) {
    return await bcrypt.compare(password, hash)
  }
  
  // Legacy SHA-256 support (for migration only - should be removed after migration)
  // DO NOT USE FOR NEW PASSWORDS
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.PASSWORD_SALT || "university-protocol-salt"))
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const passwordHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return passwordHash === hash
}
