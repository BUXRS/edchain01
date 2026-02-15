/**
 * Run migration to add name_en column to universities table
 * 
 * Usage: node scripts/run-name-en-migration.js
 */

const { sql } = require('../lib/db')

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Add name_en column to universities table...')
    
    // Step 1: Add name_en column if it doesn't exist
    console.log('Step 1: Adding name_en column...')
    await sql`
      ALTER TABLE universities
      ADD COLUMN IF NOT EXISTS name_en VARCHAR(255)
    `
    console.log('✅ name_en column added (or already exists)')
    
    // Step 2: Copy existing name values to name_en for existing records
    console.log('Step 2: Copying name values to name_en for existing records...')
    const updateResult = await sql`
      UPDATE universities
      SET name_en = name
      WHERE name_en IS NULL AND name IS NOT NULL
    `
    console.log(`✅ Updated ${updateResult.count || 0} records`)
    
    // Step 3: Verify the column exists
    console.log('Step 3: Verifying column exists...')
    const columns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'universities' AND column_name = 'name_en'
    `
    
    if (columns.length > 0) {
      console.log('✅ Migration completed successfully!')
      console.log('Column details:', columns[0])
    } else {
      console.error('❌ Column was not created. Please check the migration.')
      process.exit(1)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
