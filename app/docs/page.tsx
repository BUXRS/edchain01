"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Search,
  BookOpen,
  Building2,
  Wallet,
  FileCheck,
  CheckCircle,
  Users,
  ChevronRight,
  Clock,
  Target,
  Shield,
  GraduationCap,
  XCircle,
} from "lucide-react"
import { SiteHeader } from "@/components/shared/site-header"
import { SiteFooter } from "@/components/shared/site-footer"

interface DocGuide {
  id: number
  title: string
  slug: string
  description: string
  category: string
  target_audience: string
  icon: string
}

const iconMap: Record<string, any> = {
  Building2,
  Wallet,
  FileCheck,
  CheckCircle,
  Users,
  Shield,
  BookOpen,
  Clock,
  Target,
  GraduationCap,
  XCircle,
}

const staticDocs: DocGuide[] = [
  {
    id: 1,
    title: "How to Create a MetaMask Wallet",
    slug: "metamask-setup",
    description: "Complete step-by-step guide to setting up your MetaMask wallet for blockchain credentials",
    category: "Getting Started",
    target_audience: "Everyone",
    icon: "Wallet",
  },
  {
    id: 2,
    title: "University Registration Guide",
    slug: "university-registration",
    description: "How to register your university on the EdChain platform",
    category: "Getting Started",
    target_audience: "University Administrators",
    icon: "Building2",
  },
  {
    id: 3,
    title: "How to Issue Degree Certificates",
    slug: "issuing-degrees",
    description: "Step-by-step guide for authorized issuers to mint degree NFTs",
    category: "For Issuers",
    target_audience: "Issuers",
    icon: "FileCheck",
  },
  {
    id: 4,
    title: "Verifying Degree Credentials",
    slug: "verifying-credentials",
    description: "How employers and institutions can verify degree authenticity",
    category: "Verification",
    target_audience: "Employers & Institutions",
    icon: "CheckCircle",
  },
  {
    id: 5,
    title: "University Admin Dashboard Guide",
    slug: "university-admin-guide",
    description: "Complete guide for university administrators to manage their institution",
    category: "For Administrators",
    target_audience: "University Administrators",
    icon: "Building2",
  },
  {
    id: 6,
    title: "How to Revoke a Degree",
    slug: "revoking-degrees",
    description: "Guide for authorized revokers to invalidate degree certificates",
    category: "For Revokers",
    target_audience: "Revokers",
    icon: "XCircle",
  },
  {
    id: 7,
    title: "Graduate Guide: Your Blockchain Degree",
    slug: "graduate-guide",
    description: "Everything graduates need to know about their blockchain-verified credentials",
    category: "For Graduates",
    target_audience: "Graduates",
    icon: "GraduationCap",
  },
  {
    id: 8,
    title: "Platform Administrator Guide",
    slug: "platform-admin-guide",
    description: "Guide for site administrators to manage universities and the platform",
    category: "For Administrators",
    target_audience: "Platform Admins",
    icon: "Shield",
  },
]

export default function DocsPage() {
  const [docs, setDocs] = useState<DocGuide[]>(staticDocs)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchDocs()
  }, [])

  const fetchDocs = async () => {
    try {
      const response = await fetch("/api/cms/docs")
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        setDocs(data)
      }
    } catch (error) {
      console.error("Error fetching docs:", error)
      // Keep static docs as fallback
    } finally {
      setLoading(false)
    }
  }

  const categories = Array.from(new Set(docs.map((doc) => doc.category)))

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === null || doc.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedDocs = filteredDocs.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = []
      }
      acc[doc.category].push(doc)
      return acc
    },
    {} as Record<string, DocGuide[]>,
  )

  const quickLinks = [
    {
      title: "Getting Started",
      description: "New to the platform? Start here",
      icon: Target,
      href: "/docs/university-registration",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Wallet Setup",
      description: "Configure your MetaMask wallet",
      icon: Wallet,
      href: "/docs/metamask-setup",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Issue Degrees",
      description: "For authorized issuers",
      icon: FileCheck,
      href: "/docs/issuing-degrees",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Verify Credentials",
      description: "For employers & institutions",
      icon: CheckCircle,
      href: "/docs/verifying-credentials",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="container relative">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-6">
              <BookOpen className="h-4 w-4" />
              Documentation Center
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Learn How to Use
              <span className="text-primary block">Blockchain Credentials</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Step-by-step guides, tutorials, and resources for universities, issuers, and verifiers.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mt-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-card border-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 border-b border-border">
        <div className="container max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="bg-card border-border hover:border-primary/50 transition-all hover:shadow-lg h-full">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${link.bg} flex items-center justify-center flex-shrink-0`}>
                      <link.icon className={`h-6 w-6 ${link.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{link.title}</h3>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="py-8">
        <div className="container max-w-6xl">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? "bg-primary" : ""}
            >
              All Guides
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-primary" : ""}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation Grid */}
      <section className="py-8 pb-16 flex-1">
        <div className="container max-w-6xl">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-card rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your search or browse all categories.</p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedDocs).map(([category, items]) => (
                <div key={category}>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary rounded-full" />
                    {category}
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((doc) => {
                      const IconComponent = iconMap[doc.icon] || BookOpen
                      return (
                        <Link key={doc.id} href={`/docs/${doc.slug}`}>
                          <Card className="bg-card border-border hover:border-primary/50 transition-all hover:shadow-lg h-full group">
                            <CardHeader>
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                <IconComponent className="h-6 w-6 text-primary" />
                              </div>
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                {doc.title}
                              </CardTitle>
                              <CardDescription>{doc.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <span className="text-xs bg-muted px-2 py-1 rounded">{doc.target_audience}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
