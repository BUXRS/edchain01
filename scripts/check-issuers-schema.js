#!/usr/bin/env node

/**
 * Check issuers table schema
 * Usage: node scripts/check-issuers-schema.js
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
  console.warn('⚠️  Could not load .env.local')
}

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

async function checkSchema() {
  try {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'issuers'
      ORDER BY column_name
    `
    
    console.log('📊 Issuers table columns:\n')
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}`)
    })
    
    console.log(`\n✅ Total columns: ${columns.length}`)
    
    // Check for required columns
    const requiredColumns = [
      'id', 'university_id', 'name', 'email', 'password_hash',
      'onboarding_token', 'onboarding_token_expires_at', 'status',
      'pending_wallet_address', 'wallet_submitted_at', 'nda_signed',
      'account_activated', 'account_activated_at', 'wallet_address',
      'blockchain_verified', 'tx_hash', 'created_at', 'updated_at'
    ]
    
    const existingColumns = columns.map(c => c.column_name)
    const missing = requiredColumns.filter(col => !existingColumns.includes(col))
    
    if (missing.length > 0) {
      console.log(`\n⚠️  Missing columns: ${missing.join(', ')}`)
      console.log('   Run migration: scripts/020-enhance-issuer-revoker-verifier-onboarding.sql')
    } else {
      console.log('\n✅ All required columns exist')
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await sql.end()
  }
}

checkSchema()
