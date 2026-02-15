"use client"

import { useState } from "react"
import Link from "next/link"
import { SiteHeader } from "@/components/shared/site-header"
import { SiteFooter } from "@/components/shared/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  GraduationCap,
  Building2,
  Target,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Shield,
  Zap,
  Users,
  FileCheck,
  BarChart3,
  ClipboardList,
  DollarSign,
  Sparkles,
  LayoutList,
  Globe,
} from "lucide-react"

const TRAINING_CENTER_BENEFITS = [
  {
    icon: FileCheck,
    title: "Certificate verification",
    description: "Issue and verify course completion and professional certificates instantly. No more manual verification or fraud.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Zap,
    title: "Faster credential delivery",
    description: "Deliver tamper-proof digital credentials to trainees as soon as they complete a program. No printing or postal delays.",
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    icon: Users,
    title: "Employer trust",
    description: "Employers can verify trainee credentials in seconds. Increase placement rates and partner confidence.",
    color: "bg-green-500/10 text-green-500",
  },
  {
    icon: BarChart3,
    title: "Analytics & compliance",
    description: "Track issued credentials, completion rates, and maintain audit trails for accreditation and compliance.",
    color: "bg-blue-500/10 text-blue-500",
  },
]

const UNIVERSITY_BENEFITS = [
  {
    icon: GraduationCap,
    title: "Degree verification",
    description: "Issue soulbound degree NFTs. Employers and institutions verify authenticity in seconds with no back-and-forth.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Shield,
    title: "Anti-fraud & revocation",
    description: "Tamper-proof records and built-in revocation. Protect your institution's reputation and graduate identity.",
    color: "bg-red-500/10 text-red-500",
  },
  {
    icon: Globe,
    title: "Global recognition",
    description: "Credentials are portable and verifiable worldwide. Simplify transfers and international recruitment.",
    color: "bg-green-500/10 text-green-500",
  },
  {
    icon: TrendingUp,
    title: "Operational savings",
    description: "Cut manual verification costs, transcript requests, and administrative overhead by up to 75%.",
    color: "bg-amber-500/10 text-amber-500",
  },
]

const TRAINING_PROCESS = [
  { step: 1, title: "Register your center", body: "Sign up with EdChain, complete KYC, and connect your wallet. We'll verify your training center and set up your account." },
  { step: 2, title: "Define your programs", body: "Add courses or programs (name, duration, skills). Each program can have its own credential template." },
  { step: 3, title: "Issue credentials", body: "When a trainee completes a program, issue a blockchain certificate from your dashboard. They receive a verification link instantly." },
  { step: 4, title: "Verification & analytics", body: "Employers verify via link or token ID. You get analytics on issued credentials and verification traffic." },
]

const UNIVERSITY_PROCESS = [
  { step: 1, title: "Onboard your institution", body: "Register your university, add admins, issuers, and revokers. Connect your wallet and complete the onboarding flow." },
  { step: 2, title: "Configure degrees", body: "Set up degree types, faculties, and metadata (GPA scale, levels). Integrate with your student information system if needed." },
  { step: 3, title: "Issue degrees", body: "Authorized issuers mint soulbound degree NFTs for graduates. Each degree is permanently linked to the graduate's wallet." },
  { step: 4, title: "Verify & revoke", body: "Public verification portal for employers. Revokers can invalidate degrees when required; status is visible on-chain." },
]

const TRAINING_ROI = [
  { label: "Cost per credential", value: "~$0.10", sub: "On Base L2" },
  { label: "Verification time", value: "< 30 sec", sub: "vs days by email" },
  { label: "Admin time saved", value: "Up to 70%", sub: "Fewer manual checks" },
  { label: "Fraud reduction", value: "Near zero", sub: "Tamper-proof" },
]

const UNIVERSITY_ROI = [
  { label: "Cost per degree issued", value: "~$0.10", sub: "Gas on Base L2" },
  { label: "Transcript requests", value: "−80%", sub: "Self-serve verify" },
  { label: "Verification staff time", value: "−90%", sub: "Instant checks" },
  { label: "International verification", value: "24/7", sub: "No time zones" },
]

const TRAINING_GUIDANCE = [
  { q: "What do I need to get started?", a: "A business email, your training center details, and a MetaMask (or compatible) wallet. No crypto experience required—we guide you through setup." },
  { q: "Can I issue different types of certificates?", a: "Yes. You can create multiple programs (e.g. 'Data Analytics', 'Project Management'). Each can have its own credential design and verification link." },
  { q: "How do trainees receive their credentials?", a: "After you issue a credential, the trainee gets a unique verification link. They can share it with employers or add it to LinkedIn and resumes." },
  { q: "What if I need to revoke a certificate?", a: "Training center admins can revoke a credential if it was issued in error or if a trainee violated policy. Revocation is permanent and visible to verifiers." },
]

const UNIVERSITY_GUIDANCE = [
  { q: "How do we add issuers and revokers?", a: "University admins invite issuers and revokers via email. They complete onboarding (agreement, wallet connection) and are then authorized on-chain." },
  { q: "Can we integrate with our SIS?", a: "We support batch issuance and APIs. You can export graduate data from your SIS and issue degrees in bulk, or integrate for automated issuance." },
  { q: "What appears on the blockchain?", a: "Degree metadata (graduate name, level, major, faculty, GPA, issue date) and revocation status. No sensitive personal data beyond what's on a traditional diploma." },
  { q: "How does verification work for employers?", a: "Employers go to edchain.io/verify, enter the graduate's token ID or use the shared link. They see verified status, degree details, and institution—no need to contact your office." },
]

export default function SolutionsPage() {
  const [activeTab, setActiveTab] = useState("training")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-card/50 to-background">
        <div className="container py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              For institutions
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
              How EdChain works for you
            </h1>
            <p className="mt-6 text-lg text-muted-foreground text-pretty">
              Whether you run a training center or a university, see how EdChain helps you issue,
              verify, and manage credentials—with clear process, methodology, and ROI.
            </p>
          </div>
        </div>
      </section>

      {/* Tabs + Content */}
      <section className="container py-12 md:py-16 max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-xl mb-10">
            <TabsTrigger value="training" className="rounded-lg text-base font-medium data-[state=active]:shadow-md data-[state=active]:bg-background">
              <Target className="mr-2 h-5 w-5" />
              Training centers
            </TabsTrigger>
            <TabsTrigger value="universities" className="rounded-lg text-base font-medium data-[state=active]:shadow-md data-[state=active]:bg-background">
              <Building2 className="mr-2 h-5 w-5" />
              Universities
            </TabsTrigger>
          </TabsList>

          {/* Training centers tab */}
          <TabsContent value="training" className="mt-0 space-y-16">
            {/* Why training centers */}
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Why training centers use EdChain
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Professional and vocational training centers need fast, credible credentials that employers trust.
                EdChain lets you issue blockchain-verified certificates so graduates can prove completion instantly—no phone calls or paper.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TRAINING_CENTER_BENEFITS.map((b) => (
                  <Card key={b.title} className="border-border bg-card/50 hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${b.color}`}>
                        <b.icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{b.title}</CardTitle>
                      <CardDescription className="text-sm">{b.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            {/* Process & methodology */}
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <LayoutList className="h-6 w-6 text-primary" />
                Process & methodology
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Four steps from registration to verification. Same workflow for every program.
              </p>
              <div className="space-y-4">
                {TRAINING_PROCESS.map((p) => (
                  <Card key={p.step} className="border-border bg-card/30 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 sm:w-32 p-6 bg-primary/5 border-b sm:border-b-0 sm:border-r border-border">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                            {p.step}
                          </span>
                          <span className="font-semibold sm:mt-3 sm:text-sm text-muted-foreground">Step {p.step}</span>
                        </div>
                        <div className="p-6 flex-1">
                          <h3 className="font-semibold text-lg mb-1">{p.title}</h3>
                          <p className="text-muted-foreground text-sm">{p.body}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* ROI */}
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                ROI for training centers
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Lower cost per credential, less admin time, and instant verification for employers.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {TRAINING_ROI.map((r) => (
                  <Card key={r.label} className="border-border bg-card/50 text-center">
                    <CardContent className="pt-6 pb-6">
                      <p className="text-2xl font-bold text-primary">{r.value}</p>
                      <p className="text-sm font-medium mt-1">{r.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/roi">
                  <Button variant="outline" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Open full ROI calculator
                  </Button>
                </Link>
              </div>
            </div>

            {/* Step-by-step guidance */}
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Step-by-step guidance
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Common questions and clear answers for training centers.
              </p>
              <Accordion type="single" collapsible className="w-full">
                {TRAINING_GUIDANCE.map((g, i) => (
                  <AccordionItem key={i} value={`t-${i}`} className="border-border">
                    <AccordionTrigger className="text-left font-medium hover:no-underline">
                      {g.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{g.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Ready for training centers?</h3>
                  <p className="text-muted-foreground text-sm mt-1">Get in touch or start your subscription.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/contact">
                    <Button variant="outline">Contact sales</Button>
                  </Link>
                  <Link href="/subscribe">
                    <Button className="gap-2">Get started <ArrowRight className="h-4 w-4" /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Universities tab */}
          <TabsContent value="universities" className="mt-0 space-y-16">
            {/* Why universities */}
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                Why universities use EdChain
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Universities need a secure, scalable way to issue and verify degrees. EdChain provides soulbound degree NFTs,
                role-based issuers and revokers, and a public verification portal—so your office spends less time on verification requests.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {UNIVERSITY_BENEFITS.map((b) => (
                  <Card key={b.title} className="border-border bg-card/50 hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${b.color}`}>
                        <b.icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{b.title}</CardTitle>
                      <CardDescription className="text-sm">{b.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            {/* Process & methodology */}
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <LayoutList className="h-6 w-6 text-primary" />
                Process & methodology
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                From onboarding to issuance and verification—structured for registrar and IT teams.
              </p>
              <div className="space-y-4">
                {UNIVERSITY_PROCESS.map((p) => (
                  <Card key={p.step} className="border-border bg-card/30 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 sm:w-32 p-6 bg-primary/5 border-b sm:border-b-0 sm:border-r border-border">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                            {p.step}
                          </span>
                          <span className="font-semibold sm:mt-3 sm:text-sm text-muted-foreground">Step {p.step}</span>
                        </div>
                        <div className="p-6 flex-1">
                          <h3 className="font-semibold text-lg mb-1">{p.title}</h3>
                          <p className="text-muted-foreground text-sm">{p.body}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* ROI */}
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                ROI for universities
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Reduce verification workload, cut costs per degree, and give employers instant access.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {UNIVERSITY_ROI.map((r) => (
                  <Card key={r.label} className="border-border bg-card/50 text-center">
                    <CardContent className="pt-6 pb-6">
                      <p className="text-2xl font-bold text-primary">{r.value}</p>
                      <p className="text-sm font-medium mt-1">{r.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/roi">
                  <Button variant="outline" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Open full ROI calculator
                  </Button>
                </Link>
              </div>
            </div>

            {/* Step-by-step guidance */}
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" />
                Step-by-step guidance
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Common questions and clear answers for universities.
              </p>
              <Accordion type="single" collapsible className="w-full">
                {UNIVERSITY_GUIDANCE.map((g, i) => (
                  <AccordionItem key={i} value={`u-${i}`} className="border-border">
                    <AccordionTrigger className="text-left font-medium hover:no-underline">
                      {g.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{g.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Ready for universities?</h3>
                  <p className="text-muted-foreground text-sm mt-1">Subscribe or talk to our team for custom deployment.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/contact">
                    <Button variant="outline">Contact sales</Button>
                  </Link>
                  <Link href="/subscribe">
                    <Button className="gap-2">Get started <ArrowRight className="h-4 w-4" /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <SiteFooter />
    </div>
  )
}
