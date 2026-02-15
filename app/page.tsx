"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  GraduationCap,
  Building2,
  FileCheck,
  Search,
  Lock,
  ArrowRight,
  CheckCircle2,
  Blocks,
  Globe,
  Calculator,
  BookOpen,
  HelpCircle,
  MessageCircle,
  Mail,
  Star,
  ChevronRight,
} from "lucide-react"
import { EdChainLogo } from "@/components/shared/edchain-logo"

interface Customer {
  id: number
  name: string
  logo_url: string
  country: string
  is_featured: boolean
}

const FALLBACK_CUSTOMERS: Customer[] = [
  { id: 1, name: "RAK University", logo_url: "/rak-university-logo.jpg", country: "UAE", is_featured: true },
  {
    id: 2,
    name: "Dubai Tech University",
    logo_url: "/dubai-tech-university-logo.jpg",
    country: "UAE",
    is_featured: true,
  },
  { id: 3, name: "Cairo University", logo_url: "/cairo-university-logo.jpg", country: "Egypt", is_featured: false },
  {
    id: 4,
    name: "King Saud University",
    logo_url: "/king-saud-university-logo.jpg",
    country: "Saudi Arabia",
    is_featured: false,
  },
  {
    id: 5,
    name: "Abu Dhabi Polytechnic",
    logo_url: "/abu-dhabi-polytechnic-university-logo.jpg",
    country: "UAE",
    is_featured: false,
  },
]

export default function HomePage() {
  const [customers, setCustomers] = useState<Customer[]>(FALLBACK_CUSTOMERS)
  const [email, setEmail] = useState("")
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeMessage, setSubscribeMessage] = useState("")

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/cms/customers")
      if (!response.ok) {
        // Use fallback data on non-OK response
        return
      }
      const data = await response.json()
      if (data && data.length > 0) {
        setCustomers(data.slice(0, 6))
      }
      // If empty, keep fallback data
    } catch {
      // Silently use fallback data on error
      console.log("[v0] Using fallback customers data")
    }
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSubscribing(true)
    setSubscribeMessage("")

    try {
      const response = await fetch("/api/cms/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (response.ok) {
        setSubscribeMessage(data.message || "Thank you for subscribing!")
        setEmail("")
      } else {
        setSubscribeMessage(data.error || "Failed to subscribe")
      }
    } catch (error) {
      setSubscribeMessage("An error occurred. Please try again.")
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <EdChainLogo size="lg" />
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/solutions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Solutions
            </Link>
            <Link href="/roi" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ROI Calculator
            </Link>
            <Link href="/customers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Customers
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/verify" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Verify Degree
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent">
                Sign In
              </Button>
            </Link>
            <Link href="/subscribe">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Video */}
      <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden
        >
          <source src="/edchain_hero_video.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"
          aria-hidden
        />
        <div className="container relative z-10 py-24">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary bg-background/60 backdrop-blur-sm">
              <Blocks className="mr-1 h-3 w-3" />
              Built on Base L2
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance text-foreground drop-shadow-sm">
              Blockchain-Verified
              <span className="text-accent"> University Degrees</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl text-pretty drop-shadow-sm">
              Issue, manage, and verify academic credentials on the blockchain. Tamper-proof, globally accessible, and
              instantly verifiable soulbound NFTs for university degree certificates.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/subscribe">
                <Button size="lg" className="gap-2 shadow-lg">
                  Get Started for Universities
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/verify">
                <Button size="lg" variant="outline" className="gap-2 bg-background/80 backdrop-blur-sm border-primary/50 text-primary hover:bg-primary/10">
                  <Search className="h-4 w-4" />
                  Verify a Degree
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-muted/30">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold">100+</div>
              <div className="text-sm text-muted-foreground mt-1">Universities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">50K+</div>
              <div className="text-sm text-muted-foreground mt-1">Degrees Issued</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">30+</div>
              <div className="text-sm text-muted-foreground mt-1">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm text-muted-foreground mt-1">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {customers.length > 0 && (
        <section className="container py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Star className="mr-1 h-3 w-3" />
              Trusted Worldwide
            </Badge>
            <h2 className="text-3xl font-bold">Trusted by Leading Institutions</h2>
            <p className="text-muted-foreground mt-2">
              Universities worldwide have transformed their credential management
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            {customers.map((customer) => (
              <Card key={customer.id} className="bg-card border-border hover:border-primary/50 transition-all group">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-28">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    {customer.logo_url ? (
                      <Image
                        src={customer.logo_url || "/placeholder.svg"}
                        alt={customer.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs font-medium truncate w-full group-hover:text-primary transition-colors">
                    {customer.name}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Link href="/customers">
              <Button variant="outline" className="bg-transparent">
                View All Customers
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="container py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Enterprise-Grade Features</h2>
          <p className="text-muted-foreground mt-2">Everything you need to manage academic credentials</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Lock className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Soulbound NFTs</CardTitle>
              <CardDescription>
                Non-transferable tokens that permanently link degrees to their rightful owners
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Building2 className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Multi-University Support</CardTitle>
              <CardDescription>Onboard multiple institutions with independent admin controls</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <FileCheck className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>Granular permissions for issuers, revokers, and administrators</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <GraduationCap className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Rich Metadata</CardTitle>
              <CardDescription>Store complete degree information including GPA, major, and faculty</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Search className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Instant Verification</CardTitle>
              <CardDescription>Public verification portal for employers and institutions</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Globe className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Global Access</CardTitle>
              <CardDescription>Verify credentials from anywhere, anytime, in multiple languages</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent">
        <div className="container py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                <Calculator className="mr-1 h-3 w-3" />
                ROI Calculator
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Calculate Your Savings</h2>
              <p className="text-muted-foreground mb-6">
                See how much your institution can save with blockchain-verified credentials. Our interactive calculator
                shows real cost reductions and time savings based on your institution's data.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <p className="text-3xl font-bold text-green-500">75%</p>
                  <p className="text-sm text-muted-foreground">Average Cost Reduction</p>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <p className="text-3xl font-bold text-blue-500">90%</p>
                  <p className="text-sm text-muted-foreground">Time Savings</p>
                </div>
              </div>
              <Link href="/roi">
                <Button size="lg" className="gap-2">
                  Calculate Your ROI
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Documentation</h3>
                  <p className="text-sm text-muted-foreground mb-3">Step-by-step guides</p>
                  <Link href="/docs" className="text-sm text-primary hover:underline">
                    Browse Docs
                  </Link>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <HelpCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold mb-1">FAQ</h3>
                  <p className="text-sm text-muted-foreground mb-3">Common questions</p>
                  <Link href="/faq" className="text-sm text-primary hover:underline">
                    View FAQ
                  </Link>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                    <Star className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold mb-1">Case Studies</h3>
                  <p className="text-sm text-muted-foreground mb-3">Success stories</p>
                  <Link href="/roi#case-studies" className="text-sm text-primary hover:underline">
                    See Results
                  </Link>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold mb-1">Contact</h3>
                  <p className="text-sm text-muted-foreground mb-3">Get in touch</p>
                  <Link href="/contact" className="text-sm text-primary hover:underline">
                    Contact Us
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-muted/30">
        <div className="container py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mt-2">Choose the plan that fits your institution</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>For small institutions</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$299</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {["Up to 500 degrees/year", "Basic support", "1 University admin", "Standard verification"].map(
                    (feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        {feature}
                      </li>
                    ),
                  )}
                </ul>
                <Link href="/subscribe?plan=university-starter" className="block mt-6">
                  <Button className="w-full bg-transparent" variant="outline">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Professional */}
            <Card className="border-accent relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground">Most Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <CardDescription>For growing universities</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$799</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Up to 5,000 degrees/year",
                    "Priority support",
                    "Up to 10 Issuers",
                    "Up to 5 Revokers",
                    "Custom branding",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/subscribe?plan=university-professional" className="block mt-6">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For large institutions</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$1,999</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Unlimited degrees",
                    "24/7 dedicated support",
                    "Unlimited users",
                    "White-label solution",
                    "SLA guarantee",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/subscribe?plan=university-enterprise" className="block mt-6">
                  <Button className="w-full bg-transparent" variant="outline">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="container py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-muted-foreground mb-8">
              Subscribe to our newsletter for the latest updates on blockchain credentials, new features, and industry
              insights.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-background"
              />
              <Button type="submit" disabled={subscribing}>
                {subscribing ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
            {subscribeMessage && (
              <p className={`mt-4 text-sm ${subscribeMessage.includes("error") ? "text-red-400" : "text-green-400"}`}>
                {subscribeMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="bg-primary rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground">Ready to modernize your credentials?</h2>
          <p className="text-primary-foreground/80 mt-2 max-w-xl mx-auto">
            Join leading universities already using blockchain technology to issue tamper-proof degree certificates.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/subscribe">
              <Button size="lg" variant="secondary">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              >
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#features" className="hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/roi" className="hover:text-foreground transition-colors">
                    ROI Calculator
                  </Link>
                </li>
                <li>
                  <Link href="/verify" className="hover:text-foreground transition-colors">
                    Verify Degree
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/docs" className="hover:text-foreground transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-foreground transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/customers" className="hover:text-foreground transition-colors">
                    Customers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/contact" className="hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Sign In</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/login" className="hover:text-foreground transition-colors">
                    Login Portal
                  </Link>
                </li>
                <li>
                  <Link href="/university/login" className="hover:text-foreground transition-colors">
                    University Admin
                  </Link>
                </li>
                <li>
                  <Link href="/issuer/login" className="hover:text-foreground transition-colors">
                    Degree Issuer
                  </Link>
                </li>
                <li>
                  <Link href="/revoker/login" className="hover:text-foreground transition-colors">
                    Degree Revoker
                  </Link>
                </li>
                <li>
                  <Link href="/graduate/login" className="hover:text-foreground transition-colors">
                    Graduate
                  </Link>
                </li>
                <li>
                  <Link href="/verifier/login" className="hover:text-foreground transition-colors">
                    Degree Verifier
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-border">
            <Link href="/" className="flex items-center gap-2">
              <EdChainLogo size="md" />
            </Link>
            <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} EdChain. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
