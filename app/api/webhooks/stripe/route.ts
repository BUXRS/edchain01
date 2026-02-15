"use server"

import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/services/email-service"
import { randomBytes } from "crypto"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      await handleCheckoutCompleted(session)
      break
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object
      await handleSubscriptionUpdated(subscription)
      break
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object
      await handleSubscriptionDeleted(subscription)
      break
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object
      await handlePaymentFailed(invoice)
      break
    }
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: any) {
  const {
    customer_email,
    metadata,
    subscription,
    customer,
  } = session

  const {
    planId,
    universityName,
    adminName,
    phone,
    city,
  } = metadata || {}

  if (!customer_email || !universityName) {
    console.error("Missing required metadata in checkout session")
    return
  }

  try {
    // Generate temporary password
    const tempPassword = randomBytes(8).toString("hex")
    const passwordHash = await bcrypt.hash(tempPassword, 10)
    
    // Generate onboarding token
    const onboardingToken = randomBytes(32).toString("hex")
    const tokenExpiry = new Date()
    tokenExpiry.setDate(tokenExpiry.getDate() + 7) // 7 days to complete onboarding

    // Create university in database
    const result = await sql`
      INSERT INTO universities (
        name,
        admin_email,
        admin_name,
        admin_password_hash,
        phone,
        city,
        subscription_type,
        status,
        is_active,
        created_at
      ) VALUES (
        ${universityName},
        ${customer_email},
        ${adminName || ""},
        ${passwordHash},
        ${phone || ""},
        ${city || ""},
        'subscription',
        'pending_onboarding',
        false,
        NOW()
      )
      RETURNING id
    `

    const universityId = result[0]?.id

    if (universityId) {
      // Create registration record
      await sql`
        INSERT INTO university_registrations (
          university_id,
          registration_type,
          subscription_plan,
          is_trial,
          payment_status,
          payment_method,
          payment_reference,
          onboarding_token,
          onboarding_token_expires_at,
          created_at
        ) VALUES (
          ${universityId},
          'subscription',
          ${planId},
          false,
          'completed',
          'stripe',
          ${subscription || customer || ""},
          ${onboardingToken},
          ${tokenExpiry.toISOString()},
          NOW()
        )
      `

      // Create notification for super admin
      await sql`
        INSERT INTO admin_notifications (
          admin_id,
          type,
          title,
          message,
          related_entity_type,
          related_entity_id,
          action_url,
          created_at
        ) VALUES (
          1,
          'new_subscription',
          'New University Subscription',
          ${`${universityName} has subscribed to the ${planId} plan and is pending onboarding.`},
          'university',
          ${universityId},
          ${`/admin/universities/${universityId}`},
          NOW()
        )
      `

      // Send welcome email with onboarding instructions
      const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"}/onboarding/${onboardingToken}`
      
      await sendWelcomeEmail({
        to: customer_email,
        universityName,
        adminName: adminName || "Administrator",
        tempPassword,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"}/university/login`,
        onboardingUrl,
        subscriptionPlan: planId,
        isTrial: false,
      })

      console.log(`Successfully processed subscription for ${universityName}`)
    }
  } catch (error) {
    console.error("Error processing checkout completion:", error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const { customer, status } = subscription

  try {
    // Find university by stripe customer ID or update based on subscription status
    if (status === "active") {
      await sql`
        UPDATE universities 
        SET subscription_type = 'subscription', is_active = true
        WHERE stripe_customer_id = ${customer}
      `
    } else if (status === "past_due" || status === "unpaid") {
      await sql`
        UPDATE universities 
        SET status = 'payment_issue'
        WHERE stripe_customer_id = ${customer}
      `
    }
  } catch (error) {
    console.error("Error handling subscription update:", error)
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const { customer } = subscription

  try {
    await sql`
      UPDATE universities 
      SET subscription_type = 'cancelled', is_active = false, status = 'inactive'
      WHERE stripe_customer_id = ${customer}
    `

    // TODO: Deactivate on blockchain as well
  } catch (error) {
    console.error("Error handling subscription deletion:", error)
  }
}

async function handlePaymentFailed(invoice: any) {
  const { customer_email } = invoice

  try {
    // Update university status
    await sql`
      UPDATE universities 
      SET status = 'payment_failed'
      WHERE admin_email = ${customer_email}
    `

    // TODO: Send payment failed notification email
  } catch (error) {
    console.error("Error handling payment failure:", error)
  }
}
