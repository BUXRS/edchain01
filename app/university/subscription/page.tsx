"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, CreditCard, Calendar, ArrowRight } from "lucide-react"

export default function UniversitySubscriptionPage() {
  return (
    <div className="min-h-screen">
      <DashboardHeader title="Subscription" />

      <div className="p-6 space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
                <CardDescription>Your subscription details</CardDescription>
              </div>
              <Badge className="bg-accent">Professional</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className="text-2xl font-bold">$799</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Degrees Used</p>
                <p className="text-2xl font-bold">
                  0 <span className="text-sm font-normal text-muted-foreground">/ 5,000</span>
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Next Billing</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Feb 16
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-4">Plan Features</h3>
              <ul className="space-y-3">
                {[
                  "Up to 5,000 degrees/year",
                  "Priority support",
                  "Up to 10 Issuers",
                  "Up to 5 Revokers",
                  "Custom branding",
                  "API access",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>Need more capacity? Upgrade to Enterprise for unlimited degrees.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <h3 className="font-semibold">Enterprise Plan</h3>
                <p className="text-sm text-muted-foreground">Unlimited degrees, 24/7 support, white-label solution</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">$1,999/mo</span>
                <Button>
                  Upgrade
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
