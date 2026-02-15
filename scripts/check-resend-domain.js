#!/usr/bin/env node

/**
 * Check Resend Domain Verification Status
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
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

if (!RESEND_API_KEY) {
  console.error('❌ Error: RESEND_API_KEY is not set')
  process.exit(1)
}

const resend = new Resend(RESEND_API_KEY)

async function checkDomain() {
  console.log('🔍 Checking Resend Domain Status...\n')
  console.log(`📧 FROM_EMAIL: ${FROM_EMAIL}\n`)
  
  // Extract domain from email
  const domainMatch = FROM_EMAIL.match(/@([^\s>]+)/)
  const domain = domainMatch ? domainMatch[1] : null
  
  if (!domain) {
    console.error('❌ Could not extract domain from FROM_EMAIL')
    process.exit(1)
  }
  
  console.log(`🌐 Domain: ${domain}\n`)
  
  if (domain === 'resend.dev') {
    console.log('✅ Using Resend test domain - no verification needed')
    console.log('   Emails will be sent but may go to spam')
    console.log('   For production, verify your own domain in Resend dashboard\n')
    return
  }
  
  try {
    console.log('📡 Checking domain verification status...\n')
    
    // Try to list domains (this will show verification status)
    const domains = await resend.domains.list()
    
    console.log('📊 Domains in Resend account:')
    if (domains.data && domains.data.length > 0) {
      domains.data.forEach((d) => {
        console.log(`   - ${d.name}`)
        console.log(`     Status: ${d.status || 'unknown'}`)
        console.log(`     Verified: ${d.verified || false}`)
        console.log('')
      })
      
      const ourDomain = domains.data.find((d) => d.name === domain)
      if (ourDomain) {
        if (ourDomain.verified) {
          console.log(`✅ Domain ${domain} is verified!`)
        } else {
          console.log(`⚠️  Domain ${domain} is NOT verified!`)
          console.log('   Emails may be rejected or go to spam')
          console.log('   Verify the domain in Resend dashboard\n')
        }
      } else {
        console.log(`⚠️  Domain ${domain} not found in Resend account`)
        console.log('   You need to add and verify this domain in Resend dashboard')
        console.log('   Or use the test domain: onboarding@resend.dev\n')
      }
    } else {
      console.log('   No domains found in Resend account')
      console.log('   Using unverified domain - emails may be rejected')
      console.log('   Add and verify your domain in Resend dashboard\n')
    }
    
  } catch (error) {
    console.error('❌ Error checking domain:', error.message)
    console.error('   This might mean the domain is not added to Resend')
    console.error('   Or the API key does not have domain access\n')
  }
}

checkDomain()
