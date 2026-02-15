"use client"

import { useCallback, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SUBSCRIPTION_PLANS } from "@/lib/products"
import { startSubscriptionCheckout } from "@/app/actions/stripe"
import { ArrowLeft, CheckCircle2, Building2, Shield, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function SubscribePage() {
  const searchParams = useSearchParams()
  const preselectedPlan = searchParams.get("plan")

  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan || "university-professional")
  const [email, setEmail] = useState("")
  const [universityName, setUniversityName] = useState("")
  const [adminName, setAdminName] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [showCheckout, setShowCheckout] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)

  const handleContinue = () => {
    setFormError(null)
    
    if (!email || !universityName || !adminName) {
      setFormError("Please fill in all required fields")
      return
    }
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address")
      return
    }
    
    if (plan) {
      setShowCheckout(true)
    }
  }

  const fetchClientSecret = useCallback(() => {
    // Pass additional university data to the checkout
    return startSubscriptionCheckout(selectedPlan, email, {
      universityName,
      adminName,
      phone,
      city,
    })
  }, [selectedPlan, email, universityName, adminName, phone, city])

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl py-8">
          <Link
            href="/subscribe"
            onClick={(e) => {
              e.preventDefault()
              setShowCheckout(false)
            }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to plan selection
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>Complete Your Subscription</CardTitle>
              <CardDescription>
                {plan?.name} Plan - ${((plan?.priceInCents || 0) / 100).toFixed(2)}/month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex p-3 rounded-full bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Subscribe Your University</h1>
          <p className="text-muted-foreground mt-2">Choose a plan and start issuing blockchain-verified degrees</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Selection */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Select Your Plan</h2>
            {SUBSCRIPTION_PLANS.map((p) => (
              <Card
                key={p.id}
                className={`cursor-pointer transition-colors ${selectedPlan === p.id ? "border-accent" : "hover:border-muted-foreground/50"}`}
                onClick={() => setSelectedPlan(p.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{p.name}</h3>
                        {p.id === "university-professional" && <Badge className="bg-accent">Popular</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                      <p className="text-2xl font-bold mt-2">
                        ${(p.priceInCents / 100).toFixed(0)}
                        <span className="text-sm font-normal text-muted-foreground">/{p.interval}</span>
                      </p>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 ${selectedPlan === p.id ? "border-accent bg-accent" : "border-muted-foreground/30"}`}
                    >
                      {selectedPlan === p.id && <CheckCircle2 className="h-4 w-4 text-accent-foreground" />}
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {p.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* University Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>University Details</CardTitle>
                <CardDescription>
                  Enter your university information. After payment, you will receive access to the university dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="universityName">
                    University Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="universityName"
                    placeholder="e.g., Oxford University"
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">
                      Admin Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="adminName"
                      placeholder="e.g., John Smith"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Admin Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+1 234 567 8900"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="e.g., Cambridge"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>
                
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    After payment, you will receive an email with instructions to sign the NDA, 
                    create your MetaMask wallet, and complete your account setup.
                  </AlertDescription>
                </Alert>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Selected plan</span>
                    <span className="font-medium">{plan?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-muted-foreground">Monthly cost</span>
                    <span className="font-medium">${((plan?.priceInCents || 0) / 100).toFixed(2)}</span>
                  </div>
                  <Button className="w-full" disabled={!email || !universityName} onClick={handleContinue}>
                    Continue to Payment
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  After subscribing, connect your MetaMask wallet in the dashboard. The Super Admin will then approve
                  your wallet to enable on-chain actions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
