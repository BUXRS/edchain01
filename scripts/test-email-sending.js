#!/usr/bin/env node

/**
 * Test Email Sending - Direct test of Resend API
 */

const { Resend } = require('resend')
const fs = require('fs')

// Load .env.local
try {
  const envFile = fs.readFileSync('.env.local', 'utf8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch (err) {
  console.warn('⚠️  Could not load .env.local')
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "BU Blockchain Degree <onboarding@resend.dev>"
const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com"

if (!RESEND_API_KEY) {
  console.error('❌ Error: RESEND_API_KEY is not set in .env.local')
  process.exit(1)
}

const resend = new Resend(RESEND_API_KEY)

async function testEmail() {
  console.log('🧪 Testing Email Sending...\n')
  console.log(`📧 From: ${FROM_EMAIL}`)
  console.log(`📧 To: ${TEST_EMAIL}`)
  console.log(`🔑 API Key: ${RESEND_API_KEY.substring(0, 10)}...\n`)
  
  try {
    console.log('📤 Sending test email...\n')
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TEST_EMAIL],
      subject: "Test Email - BU Blockchain Degree",
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify Resend configuration.</p>
        <p>If you receive this, email sending is working correctly.</p>
      `,
    })
    
    console.log('📥 Resend API Response:')
    console.log(JSON.stringify(result, null, 2))
    console.log('')
    
    if (result.error) {
      console.error('❌ EMAIL SEND FAILED!')
      console.error('   Error:', result.error.message || result.error)
      console.error('   Code:', result.error.name || 'unknown')
      
      if (result.error.message?.includes('domain')) {
        console.error('\n💡 HINT: The FROM_EMAIL domain might not be verified in Resend.')
        console.error('   Options:')
        console.error('   1. Verify the domain in Resend dashboard')
        console.error('   2. Use Resend test domain: onboarding@resend.dev')
        console.error('   3. Update RESEND_FROM_EMAIL in .env.local')
      }
      
      if (result.error.message?.includes('API key')) {
        console.error('\n💡 HINT: The RESEND_API_KEY might be invalid.')
        console.error('   Check your Resend dashboard for the correct API key.')
      }
      
      process.exit(1)
    }
    
    if (result.data?.id) {
      console.log('✅ EMAIL SENT SUCCESSFULLY!')
      console.log(`   Email ID: ${result.data.id}`)
      console.log(`   Check inbox at: ${TEST_EMAIL}`)
      console.log('\n💡 Note: If email not received, check:')
      console.log('   1. Spam/junk folder')
      console.log('   2. Resend dashboard for delivery status')
      console.log('   3. Domain verification status')
    } else {
      console.warn('⚠️  No email ID returned, but no error either')
      console.warn('   Response:', result)
    }
    
  } catch (error) {
    console.error('❌ Exception sending email:', error.message)
    console.error('   Full error:', error)
    process.exit(1)
  }
}

testEmail()
