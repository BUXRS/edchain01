"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Calculator,
  Clock,
  DollarSign,
  Building2,
  Users,
  FileCheck,
  ChevronRight,
  Quote,
  Target,
  Zap,
  Globe,
  Shield,
} from "lucide-react"
import { SiteHeader } from "@/components/shared/site-header"
import { SiteFooter } from "@/components/shared/site-footer"

interface ROICaseStudy {
  id: number
  university_name: string
  logo_url: string
  country: string
  students_count: number
  degrees_issued: number
  cost_savings_percent: number
  time_savings_percent: number
  verification_time_reduction: string
  annual_savings_amount: number
  testimonial_quote: string
  testimonial_author: string
  testimonial_role: string
  is_featured: boolean
}

export default function ROIPage() {
  const [caseStudies, setCaseStudies] = useState<ROICaseStudy[]>([])
  const [loading, setLoading] = useState(true)

  // Calculator state
  const [studentsPerYear, setStudentsPerYear] = useState(1000)
  const [costPerVerification, setCostPerVerification] = useState(50)
  const [verificationsPerYear, setVerificationsPerYear] = useState(500)
  const [staffHoursPerWeek, setStaffHoursPerWeek] = useState(20)
  const [hourlyRate, setHourlyRate] = useState(30)

  // Calculated values
  const traditionalVerificationCost = verificationsPerYear * costPerVerification
  const traditionalStaffCost = staffHoursPerWeek * hourlyRate * 52
  const totalTraditionalCost = traditionalVerificationCost + traditionalStaffCost

  const blockchainVerificationCost = verificationsPerYear * 0.1 // Near zero with blockchain
  const blockchainStaffCost = staffHoursPerWeek * hourlyRate * 52 * 0.1 // 90% reduction
  const platformFee = studentsPerYear * 5 // $5 per student per year
  const totalBlockchainCost = blockchainVerificationCost + blockchainStaffCost + platformFee

  const annualSavings = totalTraditionalCost - totalBlockchainCost
  const savingsPercent = ((annualSavings / totalTraditionalCost) * 100).toFixed(0)
  const roiPercent = ((annualSavings / platformFee) * 100).toFixed(0)

  useEffect(() => {
    fetchCaseStudies()
  }, [])

  const fetchCaseStudies = async () => {
    try {
      const response = await fetch("/api/cms/roi-cases")
      const data = await response.json()
      setCaseStudies(data)
    } catch (error) {
      console.error("Error fetching case studies:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="container relative">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Home
          </Link>

          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-6">
              <Calculator className="h-4 w-4" />
              ROI Calculator & Case Studies
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Calculate Your
              <span className="text-primary block">Return on Investment</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Discover how blockchain-verified credentials can save your institution time and money while eliminating
              credential fraud.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section className="py-16 bg-card/50">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Interactive ROI Calculator</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Input your institution's numbers to see your potential savings with blockchain credentials
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Your Institution's Data
                </CardTitle>
                <CardDescription>Adjust the sliders to match your current situation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Graduates per Year</Label>
                    <span className="text-primary font-semibold">{studentsPerYear.toLocaleString()}</span>
                  </div>
                  <Slider
                    value={[studentsPerYear]}
                    onValueChange={(v) => setStudentsPerYear(v[0])}
                    min={100}
                    max={50000}
                    step={100}
                    className="w-full"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Cost per Manual Verification</Label>
                    <span className="text-primary font-semibold">${costPerVerification}</span>
                  </div>
                  <Slider
                    value={[costPerVerification]}
                    onValueChange={(v) => setCostPerVerification(v[0])}
                    min={10}
                    max={200}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Verification Requests per Year</Label>
                    <span className="text-primary font-semibold">{verificationsPerYear.toLocaleString()}</span>
                  </div>
                  <Slider
                    value={[verificationsPerYear]}
                    onValueChange={(v) => setVerificationsPerYear(v[0])}
                    min={50}
                    max={10000}
                    step={50}
                    className="w-full"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Staff Hours on Verifications (per week)</Label>
                    <span className="text-primary font-semibold">{staffHoursPerWeek}h</span>
                  </div>
                  <Slider
                    value={[staffHoursPerWeek]}
                    onValueChange={(v) => setStaffHoursPerWeek(v[0])}
                    min={5}
                    max={80}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Average Staff Hourly Rate</Label>
                    <span className="text-primary font-semibold">${hourlyRate}/hr</span>
                  </div>
                  <Slider
                    value={[hourlyRate]}
                    onValueChange={(v) => setHourlyRate(v[0])}
                    min={15}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results Section */}
            <div className="space-y-6">
              {/* Savings Highlight */}
              <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Your Estimated Annual Savings</p>
                    <p className="text-5xl font-bold text-primary mb-2">{formatCurrency(annualSavings)}</p>
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <span className="text-green-500 font-semibold">{savingsPercent}% Cost Reduction</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-primary font-semibold">{roiPercent}% ROI</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-red-500/10 border-red-500/30">
                  <CardContent className="pt-6">
                    <p className="text-xs text-red-400 mb-1">Traditional Cost</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totalTraditionalCost)}</p>
                    <p className="text-xs text-muted-foreground mt-2">Per year</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="pt-6">
                    <p className="text-xs text-green-400 mb-1">With Blockchain</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(totalBlockchainCost)}</p>
                    <p className="text-xs text-muted-foreground mt-2">Per year</p>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Verification Processing</span>
                    <div className="flex gap-4">
                      <span className="text-red-400 line-through">{formatCurrency(traditionalVerificationCost)}</span>
                      <span className="text-green-400">{formatCurrency(blockchainVerificationCost)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Staff Time</span>
                    <div className="flex gap-4">
                      <span className="text-red-400 line-through">{formatCurrency(traditionalStaffCost)}</span>
                      <span className="text-green-400">{formatCurrency(blockchainStaffCost)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <div className="flex gap-4">
                      <span className="text-red-400">$0</span>
                      <span className="text-green-400">{formatCurrency(platformFee)}</span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <div className="flex gap-4">
                        <span className="text-red-400">{formatCurrency(totalTraditionalCost)}</span>
                        <span className="text-green-400">{formatCurrency(totalBlockchainCost)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <Link href="/subscribe" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-lg">
                  Start Saving Today
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Visualization */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Universities Choose Blockchain Credentials</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Beyond cost savings, blockchain credentials provide lasting benefits for your institution
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-card border-border text-center group hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-4xl font-bold text-primary mb-2">30s</h3>
                <p className="text-sm text-muted-foreground">Average Verification Time</p>
                <p className="text-xs text-muted-foreground mt-2">Down from 2+ weeks</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-center group hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/20 transition-colors">
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-4xl font-bold text-green-500 mb-2">75%</h3>
                <p className="text-sm text-muted-foreground">Average Cost Reduction</p>
                <p className="text-xs text-muted-foreground mt-2">In credential management</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-center group hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <Shield className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-4xl font-bold text-blue-500 mb-2">100%</h3>
                <p className="text-sm text-muted-foreground">Fraud Prevention</p>
                <p className="text-xs text-muted-foreground mt-2">Immutable blockchain records</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-center group hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/20 transition-colors">
                  <Globe className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="text-4xl font-bold text-purple-500 mb-2">24/7</h3>
                <p className="text-sm text-muted-foreground">Global Availability</p>
                <p className="text-xs text-muted-foreground mt-2">Verify anywhere, anytime</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-16 bg-card/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Success Stories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how leading institutions have transformed their credential management
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-card border-border animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-16 w-16 bg-muted rounded-lg mb-4" />
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {caseStudies.map((study) => (
                <Card
                  key={study.id}
                  className={`bg-card border-border hover:border-primary/50 transition-colors ${study.is_featured ? "ring-2 ring-primary/20" : ""}`}
                >
                  <CardContent className="pt-6">
                    {study.is_featured && (
                      <div className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full mb-4">
                        <Zap className="h-3 w-3" />
                        Featured
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                        {study.logo_url ? (
                          <Image
                            src={study.logo_url || "/placeholder.svg"}
                            alt={study.university_name}
                            width={64}
                            height={64}
                            className="object-cover"
                          />
                        ) : (
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{study.university_name}</h3>
                        <p className="text-sm text-muted-foreground">{study.country}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-green-500">{study.cost_savings_percent}%</p>
                        <p className="text-xs text-muted-foreground">Cost Savings</p>
                      </div>
                      <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-blue-500">{study.time_savings_percent}%</p>
                        <p className="text-xs text-muted-foreground">Time Savings</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{study.students_count?.toLocaleString()} students</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                        <span>{study.degrees_issued?.toLocaleString()} degrees issued</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{study.verification_time_reduction}</span>
                      </div>
                    </div>

                    {study.testimonial_quote && (
                      <div className="border-t border-border pt-4">
                        <Quote className="h-6 w-6 text-primary/30 mb-2" />
                        <p className="text-sm italic text-muted-foreground mb-3">"{study.testimonial_quote}"</p>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {study.testimonial_author?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{study.testimonial_author}</p>
                            <p className="text-xs text-muted-foreground">{study.testimonial_role}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Credential Management?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                Join leading universities worldwide who have already made the switch to blockchain-verified credentials.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/subscribe">
                  <Button className="bg-primary hover:bg-primary/90 h-12 px-8">
                    Get Started Now
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="h-12 px-8 bg-transparent">
                    Schedule a Demo
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  )
}
