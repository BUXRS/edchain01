"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Shield, 
  Building2, 
  FileSignature, 
  FileX, 
  GraduationCap,
  UserCheck,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info
} from "lucide-react"

const loginOptions = [
  {
    title: "Super Admin",
    description: "Platform administrators with full system access",
    icon: Shield,
    href: "/admin/login",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20 hover:border-red-500/40",
    features: [
      "Manage all universities",
      "Platform configuration",
      "User management",
      "System analytics"
    ]
  },
  {
    title: "University Admin",
    description: "University administrators managing their institution",
    icon: Building2,
    href: "/university/login",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20 hover:border-primary/40",
    features: [
      "Manage issuers & revokers",
      "View issued degrees",
      "Subscription management",
      "Institution settings"
    ]
  },
  {
    title: "Degree Issuer",
    description: "Authorized personnel who can issue degree certificates",
    icon: FileSignature,
    href: "/issuer/login",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20 hover:border-green-500/40",
    features: [
      "Issue new degrees",
      "View issuance history",
      "Student verification",
      "Batch issuance"
    ]
  },
  {
    title: "Degree Revoker",
    description: "Authorized personnel who can revoke degree certificates",
    icon: FileX,
    href: "/revoker/login",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20 hover:border-orange-500/40",
    features: [
      "Revoke degrees",
      "View revocation history",
      "Revocation reports",
      "Audit trail"
    ]
  },
  {
    title: "Graduate / Holder",
    description: "Degree holders who want to view and share their credentials",
    icon: GraduationCap,
    href: "/graduate/login",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20 hover:border-blue-500/40",
    features: [
      "View your degrees",
      "Share credentials",
      "Download certificates",
      "Verification links"
    ]
  },
  {
    title: "Degree Verifier",
    description: "Authorized personnel who approve degree and revocation requests",
    icon: UserCheck,
    href: "/verifier/login",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20 hover:border-purple-500/40",
    features: [
      "Approve degree requests",
      "Approve revocation requests",
      "View approval history",
      "Multi-verifier workflow"
    ]
  }
]

export default function LoginPortalPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <div className="max-w-5xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Welcome to EdChain</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select your role to access the appropriate dashboard. Each role has specific permissions 
              and capabilities within the blockchain-based credential verification system.
            </p>
          </div>

          {/* Important Notice */}
          <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium text-foreground mb-1">Important: Wallet Connection Required</h3>
                <p className="text-sm text-muted-foreground">
                  After logging in with your credentials, you will need to connect your MetaMask wallet to perform 
                  blockchain transactions. Your wallet address must match the one registered in our system and 
                  verified on the smart contract.
                </p>
              </div>
            </div>
          </div>

          {/* Login Options Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loginOptions.map((option) => (
              <Card 
                key={option.title} 
                className={`relative overflow-hidden border-2 ${option.borderColor} bg-card/50 backdrop-blur transition-all hover:shadow-lg hover:-translate-y-1`}
              >
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg ${option.bgColor} flex items-center justify-center mb-4`}>
                    <option.icon className={`h-6 w-6 ${option.color}`} />
                  </div>
                  <CardTitle className="text-xl">{option.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {option.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {option.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className={`h-4 w-4 ${option.color} shrink-0`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full mt-4 bg-transparent" variant="outline">
                    <Link href={option.href} className="flex items-center justify-center gap-2">
                      Login as {option.title}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">New to EdChain?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  If your university is not yet registered, you can apply for a subscription to start 
                  issuing blockchain-verified academic credentials.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/subscribe">Register Your University</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Verify a Credential</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Are you an employer or institution looking to verify an academic credential? 
                  Use our public verification portal - no account required.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/verify">Verify a Degree</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Help Section */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Check our{" "}
              <Link href="/docs" className="text-primary hover:underline">
                documentation
              </Link>
              {" "}or{" "}
              <Link href="/faq" className="text-primary hover:underline">
                FAQ
              </Link>
              {" "}for guidance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
