#!/usr/bin/env node

const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

// Load .env.local
try {
  const envPath = path.join(__dirname, '..', '.env.local')
  const envFile = fs.readFileSync(envPath, 'utf8')
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
  console.log('🚀 Running migration 028: fix department column (departr → department)\n')

  try {
    const migrationPath = path.join(__dirname, '028-fix-department-column.sql')
    const content = fs.readFileSync(migrationPath, 'utf8')
    await sql.unsafe(content)

    console.log('✅ Migration completed!\n')

    // Verify department column exists on issuers, revokers, verifiers
    for (const table of ['issuers', 'revokers', 'verifiers']) {
      const cols = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table}
        AND column_name IN ('department', 'departr')
      `
      const hasDept = cols.some(c => c.column_name === 'department')
      const hasDepartr = cols.some(c => c.column_name === 'departr')
      if (hasDept && !hasDepartr) {
        console.log(`   ✅ ${table}: has "department" column`)
      } else if (hasDepartr) {
        console.log(`   ⚠️  ${table}: still has "departr" (rename may have been skipped)`)
      } else {
        console.log(`   ✅ ${table}: "department" column present`)
      }
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}\n`)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
