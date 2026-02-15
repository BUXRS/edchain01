"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Loader2 } from "lucide-react"

export default function UniversityLayout({ children }: { children: React.ReactNode }) {
  const { universityUser, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!universityUser) {
      router.replace("/university/login")
    }
  }, [isLoading, universityUser, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!universityUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar role="university" />
      <div className="pl-64 flex flex-col min-h-screen">
        <DashboardHeader
          title="University Admin"
          showAuth
          showNotifications={false}
          role="university"
        />
        <main className="flex-1 p-6">
        <div className="w-full max-w-7xl mx-auto">{children}</div>
      </main>
      </div>
    </div>
  )
}
