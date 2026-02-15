"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Loader2 } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/admin/login")
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar role="admin" />
      <div className="pl-64 flex flex-col min-h-screen">
        <DashboardHeader 
          title="Super Admin" 
          showAuth={true} 
          showNotifications={true} 
          role="admin" 
        />
        <main className="flex-1 p-6">
        <div className="w-full max-w-7xl mx-auto">{children}</div>
      </main>
      </div>
    </div>
  )
}
