"use client"

import type React from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Home, Search, FileX, LogOut, ChevronDown, Shield, GraduationCap } from "lucide-react"

export default function RevokerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "revoker")) {
      router.push("/connect")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user || user.role !== "revoker") {
    return null
  }

  const navItems = [
    { href: "/revoker", label: "Overview", icon: Home },
    { href: "/revoker/search", label: "Search Degrees", icon: Search },
    { href: "/revoker/history", label: "Revocation History", icon: FileX },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/revoker" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-destructive" />
                </div>
                <span className="font-semibold text-foreground">EdChain</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
                <Shield className="w-3 h-3" />
                Revoker
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <span className="max-w-[120px] truncate font-mono text-xs">
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
