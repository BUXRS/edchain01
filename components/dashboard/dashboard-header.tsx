"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { WalletButton } from "@/components/ui/wallet-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LogOut, User, ChevronDown, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { NotificationsDropdown } from "./notifications-dropdown"

interface DashboardHeaderProps {
  title: string
  showAuth?: boolean
  showNotifications?: boolean
  role?: "admin" | "university" | "issuer" | "revoker"
}

export function DashboardHeader({ 
  title, 
  showAuth = false, 
  showNotifications = false,
  role = "admin" 
}: DashboardHeaderProps) {
  const { user, universityUser, logout } = useAuth()
  const router = useRouter()

  const isUniversity = role === "university"
  const displayUser = isUniversity ? universityUser : user
  const displayName = displayUser
    ? ("name" in displayUser ? (displayUser as { name?: string }).name : null) ||
      ("email" in displayUser ? (displayUser as { email: string }).email : null) ||
      "User"
    : null
  const displaySub = displayUser && "email" in displayUser ? (displayUser as { email: string }).email : (isUniversity ? "University Admin" : "Super Admin")

  const handleLogout = async () => {
    await logout()
    router.push(isUniversity ? "/university/login" : "/login")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {role && (
          <Badge variant="outline" className="capitalize hidden sm:inline-flex">
            {role}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        {showNotifications && role === "admin" && <NotificationsDropdown />}
        <WalletButton />

        {showAuth && displayUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {(displayName || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium">{displayName || displaySub}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {isUniversity ? "University Admin" : (user && "role" in user ? (user as { role: string }).role.replace("_", " ") : "Admin")}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
