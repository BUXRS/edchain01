"use client"

import Link from "next/link"
import { SiteHeader } from "@/components/shared/site-header"
import { SiteFooter } from "@/components/shared/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  GraduationCap,
  Shield,
  Globe,
  Lock,
  ArrowRight,
  BookOpen,
  Users,
  Zap,
} from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-card/30">
          <div className="container py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
                About EdChain
              </h1>
              <p className="mt-6 text-lg text-muted-foreground text-pretty">
                EdChain is the trusted platform for blockchain-verified university credentials.
                We help institutions issue, manage, and verify degree certificates with tamper-proof
                technology on Base L2.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & values */}
        <section className="container py-16 md:py-24">
          <h2 className="text-2xl font-bold mb-8 text-center">Our mission</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16">
            To make credentials trustworthy, portable, and instantly verifiable for graduates,
            employers, and institutions worldwide.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-2xl border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Trust & integrity</CardTitle>
                <CardDescription>
                  Soulbound NFTs ensure degrees are tamper-proof and permanently linked to their owners.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Global access</CardTitle>
                <CardDescription>
                  Verify credentials from anywhere, anytime. No single point of failure.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Privacy-first</CardTitle>
                <CardDescription>
                  On-chain verification without exposing unnecessary personal data.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Instant verification</CardTitle>
                <CardDescription>
                  Employers and institutions can confirm credentials in seconds.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Who we serve */}
        <section className="border-y border-border bg-muted/20">
          <div className="container py-16 md:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-4">Who we serve</h2>
                <p className="text-muted-foreground mb-6">
                  EdChain is built for universities, graduates, and verifiers. We provide
                  role-based access for issuers, revokers, and administrators so each institution
                  can run credential operations securely and at scale.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary flex-shrink-0" />
                    Universities and higher education institutions
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary flex-shrink-0" />
                    Employers and verification agencies
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                    Graduates who own and share their credentials
                  </li>
                </ul>
              </div>
              <Card className="rounded-2xl border-border bg-card/50 p-6">
                <h3 className="font-semibold mb-4">Built on Base L2</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  EdChain runs on Base, a secure, low-cost Ethereum L2. Credentials are
                  soulbound NFTs that cannot be transferred, protecting both institutions
                  and graduates from fraud.
                </p>
                <Link href="/docs">
                  <Button className="gap-2">
                    Read the docs
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container py-16 md:py-24">
          <div className="rounded-2xl bg-primary p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-primary-foreground">Get in touch</h2>
            <p className="text-primary-foreground/80 mt-2 max-w-xl mx-auto">
              Questions about EdChain or ready to bring blockchain credentials to your institution?
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" variant="secondary">
                  Contact us
                </Button>
              </Link>
              <Link href="/verify">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
                >
                  Verify a degree
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
