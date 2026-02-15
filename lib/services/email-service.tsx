import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "BU Blockchain Degree <onboarding@resend.dev>"
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@bubd.io"

// Generate a secure random password
export function generatePassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  const array = new Uint32Array(length)
  if (typeof crypto !== "undefined") {
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length]
    }
  } else {
    for (let i = 0; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }
  }
  return password
}

// Generate a unique onboarding token
export function generateOnboardingToken(): string {
  const array = new Uint8Array(32)
  if (typeof crypto !== "undefined") {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// Send welcome email to new university admin
export async function sendWelcomeEmail(params: {
  to: string
  universityName: string
  adminName: string
  password?: string
  temporaryPassword?: string
  onboardingToken?: string
  trialEndDate?: string
  isTrial?: boolean
  isTrialAccount?: boolean
  trialDays?: number
  subscriptionPlan?: string
  loginUrl?: string
  onboardingUrl?: string
}): Promise<{ success: boolean; error?: string; emailId?: string }> {
  if (!resend) {
    console.error("[EmailService] ❌ Resend not configured. RESEND_API_KEY is missing.")
    return { success: false, error: "Email service not configured" }
  }

  const {
    to,
    universityName,
    adminName,
    password,
    temporaryPassword,
    onboardingToken,
    trialEndDate,
    isTrial = false,
    isTrialAccount = false,
    trialDays = 14,
    subscriptionPlan,
    loginUrl,
    onboardingUrl: providedOnboardingUrl,
  } = params

  // Use password or temporaryPassword (backward compatibility)
  const actualPassword = password || temporaryPassword
  const actualIsTrial = isTrial || isTrialAccount

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"
  const actualOnboardingUrl = providedOnboardingUrl || (onboardingToken ? `${baseUrl}/onboarding/${onboardingToken}` : `${baseUrl}/university/login`)
  const actualLoginUrl = loginUrl || `${baseUrl}/university/login`

  const subscriptionInfo = actualIsTrial
    ? trialEndDate 
      ? `You have been granted a trial period that expires on ${trialEndDate}.`
      : `You have been granted a ${trialDays}-day trial period to explore all features of our platform.`
    : `Your ${subscriptionPlan || "subscription"} plan is now active.`

  if (!actualPassword) {
    console.error("[EmailService] ❌ Password is required for welcome email")
    return { success: false, error: "Password is required" }
  }

  try {
    console.log(`[EmailService] 📧 Sending welcome email to ${to} for ${universityName}`)
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Welcome to BU Blockchain Degree Protocol - ${universityName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BU Blockchain Degree Protocol</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1219; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1f36 0%, #2d3a5c 100%); border-radius: 16px; padding: 40px; border: 1px solid #3d4a6a;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #d4a853; margin: 0; font-size: 28px;">Welcome to BU Blockchain Degree</h1>
        <p style="color: #94a3b8; margin-top: 8px;">Enterprise-Grade Credential Verification</p>
      </div>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Dear ${adminName},
      </p>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Congratulations! <strong>${universityName}</strong> has been registered on the BU Blockchain Degree Protocol.
        ${subscriptionInfo}
      </p>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: #d4a853; margin: 0 0 16px 0; font-size: 18px;">Your Login Credentials</h3>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Email:</strong> ${to}</p>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #2d3a5c; padding: 4px 8px; border-radius: 4px;">${actualPassword}</code></p>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 16px;">
          Please change your password after your first login for security purposes.
        </p>
      </div>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #d4a853;">
        <h3 style="color: #d4a853; margin: 0 0 16px 0; font-size: 18px;">Next Steps - Complete Your Setup</h3>
        <ol style="color: #f0f2f8; padding-left: 20px; line-height: 1.8;">
          <li>Review and sign the NDA & Confidentiality Agreement</li>
          <li>Create a MetaMask wallet (we'll guide you through the process)</li>
          <li>Submit your wallet address to activate your account</li>
          <li>Start issuing blockchain-verified degrees!</li>
        </ol>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${actualOnboardingUrl}" style="display: inline-block; background: #d4a853; color: #1a1f36; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            ${onboardingToken ? "Complete Onboarding" : "Login to Dashboard"}
          </a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #3d4a6a; margin-top: 32px; padding-top: 24px;">
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
          Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #d4a853;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    })

    if (result.error) {
      console.error("[EmailService] ❌ Error sending welcome email:", result.error)
      return { success: false, error: result.error.message || String(result.error) }
    }

    console.log(`[EmailService] ✅ Welcome email sent successfully. Email ID: ${result.data?.id || "unknown"}`)
    return { success: true, emailId: result.data?.id }
  } catch (error: any) {
    console.error("[EmailService] ❌ Failed to send welcome email:", error)
    return { success: false, error: error?.message || String(error) }
  }
}

// Send account activated email
export async function sendAccountActivatedEmail(params: {
  to: string
  universityName: string
  adminName: string
  walletAddress: string
  blockchainId?: number
  txHash?: string
  adminEmail?: string
  subscriptionType?: string
  expiresAt?: string
  isTrial?: boolean
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("[v0] Resend not configured, skipping email")
    return { success: true }
  }

  const { 
    to, 
    universityName, 
    adminName, 
    walletAddress, 
    blockchainId,
    txHash,
    adminEmail,
    subscriptionType,
    expiresAt,
    isTrial
  } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"
  const loginUrl = `${baseUrl}/university/login`
  const walletLoginUrl = `${baseUrl}/university/login`
  const dashboardUrl = `${baseUrl}/university`
  const docsUrl = `${baseUrl}/docs/getting-started`
  const explorerUrl = txHash ? `https://basescan.org/tx/${txHash}` : null

  const subscriptionInfo = isTrial && expiresAt
    ? `Trial Period: Expires on ${expiresAt}`
    : subscriptionType
    ? `Subscription: ${subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)}`
    : ""

  try {
    console.log(`[EmailService] 📧 Sending comprehensive activation email to ${to} for ${universityName}`)
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `🎉 Congratulations! ${universityName} Account Activated on Blockchain | BU Blockchain Degree`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f1219; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1f36 0%, #2d3a5c 100%); border-radius: 16px; padding: 40px; border: 1px solid #3d4a6a;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 40px;">🎉</span>
        </div>
        <h1 style="color: #10b981; margin: 0; font-size: 28px;">Congratulations!</h1>
        <p style="color: #94a3b8; margin-top: 8px; font-size: 16px;">Your University is Now Live on Blockchain</p>
      </div>
      
      <!-- Greeting -->
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Dear ${adminName},
      </p>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        We're thrilled to inform you that <strong style="color: #d4a853;">${universityName}</strong> has been successfully registered on the Base blockchain and your account is now fully activated! Your wallet has been connected and verified on the smart contract.
      </p>

      <!-- Blockchain Registration Confirmation -->
      <div style="background: linear-gradient(135deg, #10b98115 0%, #05966915 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #10b981;">
        <h3 style="color: #10b981; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          <span>✓</span> Blockchain Registration Confirmed
        </h3>
        <div style="color: #f0f2f8; font-size: 14px; line-height: 1.8;">
          <p style="margin: 8px 0;"><strong>University ID:</strong> <code style="background: #2d3a5c; padding: 4px 8px; border-radius: 4px;">#${blockchainId || 'N/A'}</code></p>
          <p style="margin: 8px 0;"><strong>Network:</strong> Base Mainnet (Chain ID: 8453)</p>
          ${txHash ? `<p style="margin: 8px 0;"><strong>Transaction:</strong> <a href="${explorerUrl}" style="color: #d4a853; text-decoration: underline;">${txHash.slice(0, 10)}...${txHash.slice(-8)}</a></p>` : ''}
          <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: #10b981;">✓ Active & Verified</span></p>
        </div>
      </div>

      <!-- Login Credentials -->
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: #d4a853; margin: 0 0 16px 0; font-size: 18px;">🔐 Your Login Credentials</h3>
        <div style="background: #1a1f36; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Email Address</p>
          <p style="color: #f0f2f8; font-size: 16px; margin: 0; font-family: monospace; word-break: break-all;">${adminEmail || to}</p>
        </div>
        <div style="background: #1a1f36; border-radius: 8px; padding: 16px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase;">Password</p>
          <p style="color: #f0f2f8; font-size: 16px; margin: 0; font-family: monospace;">
            Your password was sent in the welcome email. If you need to reset it, use the "Forgot Password" link on the login page.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 12px; margin-bottom: 0;">
          💡 <strong>Tip:</strong> You can also login directly with your connected wallet using MetaMask!
        </p>
      </div>

      <!-- Connected Wallet -->
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: #d4a853; margin: 0 0 16px 0; font-size: 18px;">💼 Connected Wallet Address</h3>
        <p style="color: #f0f2f8; margin: 0; word-break: break-all; font-family: monospace; font-size: 14px; background: #2d3a5c; padding: 12px; border-radius: 8px;">
          ${walletAddress}
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 12px; margin-bottom: 0;">
          This wallet is now registered as the admin wallet for ${universityName} on the blockchain. Make sure to keep it secure!
        </p>
      </div>

      ${subscriptionInfo ? `
      <!-- Subscription Info -->
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: #d4a853; margin: 0 0 16px 0; font-size: 18px;">📅 Subscription Information</h3>
        <p style="color: #f0f2f8; margin: 0; font-size: 16px;">${subscriptionInfo}</p>
      </div>
      ` : ''}

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: #d4a853; color: #1a1f36; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 12px;">
          🚀 Go to Dashboard
        </a>
        <div style="margin-top: 12px;">
          <a href="${walletLoginUrl}" style="display: inline-block; background: transparent; color: #d4a853; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; border: 1px solid #d4a853;">
            Login with Wallet
          </a>
        </div>
      </div>
      
      <!-- Next Steps Guide -->
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #10b981;">
        <h3 style="color: #10b981; margin: 0 0 20px 0; font-size: 18px;">📋 Next Steps & Getting Started Guide</h3>
        
        <div style="margin-bottom: 20px;">
          <h4 style="color: #d4a853; margin: 0 0 8px 0; font-size: 16px;">Step 1: Access Your Dashboard</h4>
          <p style="color: #f0f2f8; font-size: 14px; line-height: 1.6; margin: 0;">
            Log in using your email and password, or connect your MetaMask wallet. Once logged in, you'll see your university dashboard with all available features.
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="color: #d4a853; margin: 0 0 8px 0; font-size: 16px;">Step 2: Add Authorized Issuers</h4>
          <p style="color: #f0f2f8; font-size: 14px; line-height: 1.6; margin: 0;">
            Navigate to "Issuers" in your dashboard and add authorized personnel who will issue degree certificates on your behalf. Each issuer needs to complete onboarding and connect their wallet.
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="color: #d4a853; margin: 0 0 8px 0; font-size: 16px;">Step 3: Add Authorized Revokers</h4>
          <p style="color: #f0f2f8; font-size: 14px; line-height: 1.6; margin: 0;">
            Similarly, add authorized revokers who can revoke degrees if needed. Revokers must also complete onboarding and wallet connection.
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="color: #d4a853; margin: 0 0 8px 0; font-size: 16px;">Step 4: Issue Your First Degree</h4>
          <p style="color: #f0f2f8; font-size: 14px; line-height: 1.6; margin: 0;">
            Once issuers are set up, they can start issuing blockchain-verified degree certificates. Each degree is minted as an NFT on Base blockchain and is permanently verifiable.
          </p>
        </div>

        <div style="margin-bottom: 0;">
          <h4 style="color: #d4a853; margin: 0 0 8px 0; font-size: 16px;">Step 5: Monitor & Manage</h4>
          <p style="color: #f0f2f8; font-size: 14px; line-height: 1.6; margin: 0;">
            Use your dashboard to track all issued degrees, view analytics, manage your team, and access verification tools.
          </p>
        </div>
      </div>

      <!-- What You Can Do -->
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: #10b981; margin: 0 0 16px 0; font-size: 18px;">✨ What You Can Do Now</h3>
        <ul style="color: #f0f2f8; padding-left: 20px; line-height: 1.8; margin: 0;">
          <li>Issue blockchain-verified degree certificates as NFTs</li>
          <li>Manage authorized issuers, revokers, and verifiers</li>
          <li>Track and verify all issued credentials in real-time</li>
          <li>Access comprehensive analytics and reports</li>
          <li>Revoke degrees if necessary (via authorized revokers)</li>
          <li>View transaction history on Base blockchain explorer</li>
        </ul>
      </div>

      <!-- Important Notes -->
      <div style="background: #1a1f36; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #d4a853;">
        <h4 style="color: #d4a853; margin: 0 0 12px 0; font-size: 16px;">⚠️ Important Security Notes</h4>
        <ul style="color: #f0f2f8; padding-left: 20px; line-height: 1.8; margin: 0; font-size: 14px;">
          <li>Keep your wallet private key secure and never share it</li>
          <li>Your wallet address is now permanently linked to ${universityName} on the blockchain</li>
          <li>All blockchain transactions require MetaMask wallet connection</li>
          <li>If you lose access to your wallet, contact support immediately</li>
        </ul>
      </div>

      <!-- Support & Resources -->
      <div style="border-top: 1px solid #3d4a6a; margin-top: 32px; padding-top: 24px;">
        <h4 style="color: #d4a853; margin: 0 0 16px 0; font-size: 16px;">📚 Resources & Support</h4>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <a href="${docsUrl}" style="color: #d4a853; text-decoration: none; font-size: 14px;">📖 Getting Started Guide</a>
          <a href="mailto:${SUPPORT_EMAIL}" style="color: #d4a853; text-decoration: none; font-size: 14px;">💬 Contact Support: ${SUPPORT_EMAIL}</a>
          ${explorerUrl ? `<a href="${explorerUrl}" style="color: #d4a853; text-decoration: none; font-size: 14px;">🔍 View Transaction on BaseScan</a>` : ''}
        </div>
        <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-top: 24px;">
          Welcome to the future of credential verification! 🎓
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error("[EmailService] ❌ Error sending activation email:", error)
      return { success: false, error: error.message }
    }

    console.log(`[EmailService] ✅ Comprehensive activation email sent successfully to ${to}`)
    return { success: true }
  } catch (error) {
    console.error("[EmailService] ❌ Failed to send activation email:", error)
    return { success: false, error: String(error) }
  }
}

// Send issuer onboarding email
export async function sendIssuerOnboardingEmail(params: {
  to: string
  issuerName: string
  universityName: string
  temporaryPassword: string
  onboardingToken: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("[v0] Resend not configured, skipping email")
    return { success: true }
  }

  const { to, issuerName, universityName, temporaryPassword, onboardingToken } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"
  const onboardingUrl = `${baseUrl}/onboarding/issuer/${onboardingToken}`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `You've been added as an Issuer - ${universityName} | BU Blockchain Degree`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f1219; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1f36 0%, #2d3a5c 100%); border-radius: 16px; padding: 40px; border: 1px solid #3d4a6a;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 40px; color: white;">&#10004;</span>
        </div>
        <h1 style="color: #10b981; margin: 0; font-size: 28px;">You're Now an Issuer!</h1>
        <p style="color: #94a3b8; margin-top: 8px;">BU Blockchain Degree Protocol</p>
      </div>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Dear ${issuerName},
      </p>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        <strong>${universityName}</strong> has added you as an authorized <strong>Degree Issuer</strong> on the BU Blockchain Degree Protocol.
        You will be able to issue blockchain-verified degree certificates on behalf of the university.
      </p>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: #d4a853; margin: 0 0 16px 0; font-size: 18px;">Your Login Credentials</h3>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Email:</strong> ${to}</p>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #2d3a5c; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</code></p>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 16px;">
          Please change your password after your first login for security purposes.
        </p>
      </div>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #10b981;">
        <h3 style="color: #10b981; margin: 0 0 16px 0; font-size: 18px;">Complete Your Setup</h3>
        <ol style="color: #f0f2f8; padding-left: 20px; line-height: 1.8;">
          <li>Review and sign the Confidentiality Agreement</li>
          <li>Create a MetaMask wallet (we'll guide you)</li>
          <li>Submit your wallet address to activate your account</li>
          <li>Start issuing blockchain-verified degrees!</li>
        </ol>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${onboardingUrl}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Complete Onboarding
          </a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #3d4a6a; margin-top: 32px; padding-top: 24px;">
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
          Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #d4a853;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error("[v0] Error sending issuer onboarding email:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Failed to send issuer onboarding email:", error)
    return { success: false, error: String(error) }
  }
}

// Resend onboarding reminder (login link; no password in email – use Forgot Password if needed)
export async function sendIssuerOnboardingReminderEmail(params: {
  to: string
  issuerName: string
  universityName: string
  loginUrl: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: true }
  const { to, issuerName, universityName, loginUrl } = params
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Reminder: Complete your issuer onboarding – ${universityName} | BU Blockchain Degree`,
      html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f1219;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#1a1f36 0%,#2d3a5c 100%);border-radius:16px;padding:40px;border:1px solid #3d4a6a;">
    <h1 style="color:#d4a853;margin:0 0 8px 0;font-size:24px;">Reminder: Complete your issuer setup</h1>
    <p style="color:#94a3b8;margin:0 0 24px 0;">${universityName} has requested you complete your onboarding.</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Dear ${issuerName},</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Please sign in and complete: (1) Sign the NDA/agreement, (2) Submit your wallet address. Use the password you received previously, or "Forgot password?" on the login page.</p>
    <p style="text-align:center;margin:24px 0;"><a href="${loginUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Sign in & complete onboarding</a></p>
    <p style="color:#94a3b8;font-size:14px;text-align:center;">Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#d4a853;">${SUPPORT_EMAIL}</a></p>
  </div>
</div>
</body></html>
      `,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// NDA/agreement reminder – link to onboarding so they can sign
export async function sendIssuerNdaReminderEmail(params: {
  to: string
  issuerName: string
  universityName: string
  onboardingUrl: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: true }
  const { to, issuerName, universityName, onboardingUrl } = params
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Action required: Sign NDA & Agreement – ${universityName} | BU Blockchain Degree`,
      html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f1219;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#1a1f36 0%,#2d3a5c 100%);border-radius:16px;padding:40px;border:1px solid #3d4a6a;">
    <h1 style="color:#d4a853;margin:0 0 8px 0;font-size:24px;">Sign NDA & Confidentiality Agreement</h1>
    <p style="color:#94a3b8;margin:0 0 24px 0;">${universityName} requests you sign the agreement to continue as an issuer.</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Dear ${issuerName},</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Please review and sign the NDA and confidentiality agreement. This is required before you can submit your wallet and be activated on the blockchain.</p>
    <p style="text-align:center;margin:24px 0;"><a href="${onboardingUrl}" style="display:inline-block;background:#d4a853;color:#1a1f36;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Open agreement & sign</a></p>
    <p style="color:#94a3b8;font-size:14px;text-align:center;">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#d4a853;">${SUPPORT_EMAIL}</a></p>
  </div>
</div>
</body></html>
      `,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// Request wallet – ask issuer to submit wallet address
export async function sendIssuerWalletRequestEmail(params: {
  to: string
  issuerName: string
  universityName: string
  onboardingUrl: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: true }
  const { to, issuerName, universityName, onboardingUrl } = params
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Action required: Submit your wallet – ${universityName} | BU Blockchain Degree`,
      html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f1219;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#1a1f36 0%,#2d3a5c 100%);border-radius:16px;padding:40px;border:1px solid #3d4a6a;">
    <h1 style="color:#d4a853;margin:0 0 8px 0;font-size:24px;">Submit your wallet address</h1>
    <p style="color:#94a3b8;margin:0 0 24px 0;">${universityName} needs your wallet to activate you on the blockchain.</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Dear ${issuerName},</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Please sign in and submit your MetaMask (or compatible) wallet address. Once submitted and verified, your admin can activate you on-chain so you can issue degrees.</p>
    <p style="text-align:center;margin:24px 0;"><a href="${onboardingUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Sign in & add wallet</a></p>
    <p style="color:#94a3b8;font-size:14px;text-align:center;">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#d4a853;">${SUPPORT_EMAIL}</a></p>
  </div>
</div>
</body></html>
      `,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// Send revoker onboarding email
export async function sendRevokerOnboardingEmail(params: {
  to: string
  revokerName: string
  universityName: string
  temporaryPassword: string
  onboardingToken: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("[v0] Resend not configured, skipping email")
    return { success: true }
  }

  const { to, revokerName, universityName, temporaryPassword, onboardingToken } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"
  const onboardingUrl = `${baseUrl}/onboarding/revoker/${onboardingToken}`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `You've been added as a Revoker - ${universityName} | BU Blockchain Degree`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f1219; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1f36 0%, #2d3a5c 100%); border-radius: 16px; padding: 40px; border: 1px solid #3d4a6a;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 40px; color: white;">&#128274;</span>
        </div>
        <h1 style="color: #f97316; margin: 0; font-size: 28px;">You're Now a Revoker!</h1>
        <p style="color: #94a3b8; margin-top: 8px;">BU Blockchain Degree Protocol</p>
      </div>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Dear ${revokerName},
      </p>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        <strong>${universityName}</strong> has added you as an authorized <strong>Degree Revoker</strong> on the BU Blockchain Degree Protocol.
        You will be able to revoke blockchain-verified degree certificates when necessary.
      </p>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: #d4a853; margin: 0 0 16px 0; font-size: 18px;">Your Login Credentials</h3>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Email:</strong> ${to}</p>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #2d3a5c; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</code></p>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 16px;">
          Please change your password after your first login for security purposes.
        </p>
      </div>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #f97316;">
        <h3 style="color: #f97316; margin: 0 0 16px 0; font-size: 18px;">Complete Your Setup</h3>
        <ol style="color: #f0f2f8; padding-left: 20px; line-height: 1.8;">
          <li>Review and sign the Confidentiality Agreement</li>
          <li>Create a MetaMask wallet (we'll guide you)</li>
          <li>Submit your wallet address to activate your account</li>
          <li>Start managing degree revocations!</li>
        </ol>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${onboardingUrl}" style="display: inline-block; background: #f97316; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Complete Onboarding
          </a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #3d4a6a; margin-top: 32px; padding-top: 24px;">
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
          Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #d4a853;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error("[v0] Error sending revoker onboarding email:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Failed to send revoker onboarding email:", error)
    return { success: false, error: String(error) }
  }
}

// Resend revoker onboarding reminder (login link only)
export async function sendRevokerOnboardingReminderEmail(params: {
  to: string
  revokerName: string
  universityName: string
  loginUrl: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: true }
  const { to, revokerName, universityName, loginUrl } = params
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Reminder: Complete your revoker onboarding – ${universityName} | BU Blockchain Degree`,
      html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f1219;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#1a1f36 0%,#2d3a5c 100%);border-radius:16px;padding:40px;border:1px solid #3d4a6a;">
    <h1 style="color:#f97316;margin:0 0 8px 0;font-size:24px;">Reminder: Complete your revoker setup</h1>
    <p style="color:#94a3b8;margin:0 0 24px 0;">${universityName} has requested you complete your onboarding.</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Dear ${revokerName},</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Please sign in and complete: (1) Sign the NDA/agreement, (2) Submit your wallet address. Use the password you received previously, or "Forgot password?" on the login page.</p>
    <p style="text-align:center;margin:24px 0;"><a href="${loginUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Sign in & complete onboarding</a></p>
    <p style="color:#94a3b8;font-size:14px;text-align:center;">Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#d4a853;">${SUPPORT_EMAIL}</a></p>
  </div>
</div>
</body></html>
      `,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// Send verifier onboarding email
export async function sendVerifierOnboardingEmail(params: {
  to: string
  verifierName: string
  universityName: string
  temporaryPassword: string
  onboardingToken: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("[EmailService] Verifier onboarding: Resend not configured. RESEND_API_KEY is missing.")
    return { success: false, error: "Email service not configured" }
  }

  const to = String(params.to).trim().toLowerCase()
  const { verifierName, universityName, temporaryPassword, onboardingToken } = params
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io").replace(/\/$/, "")
  const onboardingUrl = `${baseUrl}/onboarding/verifier/${onboardingToken}`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `You've been added as a Verifier - ${universityName} | BU Blockchain Degree`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f1219; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1f36 0%, #2d3a5c 100%); border-radius: 16px; padding: 40px; border: 1px solid #3d4a6a;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 40px; color: white;">✓</span>
        </div>
        <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">You're Now a Verifier!</h1>
        <p style="color: #94a3b8; margin-top: 8px;">BU Blockchain Degree Protocol</p>
      </div>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Dear ${verifierName},
      </p>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        <strong>${universityName}</strong> has added you as an authorized <strong>Degree Verifier</strong> on the BU Blockchain Degree Protocol.
        You will be able to approve degree issuance and revocation requests on behalf of the university.
      </p>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: #d4a853; margin: 0 0 16px 0; font-size: 18px;">Your Login Credentials</h3>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Email:</strong> ${to}</p>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #2d3a5c; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</code></p>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 16px;">
          Please change your password after your first login for security purposes.
        </p>
      </div>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3b82f6;">
        <h3 style="color: #3b82f6; margin: 0 0 16px 0; font-size: 18px;">Complete Your Setup</h3>
        <ol style="color: #f0f2f8; padding-left: 20px; line-height: 1.8;">
          <li>Review and sign the Confidentiality Agreement</li>
          <li>Create a MetaMask wallet (we'll guide you)</li>
          <li>Submit your wallet address to activate your account</li>
          <li>Start verifying degree requests!</li>
        </ol>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${onboardingUrl}" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Complete Onboarding
          </a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #3d4a6a; margin-top: 32px; padding-top: 24px;">
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
          Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #d4a853;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error("[v0] Error sending verifier onboarding email:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Failed to send verifier onboarding email:", error)
    return { success: false, error: String(error) }
  }
}

// Send verifier onboarding reminder (resend – login link only)
export async function sendVerifierOnboardingReminderEmail(params: {
  to: string
  verifierName: string
  universityName: string
  loginUrl: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("[EmailService] Verifier reminder: Resend not configured.")
    return { success: false, error: "Email service not configured" }
  }
  const { to, verifierName, universityName, loginUrl } = params
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Reminder: Complete your verifier onboarding – ${universityName} | BU Blockchain Degree`,
      html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f1219;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#1a1f36 0%,#2d3a5c 100%);border-radius:16px;padding:40px;border:1px solid #3d4a6a;">
    <h1 style="color:#8b5cf6;margin:0 0 8px 0;font-size:24px;">Reminder: Complete your verifier setup</h1>
    <p style="color:#94a3b8;margin:0 0 24px 0;">${universityName} has requested you complete your onboarding.</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Dear ${verifierName},</p>
    <p style="color:#f0f2f8;font-size:16px;line-height:1.6;">Please sign in and complete: (1) Sign the NDA/agreement, (2) Submit your wallet address. Use the password you received previously, or "Forgot password?" on the login page.</p>
    <p style="text-align:center;margin:24px 0;"><a href="${loginUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Sign in & complete onboarding</a></p>
    <p style="color:#94a3b8;font-size:14px;text-align:center;">Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#d4a853;">${SUPPORT_EMAIL}</a></p>
  </div>
</div>
</body></html>
      `,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    console.error("[EmailService] Failed to send verifier reminder:", error)
    return { success: false, error: String(error) }
  }
}

// Send notification to university admin when issuer/revoker submits wallet
export async function sendWalletSubmittedNotification(params: {
  to: string
  adminName: string
  universityName: string
  personName: string
  personEmail: string
  personRole: "issuer" | "revoker"
  walletAddress: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("[v0] Resend not configured, skipping email")
    return { success: true }
  }

  const { to, adminName, universityName, personName, personEmail, personRole, walletAddress } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"
  const dashboardUrl = `${baseUrl}/university/${personRole}s`
  const roleColor = personRole === "issuer" ? "#10b981" : "#f97316"
  const roleLabel = personRole === "issuer" ? "Issuer" : "Revoker"

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Action Required: ${personName} submitted wallet address - ${universityName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f1219; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1f36 0%, #2d3a5c 100%); border-radius: 16px; padding: 40px; border: 1px solid ${roleColor};">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #d4a853; margin: 0; font-size: 28px;">Action Required</h1>
        <p style="color: #94a3b8; margin-top: 8px;">New ${roleLabel} Wallet Submitted</p>
      </div>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Dear ${adminName},
      </p>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        <strong>${personName}</strong> has completed their onboarding and submitted their wallet address.
        Please review and add them to the blockchain to activate their ${personRole} permissions.
      </p>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: ${roleColor}; margin: 0 0 16px 0; font-size: 18px;">${roleLabel} Details</h3>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Name:</strong> ${personName}</p>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Email:</strong> ${personEmail}</p>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Role:</strong> ${roleLabel}</p>
        <p style="color: #f0f2f8; margin: 8px 0;"><strong>Wallet Address:</strong></p>
        <code style="background: #2d3a5c; padding: 8px 12px; border-radius: 4px; display: block; word-break: break-all; color: #f0f2f8;">${walletAddress}</code>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: ${roleColor}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Add to Blockchain
        </a>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
        Go to your dashboard to add this wallet address to the blockchain. This requires a transaction signed by your university admin wallet.
      </p>
      
      <div style="border-top: 1px solid #3d4a6a; margin-top: 32px; padding-top: 24px;">
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
          Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #d4a853;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error("[v0] Error sending wallet notification email:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Failed to send wallet notification email:", error)
    return { success: false, error: String(error) }
  }
}

// Send congratulation email when issuer/revoker/verifier is activated on-chain
export async function sendRoleActivationEmail(params: {
  to: string
  roleName: string
  universityName: string
  personName: string
  walletAddress: string
  role: "issuer" | "revoker" | "verifier"
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("[v0] Resend not configured, skipping role activation email")
    return { success: true }
  }

  const { to, roleName, universityName, personName, walletAddress, role } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"
  const loginUrls: Record<string, string> = {
    issuer: `${baseUrl}/issuer/login`,
    revoker: `${baseUrl}/revoker/login`,
    verifier: `${baseUrl}/verifier/login`,
  }
  const loginUrl = loginUrls[role] || `${baseUrl}/login`
  const roleLabels: Record<string, string> = {
    issuer: "Degree Issuer",
    revoker: "Degree Revoker",
    verifier: "Degree Verifier",
  }
  const roleLabel = roleLabels[role] || role
  const roleColors: Record<string, string> = {
    issuer: "#10b981",
    revoker: "#f97316",
    verifier: "#8b5cf6",
  }
  const roleColor = roleColors[role] || "#d4a853"

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Congratulations! Your ${roleLabel} account is active - ${universityName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f1219; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1f36 0%, #2d3a5c 100%); border-radius: 16px; padding: 40px; border: 1px solid ${roleColor};">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, ${roleColor} 0%, ${roleColor}99 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 40px; color: white;">&#10004;</span>
        </div>
        <h1 style="color: ${roleColor}; margin: 0; font-size: 28px;">Account Activated!</h1>
        <p style="color: #94a3b8; margin-top: 8px;">You are now an active ${roleLabel}</p>
      </div>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Dear ${personName},
      </p>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Your ${roleLabel} account for <strong>${universityName}</strong> has been activated on the blockchain.
        You can now sign in and start using the BU Blockchain Degree Protocol.
      </p>
      
      <div style="background: #0f1219; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3d4a6a;">
        <h3 style="color: ${roleColor}; margin: 0 0 16px 0; font-size: 18px;">Your Wallet</h3>
        <code style="background: #2d3a5c; padding: 8px 12px; border-radius: 4px; display: block; word-break: break-all; color: #f0f2f8;">${walletAddress}</code>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 12px;">
          Use this wallet with MetaMask to sign in and perform on-chain actions.
        </p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: ${roleColor}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Sign in and get started
        </a>
      </div>
      
      <div style="border-top: 1px solid #3d4a6a; margin-top: 32px; padding-top: 24px;">
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
          Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #d4a853;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error("[EmailService] Error sending role activation email:", error)
      return { success: false, error: error.message }
    }
    console.log(`[EmailService] Role activation email sent to ${to} (${role})`)
    return { success: true }
  } catch (err) {
    console.error("[EmailService] Failed to send role activation email:", err)
    return { success: false, error: String(err) }
  }
}

// Send trial expiration warning email
export async function sendTrialExpirationWarningEmail(params: {
  to: string
  universityName: string
  adminName: string
  daysRemaining: number
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: true }
  }

  const { to, universityName, adminName, daysRemaining } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bubd.io"

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Trial Expiring in ${daysRemaining} Days - ${universityName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f1219; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1f36 0%, #2d3a5c 100%); border-radius: 16px; padding: 40px; border: 1px solid #d4a853;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #d4a853; margin: 0; font-size: 28px;">Trial Expiring Soon</h1>
        <p style="color: #f0f2f8; margin-top: 8px; font-size: 18px;">${daysRemaining} days remaining</p>
      </div>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Dear ${adminName},
      </p>
      
      <p style="color: #f0f2f8; font-size: 16px; line-height: 1.6;">
        Your trial period for <strong>${universityName}</strong> on the BU Blockchain Degree Protocol will expire in ${daysRemaining} days.
        To continue using our platform and maintain access to your issued credentials, please subscribe to one of our plans.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${baseUrl}/subscribe" style="display: inline-block; background: #d4a853; color: #1a1f36; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          View Subscription Plans
        </a>
      </div>
      
      <div style="border-top: 1px solid #3d4a6a; margin-top: 32px; padding-top: 24px;">
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
          Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #d4a853;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
