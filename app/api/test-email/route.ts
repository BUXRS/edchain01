/**
 * Test Email Endpoint
 * 
 * Use this to test if email sending is working correctly
 * GET /api/test-email?to=your-email@example.com
 */

import { type NextRequest, NextResponse } from "next/server"
import { sendWelcomeEmail } from "@/lib/services/email-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testEmail = searchParams.get("to")

    if (!testEmail) {
      return NextResponse.json(
        { error: "Please provide 'to' parameter: /api/test-email?to=your-email@example.com" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    console.log(`[TestEmail] Sending test email to ${testEmail}`)

    // Send test welcome email
    const result = await sendWelcomeEmail({
      to: testEmail,
      universityName: "Test University",
      adminName: "Test Admin",
      temporaryPassword: "TestPassword123!",
      onboardingToken: "test-token-12345",
      isTrial: true,
      trialDays: 30,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        emailId: result.emailId,
        from: process.env.RESEND_FROM_EMAIL || "BU Blockchain Degree <onboarding@resend.dev>",
        note: "Check your inbox (and spam folder). If not received, check Resend dashboard for delivery status.",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send email",
          message: "Check server logs for detailed error information",
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[TestEmail] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
