"use client"

import type React from "react"
import { Suspense } from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export default function VerifierLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="min-h-screen bg-background">
        <DashboardSidebar role="verifier" />
        <main className="pl-64">{children}</main>
      </div>
    </Suspense>
  )
}
