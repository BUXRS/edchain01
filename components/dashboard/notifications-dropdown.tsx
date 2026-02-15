"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bell, 
  Building2, 
  CreditCard, 
  UserCheck, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: number
  type: string
  title: string
  message: string
  related_entity_type: string | null
  related_entity_id: number | null
  is_read: boolean
  action_url: string | null
  created_at: string
}

const notificationIcons: Record<string, React.ReactNode> = {
  new_subscription: <CreditCard className="h-4 w-4 text-green-500" />,
  new_university: <Building2 className="h-4 w-4 text-blue-500" />,
  wallet_submitted: <UserCheck className="h-4 w-4 text-purple-500" />,
  nda_signed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  trial_expiring: <Clock className="h-4 w-4 text-amber-500" />,
  payment_failed: <AlertTriangle className="h-4 w-4 text-red-500" />,
  default: <Bell className="h-4 w-4 text-muted-foreground" />,
}

export function NotificationsDropdown() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/admin/notifications?limit=10")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch {
      // Silently handle errors - notifications are not critical
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id)
    }
    
    if (notification.action_url) {
      router.push(notification.action_url)
      setIsOpen(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer ${
                  !notification.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mt-0.5">
                  {notificationIcons[notification.type] || notificationIcons.default}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium leading-none ${
                      !notification.is_read ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {notification.action_url && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center justify-center text-sm text-primary"
              onClick={() => {
                router.push("/admin/notifications")
                setIsOpen(false)
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
