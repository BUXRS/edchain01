"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { EdChainLogo } from "@/components/shared/edchain-logo"

const navLinks = [
  { href: "/solutions", label: "Solutions" },
  { href: "/roi", label: "ROI Calculator" },
  { href: "/customers", label: "Customers" },
  { href: "/docs", label: "Documentation" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/verify", label: "Verify Degree" },
  { href: "/contact", label: "Contact" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <EdChainLogo size="lg" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === link.href ? "text-primary" : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/university/login" className="hidden sm:block">
            <Button variant="outline" size="sm">
              University Login
            </Button>
          </Link>
          <Link href="/admin/login">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Admin Login
            </Button>
          </Link>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/40 bg-background">
          <nav className="container py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                  pathname === link.href ? "text-primary bg-muted" : "text-muted-foreground",
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/university/login"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted sm:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              University Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
