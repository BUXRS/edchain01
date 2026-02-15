#!/usr/bin/env node

/**
 * Debug Issuer Registration - Test the actual API logic
 */

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

async function debug() {
  console.log('🔍 DEBUGGING ISSUER REGISTRATION\n')
  console.log('=' .repeat(60) + '\n')
  
  try {
    // Step 1: Check all universities in database
    console.log('📊 STEP 1: Checking all universities in database...\n')
    const allUniversities = await sql`
      SELECT 
        id, 
        blockchain_id, 
        name, 
        name_ar, 
        wallet_address, 
        status, 
        is_active,
        admin_email,
        admin_name
      FROM universities
      ORDER BY id
    `
    
    console.log(`Found ${allUniversities.length} universities:\n`)
    allUniversities.forEach(uni => {
      console.log(`  ID: ${uni.id}`)
      console.log(`  Blockchain ID: ${uni.blockchain_id || 'NULL'}`)
      console.log(`  Name: ${uni.name || 'NULL'}`)
      console.log(`  Wallet: ${uni.wallet_address || 'NULL'}`)
      console.log(`  Status: ${uni.status || 'NULL'}`)
      console.log(`  Active: ${uni.is_active || false}`)
      console.log(`  Admin Email: ${uni.admin_email || 'NULL'}`)
      console.log('  ---')
    })
    
    if (allUniversities.length === 0) {
      console.log('\n❌ NO UNIVERSITIES FOUND IN DATABASE!')
      console.log('   This is the problem - you need to create/activate a university first.\n')
      await sql.end()
      process.exit(1)
    }
    
    // Step 2: Test university lookup with different IDs
    console.log('\n📊 STEP 2: Testing university lookup queries...\n')
    
    const testIds = [2, 4] // Common IDs from the UI
    for (const testId of testIds) {
      console.log(`Testing lookup for ID: ${testId}`)
      
      // Try by database ID
      const byId = await sql`
        SELECT id, name, blockchain_id, wallet_address
        FROM universities 
        WHERE id = ${testId}
        LIMIT 1
      `
      console.log(`  By database ID: ${byId.length > 0 ? '✓ FOUND' : '✗ NOT FOUND'}`)
      
      // Try by blockchain_id
      const byBlockchainId = await sql`
        SELECT id, name, blockchain_id, wallet_address
        FROM universities 
        WHERE blockchain_id = ${testId}
        LIMIT 1
      `
      console.log(`  By blockchain_id: ${byBlockchainId.length > 0 ? '✓ FOUND' : '✗ NOT FOUND'}`)
      
      if (byId.length > 0 || byBlockchainId.length > 0) {
        const uni = byId[0] || byBlockchainId[0]
        console.log(`  ✓ University found: ${uni.name} (DB ID: ${uni.id}, Blockchain ID: ${uni.blockchain_id})`)
      } else {
        console.log(`  ✗ University ${testId} NOT FOUND by either method`)
      }
      console.log('')
    }
    
    // Step 3: Check what the frontend is sending
    console.log('📊 STEP 3: Checking issuer registration requirements...\n')
    console.log('When registering an issuer, the API expects:')
    console.log('  - universityId (can be database ID or blockchain ID)')
    console.log('  - name, email (required)')
    console.log('  - phone, department, position (optional)')
    console.log('  - addedBy (wallet address of university admin)\n')
    
    // Step 4: Test the exact query from the API
    console.log('📊 STEP 4: Testing exact API query logic...\n')
    
    const testUniversityId = allUniversities[0].id || allUniversities[0].blockchain_id
    console.log(`Using university ID: ${testUniversityId}\n`)
    
    // This is the EXACT query from the API
    let universities = await sql`
      SELECT id, name, name_ar, admin_email, admin_name, blockchain_id, wallet_address
      FROM universities 
      WHERE id = ${testUniversityId} OR blockchain_id = ${testUniversityId}
      LIMIT 1
    `
    
    console.log(`Query result: ${universities.length > 0 ? '✓ SUCCESS' : '✗ FAILED'}`)
    if (universities.length > 0) {
      console.log(`  Found: ${universities[0].name}`)
      console.log(`  DB ID: ${universities[0].id}`)
      console.log(`  Blockchain ID: ${universities[0].blockchain_id || 'NULL'}`)
      console.log(`  Admin Email: ${universities[0].admin_email || 'NULL'}`)
    } else {
      console.log(`  ✗ University ${testUniversityId} not found!`)
      console.log(`  This is the problem - the query is failing!`)
    }
    
    // Step 5: Recommendations
    console.log('\n' + '='.repeat(60))
    console.log('📋 RECOMMENDATIONS:\n')
    
    if (allUniversities.length === 0) {
      console.log('1. ❌ NO UNIVERSITIES IN DATABASE')
      console.log('   → Create a university first via Super Admin')
      console.log('   → Or sync from blockchain if university exists on-chain\n')
    } else {
      console.log('1. ✓ Universities exist in database')
      
      // Check if any are active
      const activeUnis = allUniversities.filter(u => u.is_active && u.status === 'active')
      if (activeUnis.length === 0) {
        console.log('2. ⚠️  NO ACTIVE UNIVERSITIES')
        console.log('   → Activate at least one university first\n')
      } else {
        console.log(`2. ✓ ${activeUnis.length} active university(ies) found\n`)
      }
      
      console.log('3. When registering issuer, use:')
      console.log(`   - Database ID: ${allUniversities[0].id}`)
      if (allUniversities[0].blockchain_id) {
        console.log(`   - OR Blockchain ID: ${allUniversities[0].blockchain_id}`)
      }
      console.log('')
    }
    
    await sql.end()
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    await sql.end()
    process.exit(1)
  }
}

debug()
