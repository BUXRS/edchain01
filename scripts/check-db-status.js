/**
 * Quick Database Status Check
 * 
 * Run: node scripts/check-db-status.js
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const postgres = require('postgres')

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in environment')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

async function checkDatabase() {
  try {
    console.log('🔍 Checking database status...\n')

    // Check connection
    const now = await sql`SELECT NOW()`
    console.log('✅ Database connected:', now[0].now)

    // Check all universities
    const allUnis = await sql`SELECT COUNT(*) as count FROM universities`
    console.log(`📊 Total universities in DB: ${allUnis[0].count}`)

    // Check verified universities
    const verifiedUnis = await sql`
      SELECT COUNT(*) as count 
      FROM universities 
      WHERE blockchain_verified = true
    `
    console.log(`✅ Verified universities: ${verifiedUnis[0].count}`)

    // Check universities with blockchain_id
    const blockchainUnis = await sql`
      SELECT COUNT(*) as count 
      FROM universities 
      WHERE blockchain_id IS NOT NULL
    `
    console.log(`🔗 Universities with blockchain_id: ${blockchainUnis[0].count}`)

    // List all universities
    const universities = await sql`
      SELECT id, blockchain_id, name, name_en, blockchain_verified, created_at
      FROM universities
      ORDER BY created_at DESC
      LIMIT 10
    `
    
    if (universities.length > 0) {
      console.log('\n📋 Recent universities:')
      universities.forEach(uni => {
        console.log(`  - ID: ${uni.id}, blockchain_id: ${uni.blockchain_id || 'NULL'}, name: ${uni.name || uni.name_en || 'N/A'}, verified: ${uni.blockchain_verified}`)
      })
    } else {
      console.log('\n⚠️ No universities found in database')
    }

    // Check sync_status
    const syncStatus = await sql`SELECT * FROM sync_status WHERE id = 1`
    if (syncStatus.length > 0) {
      console.log('\n🔄 Sync Status:')
      console.log(`  - Last synced block: ${syncStatus[0].last_synced_block || 'NULL'}`)
      console.log(`  - Finalized block: ${syncStatus[0].finalized_block || 'NULL'}`)
      console.log(`  - Sync mode: ${syncStatus[0].sync_mode || 'NULL'}`)
      console.log(`  - Updated at: ${syncStatus[0].updated_at || 'NULL'}`)
    } else {
      console.log('\n⚠️ No sync_status record found')
    }

    // Check chain_events
    const events = await sql`SELECT COUNT(*) as count FROM chain_events`
    console.log(`\n📦 Chain events: ${events[0].count}`)

    await sql.end()
    console.log('\n✅ Check complete')
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
    await sql.end()
    process.exit(1)
  }
}

checkDatabase()
