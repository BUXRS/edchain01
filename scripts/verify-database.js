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

async function verify() {
  try {
    // Check sync_status
    const syncStatus = await sql`SELECT * FROM sync_status`
    console.log('✅ Sync status table:')
    console.log(JSON.stringify(syncStatus[0], null, 2))
    
    // Count tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    console.log(`\n✅ Total tables: ${tables.length}`)
    
    await sql.end()
  } catch (err) {
    console.error('❌ Error:', err.message)
    await sql.end()
    process.exit(1)
  }
}

verify()
