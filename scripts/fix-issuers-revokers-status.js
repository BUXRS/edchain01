#!/usr/bin/env node

/**
 * Fix Issuers and Revokers Status Script
 * 
 * This script directly verifies existing DB records against blockchain
 * and updates is_active to match blockchain state
 * 
 * Usage: node scripts/fix-issuers-revokers-status.js [universityId]
 */

const { ethers } = require('ethers')
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
  console.warn('⚠️ Warning: Could not read .env.local, using environment variables')
}

// Initialize database connection
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:BU%40Blck2025@localhost:5432/bubd"
const sql = postgres(DATABASE_URL)

// Initialize blockchain connection
const CORE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CORE_CONTRACT_ADDRESS || "0xBb51Dc84f0b35d3344f777543CA6549F9427B313"
const BASE_RPC_URL = process.env.BASE_RPC_HTTP_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.INFURA_BASE_RPC_URL || "https://base-mainnet.infura.io/v3/00f809ca00af49fbada21a49181eadc1"

// Load contract ABI (simplified - just the functions we need)
const CORE_ABI = [
  "function isIssuer(uint64 universityId, address account) view returns (bool)",
  "function isRevoker(uint64 universityId, address account) view returns (bool)",
]

const provider = new ethers.JsonRpcProvider(BASE_RPC_URL)
const contract = new ethers.Contract(CORE_CONTRACT_ADDRESS, CORE_ABI, provider)

// Helper functions
async function checkIsIssuerOnChain(universityId, account) {
  try {
    return await contract.isIssuer(universityId, account)
  } catch (error) {
    console.error(`Error checking issuer:`, error.message)
    return false
  }
}

async function checkIsRevokerOnChain(universityId, account) {
  try {
    return await contract.isRevoker(universityId, account)
  } catch (error) {
    console.error(`Error checking revoker:`, error.message)
    return false
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fixIssuersAndRevokers(universityId = null) {
  try {
    console.log('🔄 Starting fix for issuers and revokers status...')
    console.log(`📡 Using RPC: ${BASE_RPC_URL}`)
    console.log(`📄 Contract: ${CORE_CONTRACT_ADDRESS}`)
    console.log()
    
    // Get universities to process
    let universities
    if (universityId) {
      universities = await sql`
        SELECT id, blockchain_id FROM universities WHERE blockchain_id = ${Number(universityId)}
      `
    } else {
      universities = await sql`
        SELECT id, blockchain_id FROM universities WHERE blockchain_verified = true
      `
    }

    if (universities.length === 0) {
      console.log('❌ No universities found')
      process.exit(1)
    }

    console.log(`📊 Found ${universities.length} university(ies) to process\n`)

    const totalResults = {
      issuers: { activated: 0, deactivated: 0, verified: 0, errors: 0 },
      revokers: { activated: 0, deactivated: 0, verified: 0, errors: 0 },
    }

    for (const uni of universities) {
      const dbUniversityId = uni.id
      const blockchainId = Number(uni.blockchain_id)
      
      console.log(`🏫 Processing university ${blockchainId} (DB ID: ${dbUniversityId})...`)

      // Fix Issuers
      const dbIssuers = await sql`
        SELECT * FROM issuers WHERE university_id = ${dbUniversityId}
      `
      console.log(`  📝 Found ${dbIssuers.length} issuers in database`)

      for (const issuer of dbIssuers) {
        const address = issuer.wallet_address.toLowerCase()
        try {
          console.log(`    🔍 Verifying issuer ${address}...`)
          
          // Direct contract call
          const isActiveOnChain = await checkIsIssuerOnChain(blockchainId, address)
          
          if (isActiveOnChain && !issuer.is_active) {
            await sql`
              UPDATE issuers 
              SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
              WHERE id = ${issuer.id}
            `
            console.log(`    ✅ Activated issuer ${address} (was inactive in DB, blockchain says active)`)
            totalResults.issuers.activated++
          } else if (!isActiveOnChain && issuer.is_active) {
            await sql`
              UPDATE issuers 
              SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
              WHERE id = ${issuer.id}
            `
            console.log(`    ⚠️ Deactivated issuer ${address} (was active in DB, blockchain says inactive)`)
            totalResults.issuers.deactivated++
          } else {
            await sql`
              UPDATE issuers 
              SET blockchain_verified = true, last_verified_at = NOW()
              WHERE id = ${issuer.id}
            `
            console.log(`    ✓ Verified issuer ${address} (status matches)`)
            totalResults.issuers.verified++
          }
          
          // Rate limit protection: 30-60 seconds between calls
          const waitTime = 30000 + Math.random() * 30000
          console.log(`    ⏳ Waiting ${Math.round(waitTime / 1000)}s before next call...`)
          await delay(waitTime)
        } catch (error) {
          console.error(`    ❌ Error verifying issuer ${address}:`, error.message)
          totalResults.issuers.errors++
        }
      }

      // Fix Revokers
      const dbRevokers = await sql`
        SELECT * FROM revokers WHERE university_id = ${dbUniversityId}
      `
      console.log(`  📝 Found ${dbRevokers.length} revokers in database`)

      for (const revoker of dbRevokers) {
        const address = revoker.wallet_address.toLowerCase()
        try {
          console.log(`    🔍 Verifying revoker ${address}...`)
          
          // Direct contract call
          const isActiveOnChain = await checkIsRevokerOnChain(blockchainId, address)
          
          if (isActiveOnChain && !revoker.is_active) {
            await sql`
              UPDATE revokers 
              SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
              WHERE id = ${revoker.id}
            `
            console.log(`    ✅ Activated revoker ${address} (was inactive in DB, blockchain says active)`)
            totalResults.revokers.activated++
          } else if (!isActiveOnChain && revoker.is_active) {
            await sql`
              UPDATE revokers 
              SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
              WHERE id = ${revoker.id}
            `
            console.log(`    ⚠️ Deactivated revoker ${address} (was active in DB, blockchain says inactive)`)
            totalResults.revokers.deactivated++
          } else {
            await sql`
              UPDATE revokers 
              SET blockchain_verified = true, last_verified_at = NOW()
              WHERE id = ${revoker.id}
            `
            console.log(`    ✓ Verified revoker ${address} (status matches)`)
            totalResults.revokers.verified++
          }
          
          // Rate limit protection: 30-60 seconds between calls
          const waitTime = 30000 + Math.random() * 30000
          console.log(`    ⏳ Waiting ${Math.round(waitTime / 1000)}s before next call...`)
          await delay(waitTime)
        } catch (error) {
          console.error(`    ❌ Error verifying revoker ${address}:`, error.message)
          totalResults.revokers.errors++
        }
      }
      
      console.log(`\n✅ Completed university ${blockchainId}\n`)
    }

    console.log('='.repeat(60))
    console.log('✅ Fix completed!')
    console.log('='.repeat(60))
    console.log('\n📊 Summary:')
    console.log(`  Issuers:`)
    console.log(`    - Activated: ${totalResults.issuers.activated}`)
    console.log(`    - Deactivated: ${totalResults.issuers.deactivated}`)
    console.log(`    - Verified (no change): ${totalResults.issuers.verified}`)
    console.log(`    - Errors: ${totalResults.issuers.errors}`)
    console.log(`  Revokers:`)
    console.log(`    - Activated: ${totalResults.revokers.activated}`)
    console.log(`    - Deactivated: ${totalResults.revokers.deactivated}`)
    console.log(`    - Verified (no change): ${totalResults.revokers.verified}`)
    console.log(`    - Errors: ${totalResults.revokers.errors}`)

    // Close database connection
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Fatal error:', error)
    await sql.end().catch(() => {})
    process.exit(1)
  }
}

// Get universityId from command line args
const universityId = process.argv[2] || null
fixIssuersAndRevokers(universityId)
