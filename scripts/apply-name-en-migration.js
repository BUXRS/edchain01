/**
 * Apply migration to add name_en column
 * Run: node scripts/apply-name-en-migration.js
 * Or: DATABASE_URL="postgresql://..." node scripts/apply-name-en-migration.js
 */

const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

// Try to read from .env.local or .env files manually
let DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  try {
    const envLocal = fs.readFileSync('.env.local', 'utf8')
    const match = envLocal.match(/DATABASE_URL=(.+)/)
    if (match) DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, '')
  } catch (e) {}
}

if (!DATABASE_URL) {
  try {
    const env = fs.readFileSync('.env', 'utf8')
    const match = env.match(/DATABASE_URL=(.+)/)
    if (match) DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, '')
  } catch (e) {}
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set. Please set it as an environment variable or in .env file')
  console.error('   Example: DATABASE_URL="postgresql://postgres:password@localhost:5432/dbname" node scripts/apply-name-en-migration.js')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

async function applyMigration() {
  try {
    console.log('🔧 Applying migration: Add name_en column to universities table...\n')

    // Read migration file
    const migrationPath = path.join(__dirname, '025-add-name-en-column.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Apply migration
    await sql.unsafe(migrationSQL)
    console.log('✅ Migration applied successfully\n')

    // Verify columns exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'universities' 
      AND column_name IN ('name', 'name_en', 'name_ar')
      ORDER BY column_name
    `
    
    console.log('📋 University name columns:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name}`)
    })

    await sql.end()
    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('❌ Error applying migration:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
    await sql.end()
    process.exit(1)
  }
}

applyMigration()
