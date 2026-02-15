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

async function runMigration() {
  console.log('🚀 Adding added_by columns...\n')
  
  try {
    const content = fs.readFileSync('scripts/026-add-added-by-columns.sql', 'utf8')
    await sql.unsafe(content)
    
    console.log('✅ Migration completed!\n')
    
    // Verify
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('issuers', 'revokers', 'verifiers')
        AND column_name = 'added_by'
      ORDER BY table_name
    `
    
    if (columns.length === 3) {
      console.log('✅ Verified: added_by column exists in all three tables')
      columns.forEach(col => {
        console.log(`   ✓ ${col.table_name || 'table'}.added_by`)
      })
    } else {
      console.warn(`⚠️  Expected 3 columns, found ${columns.length}`)
    }
    
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('✅ Columns already exist (this is okay)\n')
    } else {
      console.error(`❌ Error: ${err.message}\n`)
      process.exit(1)
    }
  } finally {
    await sql.end()
  }
}

runMigration().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
