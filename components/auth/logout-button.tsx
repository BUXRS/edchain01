"use client"

import { useState, useEffect } from "react"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { LogOut, Loader2 } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  showIcon?: boolean
  showConfirm?: boolean
  className?: string
  redirectTo?: string
}

export function LogoutButton({
  variant = "ghost",
  size = "default",
  showIcon = true,
  showConfirm = true,
  className = "",
  redirectTo = "/login",
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const { logout } = useAuth()

  // Prevent hydration mismatch by only rendering AlertDialog on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleLogout = async () => {
    setIsLoading(true)
    
    try {
      // Use auth provider logout to clear both API session and React state
      await logout()
      
      // Clear any client-side storage
      localStorage.removeItem("university_session")
      localStorage.removeItem("issuer_session")
      localStorage.removeItem("revoker_session")
      localStorage.removeItem("graduate_session")
      
      // Force a hard redirect to clear all state
      window.location.href = redirectTo
    } catch (error) {
      console.error("Logout failed:", error)
      // Fallback: try direct redirect even if logout fails
      window.location.href = redirectTo
    } finally {
      setIsLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleLogout}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {showIcon && <LogOut className="h-4 w-4 mr-2" />}
            Logout
          </>
        )}
      </Button>
    )
  }

  // Prevent hydration mismatch - only render AlertDialog after mount
  if (!isMounted && showConfirm) {
    return (
      <Button variant={variant} size={size} className={className} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {showIcon && <LogOut className="h-4 w-4 mr-2" />}
            Logout
          </>
        )}
      </Button>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {showIcon && <LogOut className="h-4 w-4 mr-2" />}
              Logout
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to log out? You will need to sign in again to access your dashboard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Logging out...
              </>
            ) : (
              "Logout"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
