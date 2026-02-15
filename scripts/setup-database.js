#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script runs all SQL migration files to set up the database schema.
 * 
 * Usage: node scripts/setup-database.js
 * 
 * Make sure DATABASE_URL is set in your .env.local file
 */

const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

// Try to load .env.local manually (simple approach without dotenv dependency)
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
  process.exit(1)
}

const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

const migrationFiles = [
  '001-create-schema.sql',
  '002-add-missing-fields.sql',
  'add-onboarding-fields.sql'
]

async function runMigrations() {
  console.log('🚀 Starting database setup...\n')
  console.log(`📊 Database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'Unknown'}\n`)

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file)
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} (file not found)`)
      continue
    }

    console.log(`📝 Running ${file}...`)
    
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      
      // Split by semicolon and filter out empty statements
      const statements = content
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      let successCount = 0
      let errorCount = 0

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await sql.unsafe(statement + ';')
            successCount++
          } catch (err) {
            // Ignore "already exists" errors (IF NOT EXISTS)
            if (err.message.includes('already exists') || 
                err.message.includes('duplicate') ||
                err.message.includes('IF NOT EXISTS')) {
              // This is expected, continue
              successCount++
            } else {
              console.error(`   ⚠️  Warning: ${err.message.split('\n')[0]}`)
              errorCount++
            }
          }
        }
      }

      if (errorCount === 0) {
        console.log(`   ✅ ${file} completed successfully\n`)
      } else {
        console.log(`   ⚠️  ${file} completed with ${errorCount} warnings\n`)
      }
    } catch (err) {
      console.error(`   ❌ Error running ${file}: ${err.message}\n`)
    }
  }

  // Verify tables were created
  console.log('🔍 Verifying database setup...\n')
  
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    
    const expectedTables = [
      'admin_users',
      'activity_logs',
      'degrees',
      'issuers',
      'pending_approvals',
      'revokers',
      'universities',
      'university_registrations'
    ]

    console.log('📋 Created tables:')
    const createdTables = tables.map(t => t.table_name)
    
    expectedTables.forEach(table => {
      if (createdTables.includes(table)) {
        console.log(`   ✅ ${table}`)
      } else {
        console.log(`   ❌ ${table} (missing)`)
      }
    })

    console.log('\n✅ Database setup complete!')
    console.log('\n📌 Next steps:')
    console.log('   1. Create an admin account: curl http://localhost:3000/api/auth/setup')
    console.log('   2. Start the app: pnpm dev')
    console.log('   3. Login at: http://localhost:3000/admin/login')
    
  } catch (err) {
    console.error('❌ Error verifying setup:', err.message)
  }
}

// Test database connection first
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

async function main() {
  const connected = await testConnection()
  if (!connected) {
    process.exit(1)
  }

  await runMigrations()
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
