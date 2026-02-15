"use server"

import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PLANS } from "@/lib/products"

interface UniversityData {
  universityName: string
  adminName: string
  phone?: string
  city?: string
}

export async function startSubscriptionCheckout(
  planId: string, 
  universityEmail: string,
  universityData?: UniversityData
) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
  if (!plan) {
    throw new Error(`Plan with id "${planId}" not found`)
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    customer_email: universityEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${plan.name} Plan`,
            description: plan.description,
          },
          unit_amount: plan.priceInCents,
          recurring: {
            interval: plan.interval,
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: {
      planId: plan.id,
      universityEmail,
      universityName: universityData?.universityName || "",
      adminName: universityData?.adminName || "",
      phone: universityData?.phone || "",
      city: universityData?.city || "",
    },
  })

  return session.client_secret
}

export async function getSubscriptionStatus(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    })

    if (subscriptions.data.length > 0) {
      return {
        active: true,
        subscription: subscriptions.data[0],
      }
    }

    return { active: false }
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return { active: false }
  }
}
