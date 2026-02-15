"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  Users,
  FileCheck,
  FileX,
  Settings,
  ShieldCheck,
  GraduationCap,
  CreditCard,
  Home,
  LogOut,
  FileText,
  RefreshCw,
} from "lucide-react"
import Image from "next/image"
import { LogoutButton } from "@/components/auth/logout-button"

interface SidebarItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface DashboardSidebarProps {
  role: "admin" | "university" | "issuer" | "revoker" | "verifier"
}

const sidebarItems: Record<string, SidebarItem[]> = {
  admin: [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Universities", href: "/admin/universities", icon: Building2 },
    { title: "Pending Approvals", href: "/admin/pending", icon: Users },
    { title: "All Degrees", href: "/admin/degrees", icon: GraduationCap },
    { title: "Reports", href: "/admin/reports", icon: FileText },
    { title: "Sync Status", href: "/admin/sync", icon: RefreshCw },
    { title: "Settings", href: "/admin/settings", icon: Settings },
  ],
  university: [
    { title: "Dashboard", href: "/university", icon: LayoutDashboard },
    { title: "Issuers", href: "/university/issuers", icon: FileCheck },
    { title: "Revokers", href: "/university/revokers", icon: FileX },
    { title: "Verifiers", href: "/university/verifiers", icon: ShieldCheck },
    { title: "Degrees", href: "/university/degrees", icon: GraduationCap },
    { title: "Subscription", href: "/university/subscription", icon: CreditCard },
  ],
  issuer: [
    { title: "Dashboard", href: "/issuer", icon: LayoutDashboard },
    { title: "Request Degree", href: "/issuer/issue", icon: FileCheck },
    { title: "My Requests", href: "/issuer/requests", icon: FileText },
    { title: "My Issued", href: "/issuer/history", icon: GraduationCap },
  ],
  revoker: [
    { title: "Dashboard", href: "/revoker", icon: LayoutDashboard },
    { title: "Request Revocation", href: "/revoker/revoke", icon: FileX },
    { title: "My Revocation Requests", href: "/revoker/requests", icon: FileText },
    { title: "Revocation History", href: "/revoker/history", icon: GraduationCap },
  ],
  verifier: [
    { title: "Dashboard", href: "/verifier", icon: LayoutDashboard },
    { title: "Degree Requests", href: "/verifier/degree-requests", icon: FileCheck },
    { title: "Revocation Requests", href: "/verifier/revocation-requests", icon: FileX },
    { title: "Approval History", href: "/verifier/history", icon: FileText },
  ],
}

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname()
  const items = sidebarItems[role] || []

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <Link href="/" className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Image src="/edchain-logo.png" alt="EdChain" width={67} height={24} className="flex-shrink-0 object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">EdChain</span>
            <span className="text-xs text-sidebar-foreground/60 capitalize">{role} Panel</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-sidebar-primary")} />
                {item.title}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <Home className="h-5 w-5" />
            Back to Home
          </Link>
          <LogoutButton 
            variant="ghost" 
            className="w-full justify-start gap-3 px-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            showConfirm={true}
            redirectTo="/login"
          />
        </div>
      </div>
    </aside>
  )
}
