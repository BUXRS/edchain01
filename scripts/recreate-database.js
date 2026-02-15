#!/usr/bin/env node

/**
 * Database Recreation Script
 * 
 * This script recreates the entire database schema from scratch using
 * the complete recreation SQL file.
 * 
 * WARNING: This will DROP all existing tables and data!
 * 
 * Usage: node scripts/recreate-database.js
 * 
 * Make sure DATABASE_URL is set in your .env.local file
 */

const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

// Try to load .env.local manually
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
  // .env.local might not exist, that's okay
}

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set in .env.local')
  console.error('\n💡 Please add DATABASE_URL to your .env.local file:')
  console.error('   DATABASE_URL=postgresql://user:password@host:port/database')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
})

async function testConnection() {
  try {
    await sql`SELECT NOW()`
    return true
  } catch (err) {
    console.error('❌ Database connection failed:', err.message)
    console.error('\n💡 Make sure:')
    console.error('   1. DATABASE_URL is correct in .env.local')
    console.error('   2. Your database is accessible')
    console.error('   3. Network/firewall allows connections')
    return false
  }
}

async function recreateDatabase() {
  console.log('🚀 Starting database recreation...\n')
  console.log('⚠️  WARNING: This will DROP all existing tables and data!\n')
  
  const sqlFile = path.join(__dirname, 'REBUILD_DATABASE_COMPLETE.sql')
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ Error: SQL file not found: ${sqlFile}`)
    process.exit(1)
  }

  console.log(`📝 Reading SQL file: ${sqlFile}\n`)
  
  try {
    const content = fs.readFileSync(sqlFile, 'utf8')
    
    console.log('🔄 Executing SQL statements...\n')
    
    // Execute the entire SQL file
    await sql.unsafe(content)
    
    console.log('✅ Database recreation completed successfully!\n')
    
    // Verify tables were created
    console.log('🔍 Verifying database setup...\n')
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    
    const expectedTables = [
      'activity_logs',
      'admin_users',
      'chain_events',
      'degree_request_approvals',
      'degree_requests',
      'degrees',
      'issuers',
      'pending_approvals',
      'pending_transactions',
      'revocation_request_approvals',
      'revocation_requests',
      'revokers',
      'sync_logs',
      'sync_status',
      'university_registrations',
      'universities',
      'verifiers'
    ]

    console.log('📋 Created tables:')
    const createdTables = tables.map(t => t.table_name)
    
    let allCreated = true
    expectedTables.forEach(table => {
      if (createdTables.includes(table)) {
        console.log(`   ✅ ${table}`)
      } else {
        console.log(`   ❌ ${table} (missing)`)
        allCreated = false
      }
    })

    if (allCreated) {
      console.log('\n✅ All 17 tables created successfully!')
      console.log('\n📌 Next steps:')
      console.log('   1. Set up initial admin user (if needed)')
      console.log('   2. Start the app: pnpm dev')
      console.log('   3. Verify sync_status table has initial row')
    } else {
      console.log('\n⚠️  Some tables are missing. Please check the errors above.')
    }
    
  } catch (err) {
    console.error('\n❌ Error recreating database:', err.message)
    console.error('\nStack trace:')
    console.error(err.stack)
    process.exit(1)
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('  DATABASE RECREATION SCRIPT')
  console.log('='.repeat(60))
  console.log()
  
  const connected = await testConnection()
  if (!connected) {
    process.exit(1)
  }

  await recreateDatabase()
  
  // Close connection
  await sql.end()
  console.log('\n✅ Script completed!')
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
