export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  priceInCents: number
  interval: "month" | "year"
  features: string[]
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "university-starter",
    name: "Starter",
    description: "For small institutions starting with blockchain credentials",
    priceInCents: 29900, // $299/month
    interval: "month",
    features: ["Up to 500 degrees/year", "Basic support", "1 University admin", "Standard verification page"],
  },
  {
    id: "university-professional",
    name: "Professional",
    description: "For growing universities with advanced needs",
    priceInCents: 79900, // $799/month
    interval: "month",
    features: [
      "Up to 5,000 degrees/year",
      "Priority support",
      "Up to 10 Issuers",
      "Up to 5 Revokers",
      "Custom branding",
      "API access",
    ],
  },
  {
    id: "university-enterprise",
    name: "Enterprise",
    description: "For large institutions with unlimited scale",
    priceInCents: 199900, // $1999/month
    interval: "month",
    features: [
      "Unlimited degrees",
      "24/7 dedicated support",
      "Unlimited Issuers & Revokers",
      "White-label solution",
      "Advanced analytics",
      "SLA guarantee",
    ],
  },
]
