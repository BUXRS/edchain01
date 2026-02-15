#!/usr/bin/env node

const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

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
  console.log('🚀 Creating university_roles view...\n')
  
  try {
    const migrationPath = path.join(__dirname, '026-create-university-roles-view.sql')
    const content = fs.readFileSync(migrationPath, 'utf8')
    await sql.unsafe(content)
    
    console.log('✅ Migration completed!\n')
    
    // Verify the view exists
    const viewExists = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'university_roles'
      )
    `
    
    if (viewExists[0].exists) {
      console.log('✅ Verified: university_roles view created successfully')
      
      // Test the view
      const testQuery = await sql`
        SELECT 
          university_id,
          role_type,
          COUNT(*) as count
        FROM university_roles
        GROUP BY university_id, role_type
        LIMIT 5
      `
      
      if (testQuery.length > 0) {
        console.log(`\n📊 Sample data from view (${testQuery.length} rows):`)
        testQuery.forEach(row => {
          console.log(`   University ${row.university_id}: ${row.count} ${row.role_type}(s)`)
        })
      } else {
        console.log('\n📊 View is empty (no roles exist yet)')
      }
    } else {
      console.warn('⚠️  View was not created')
    }
    
  } catch (err) {
    console.error(`❌ Error: ${err.message}\n`)
    if (err.message.includes('does not exist')) {
      console.error('   Make sure issuers, revokers, and verifiers tables exist')
    }
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
