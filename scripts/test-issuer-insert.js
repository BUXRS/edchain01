#!/usr/bin/env node

/**
 * Test Issuer INSERT statement directly against database
 * This will show the EXACT error if something is wrong
 */

const postgres = require('postgres')
const fs = require('fs')
const bcrypt = require('bcryptjs')

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

async function testInsert() {
  try {
    console.log('🧪 Testing Issuer INSERT statement...\n')
    
    // Get a test university ID
    const universities = await sql`SELECT id FROM universities LIMIT 1`
    if (universities.length === 0) {
      console.error('❌ No universities found in database. Please create a university first.')
      await sql.end()
      process.exit(1)
    }
    
    const testUniversityId = universities[0].id
    console.log(`📊 Using test university ID: ${testUniversityId}\n`)
    
    // Generate test data
    const testPassword = 'TestPassword123!'
    const passwordHash = await bcrypt.hash(testPassword, 10)
    const onboardingToken = 'test-token-' + Date.now()
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    console.log('📝 Attempting INSERT with these columns:')
    console.log('   - university_id')
    console.log('   - name')
    console.log('   - email')
    console.log('   - phone')
    console.log('   - department')
    console.log('   - position')
    console.log('   - password_hash')
    console.log('   - onboarding_token')
    console.log('   - onboarding_token_expires_at')
    console.log('   - status')
    console.log('   - is_active')
    console.log('   - added_by')
    console.log('   - account_activated')
    console.log('   - created_at')
    console.log('   - updated_at\n')
    
    // Try the exact INSERT statement from the code
    try {
      const result = await sql`
        INSERT INTO issuers (
          university_id,
          name,
          email,
          phone,
          department,
          position,
          password_hash,
          onboarding_token,
          onboarding_token_expires_at,
          status,
          is_active,
          added_by,
          account_activated,
          created_at,
          updated_at
        ) VALUES (
          ${testUniversityId},
          ${'Test Issuer'},
          ${'test@example.com'},
          ${'+1234567890'},
          ${'Test Department'},
          ${'Test Position'},
          ${passwordHash},
          ${onboardingToken},
          ${tokenExpiry},
          'pending',
          false,
          ${'0x0000000000000000000000000000000000000000'},
          false,
          NOW(),
          NOW()
        )
        RETURNING id, name, email, status
      `
      
      console.log('✅ INSERT SUCCESSFUL!')
      console.log('   Created issuer:', result[0])
      
      // Clean up - delete test record
      await sql`DELETE FROM issuers WHERE id = ${result[0].id}`
      console.log('   Test record cleaned up\n')
      
    } catch (insertError) {
      console.error('❌ INSERT FAILED!')
      console.error('   Error Code:', insertError.code)
      console.error('   Error Message:', insertError.message)
      console.error('   Error Detail:', insertError.detail)
      console.error('   Error Hint:', insertError.hint)
      console.error('   Error Position:', insertError.position)
      console.error('   Full Error:', insertError)
      
      // Check which columns exist
      console.log('\n🔍 Checking actual columns in issuers table...')
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'issuers'
        ORDER BY column_name
      `
      
      console.log('\n📊 Actual columns in issuers table:')
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`)
      })
      
      // Check for missing columns
      const requiredColumns = [
        'university_id', 'name', 'email', 'phone', 'department', 'position',
        'password_hash', 'onboarding_token', 'onboarding_token_expires_at',
        'status', 'is_active', 'added_by', 'account_activated', 'created_at', 'updated_at'
      ]
      
      const existingColumnNames = columns.map(c => c.column_name)
      const missing = requiredColumns.filter(col => !existingColumnNames.includes(col))
      
      if (missing.length > 0) {
        console.log(`\n❌ MISSING COLUMNS: ${missing.join(', ')}`)
        console.log('   Run migration: scripts/020-enhance-issuer-revoker-verifier-onboarding.sql')
      } else {
        console.log('\n✅ All required columns exist')
        console.log('   The error might be a constraint or data type issue')
      }
      
      await sql.end()
      process.exit(1)
    }
    
    await sql.end()
    console.log('✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    await sql.end()
    process.exit(1)
  }
}

testInsert()
