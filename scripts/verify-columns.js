/**
 * Verify required columns exist
 */

const postgres = require('postgres')

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:BU%40Blck2025@localhost:5432/bubd"

const sql = postgres(DATABASE_URL)

async function verify() {
  try {
    const cols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'universities' 
      AND column_name IN ('name', 'name_en', 'name_ar', 'admin_wallet', 'wallet_address')
      ORDER BY column_name
    `
    
    console.log('✅ Required columns in universities table:')
    cols.forEach(c => console.log(`  - ${c.column_name}`))
    
    const required = ['name', 'name_en', 'name_ar', 'admin_wallet', 'wallet_address']
    const found = cols.map(c => c.column_name)
    const missing = required.filter(r => !found.includes(r))
    
    if (missing.length > 0) {
      console.log('\n❌ Missing columns:')
      missing.forEach(m => console.log(`  - ${m}`))
    } else {
      console.log('\n✅ All required columns exist!')
    }
    
    await sql.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    await sql.end()
    process.exit(1)
  }
}

verify()
