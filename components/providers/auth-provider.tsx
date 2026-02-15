"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { AdminUser } from "@/lib/auth"

interface UniversityUser {
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

interface AuthContextType {
  user: AdminUser | null
  universityUser: UniversityUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  universityLogin: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateWallet: (walletAddress: string) => void
  linkUniversityWallet: (walletAddress: string) => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [universityUser, setUniversityUser] = useState<UniversityUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkSession = useCallback(async () => {
    try {
      console.log("[v0] Checking session...")
      const res = await fetch("/api/auth/session", {
        credentials: "include", // Ensure cookies are sent
        cache: "no-store", // Don't cache session checks
      })
      console.log("[v0] Session check response status:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Session data:", data)
        if (data.user) {
          console.log("[v0] ✅ Admin session found:", data.user)
          setUser(data.user)
        }
        if (data.university) {
          console.log("[v0] ✅ University session found:", data.university)
          setUniversityUser(data.university)
        }
      } else {
        console.log("[v0] No session found (status:", res.status, ")")
      }
    } catch (error) {
      console.error("[v0] Session check failed:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    checkSession()
  }, [checkSession])
  
  // Expose checkSession as refreshSession so it can be called manually after login
  const refreshSession = useCallback(async () => {
    setIsLoading(true)
    await checkSession()
  }, [checkSession])

  async function login(email: string, password: string) {
    console.log("[v0] Admin login attempt for:", email)
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    console.log("[v0] Login response status:", res.status)

    if (!res.ok) {
      const error = await res.json()
      console.log("[v0] Login error:", error)
      throw new Error(error.message || "Login failed")
    }

    const data = await res.json()
    console.log("[v0] Login successful, user:", data.user)
    setUser(data.user)
  }

  async function universityLogin(email: string, password: string) {
    console.log("[v0] University login attempt for:", email)
    const res = await fetch("/api/auth/university/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, loginMethod: "email" }),
      credentials: "include",
    })

    const text = await res.text()
    let data: { error?: string; message?: string; university?: unknown } = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      console.error("[v0] University login: response was not JSON", text.slice(0, 100))
      throw new Error(res.ok ? "Invalid response from server." : "Login failed. Please try again.")
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || "Login failed")
    }

    console.log("[v0] University login successful:", data.university)
    setUniversityUser(data.university)
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    setUniversityUser(null)
  }

  function updateWallet(walletAddress: string) {
    if (user) {
      setUser({ ...user, walletAddress })
    }
  }

  async function linkUniversityWallet(walletAddress: string) {
    if (!universityUser) return

    const res = await fetch("/api/auth/university/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    })

    if (res.ok) {
      setUniversityUser({ ...universityUser, walletAddress })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        universityUser,
        isLoading,
        login,
        refreshSession,
        universityLogin,
        logout,
        updateWallet,
        linkUniversityWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
