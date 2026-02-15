#!/usr/bin/env node

/**
 * Trigger Full Blockchain Sync Script
 * 
 * This script triggers a comprehensive full sync of all blockchain data to the database.
 * Use this to manually populate the database with all blockchain data.
 */

const postgres = require('postgres')
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
  console.error('❌ Error reading .env.local:', err.message)
  process.exit(1)
}

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set')
  process.exit(1)
}

async function triggerFullSync() {
  console.log('='.repeat(60))
  console.log('  TRIGGERING FULL BLOCKCHAIN SYNC')
  console.log('='.repeat(60))
  console.log()
  console.log('📡 Calling comprehensive full sync API...')
  console.log()

  try {
    // Call the API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'comprehensive_full_sync'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API returned ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    
    console.log('✅ Full sync triggered successfully!')
    console.log()
    console.log('📊 Results:')
    console.log(JSON.stringify(result, null, 2))
    
  } catch (err) {
    console.error('❌ Error triggering full sync:', err.message)
    console.error()
    console.error('💡 Make sure:')
    console.error('   1. The Next.js dev server is running (npm run dev)')
    console.error('   2. The API endpoint /api/sync is accessible')
    console.error('   3. DATABASE_URL is correctly configured')
    process.exit(1)
  }
}

triggerFullSync()
