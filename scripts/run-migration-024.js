#!/usr/bin/env node

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

const sql = postgres(DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
})

async function runMigration() {
  try {
    console.log('📝 Running migration 024: Create chain_events table...')
    const migration = fs.readFileSync('scripts/024-create-chain-events-table.sql', 'utf8')
    await sql.unsafe(migration)
    console.log('✅ Migration applied successfully!')
    await sql.end()
  } catch (err) {
    console.error('❌ Error:', err.message)
    await sql.end()
    process.exit(1)
  }
}

runMigration()
