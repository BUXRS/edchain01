"use client"

import type React from "react"
import { Suspense } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export default function GraduateLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="min-h-screen bg-background">
        <DashboardSidebar role="graduate" />
        <main className="pl-64">{children}</main>
      </div>
    </Suspense>
  )
}
