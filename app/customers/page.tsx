"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Globe, Star, ChevronRight, MapPin, ExternalLink, Users, Award } from "lucide-react"
import { SiteHeader } from "@/components/shared/site-header"
import { SiteFooter } from "@/components/shared/site-footer"

interface Customer {
  id: number
  name: string
  logo_url: string
  website: string
  country: string
  description: string
  is_featured: boolean
  sort_order: number
}

const staticCustomers: Customer[] = [
  {
    id: 1,
    name: "RAK University",
    logo_url: "/rak-university-logo.jpg",
    website: "https://raku.edu.ae",
    country: "UAE",
    description: "Leading university in Ras Al Khaimah pioneering blockchain credentials in the Gulf region.",
    is_featured: true,
    sort_order: 1,
  },
  {
    id: 2,
    name: "Dubai Tech University",
    logo_url: "/dubai-tech-university-logo.jpg",
    website: "https://dtu.ae",
    country: "UAE",
    description: "Innovative technology-focused institution embracing digital transformation in education.",
    is_featured: true,
    sort_order: 2,
  },
  {
    id: 3,
    name: "Cairo University",
    logo_url: "/cairo-university-logo.jpg",
    website: "https://cu.edu.eg",
    country: "Egypt",
    description: "One of the largest universities in the Middle East, serving over 200,000 students.",
    is_featured: false,
    sort_order: 3,
  },
  {
    id: 4,
    name: "King Saud University",
    logo_url: "/king-saud-university-logo.jpg",
    website: "https://ksu.edu.sa",
    country: "Saudi Arabia",
    description: "Premier Saudi university advancing digital innovation in academic credentials.",
    is_featured: false,
    sort_order: 4,
  },
]

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(staticCustomers)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/cms/customers")
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        setCustomers(data)
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
      // Keep static customers as fallback
    } finally {
      setLoading(false)
    }
  }

  const featuredCustomers = customers.filter((c) => c.is_featured)
  const otherCustomers = customers.filter((c) => !c.is_featured)

  const stats = [
    { label: "Universities", value: "100+", icon: Building2 },
    { label: "Countries", value: "30+", icon: Globe },
    { label: "Degrees Issued", value: "50K+", icon: Award },
    { label: "Graduates", value: "500K+", icon: Users },
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
              <Star className="h-4 w-4" />
              Trusted by Leading Institutions
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Universities Worldwide
              <span className="text-primary block">Trust Our Platform</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Join the growing network of educational institutions revolutionizing credential verification with
              blockchain technology.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 border-b border-border">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <Card key={stat.label} className="bg-card border-border">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Customers */}
      {featuredCustomers.length > 0 && (
        <section className="py-16">
          <div className="container max-w-6xl">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full" />
              Featured Partners
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredCustomers.map((customer) => (
                <Card key={customer.id} className="bg-card border-border hover:border-primary/50 transition-all">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-6">
                      <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                        <Image
                          src={customer.logo_url || "/placeholder.svg"}
                          alt={customer.name}
                          width={80}
                          height={80}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{customer.name}</h3>
                          <Star className="h-4 w-4 text-primary fill-primary" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <MapPin className="h-4 w-4" />
                          {customer.country}
                        </div>
                        <p className="text-muted-foreground mb-4">{customer.description}</p>
                        {customer.website && (
                          <a
                            href={customer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            Visit Website
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Customers Grid */}
      {otherCustomers.length > 0 && (
        <section className="py-16 bg-card/50">
          <div className="container max-w-6xl">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full" />
              All Partner Universities
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {otherCustomers.map((customer) => (
                <Card key={customer.id} className="bg-card border-border hover:border-primary/50 transition-all">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4 overflow-hidden">
                      <Image
                        src={customer.logo_url || "/placeholder.svg"}
                        alt={customer.name}
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    </div>
                    <h3 className="font-semibold mb-1">{customer.name}</h3>
                    <p className="text-sm text-muted-foreground">{customer.country}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 flex-1">
        <div className="container max-w-6xl">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Join Our Network?</h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Transform your credential verification process with blockchain technology. Get started today.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/contact">
                  <Button variant="outline" size="lg">
                    Contact Sales
                  </Button>
                </Link>
                <Link href="/subscribe">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Get Started
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
