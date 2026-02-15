#!/usr/bin/env node

/**
 * Test script to directly fetch universities from blockchain
 * This will help debug why syncUniversity is failing
 */

const { ethers } = require('ethers')
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
  console.error('❌ Error reading .env.local:', err.message)
  process.exit(1)
}

const CORE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CORE_CONTRACT_ADDRESS || "0xBb51Dc84f0b35d3344f777543CA6549F9427B313"
const BASE_RPC_URL = "https://mainnet.base.org"

// Minimal ABI for getUniversity
const GET_UNIVERSITY_ABI = [
  {
    "inputs": [{"internalType": "uint64", "name": "id", "type": "uint64"}],
    "name": "getUniversity",
    "outputs": [{
      "components": [
        {"internalType": "address", "name": "admin", "type": "address"},
        {"internalType": "string", "name": "nameAr", "type": "string"},
        {"internalType": "string", "name": "nameEn", "type": "string"},
        {"internalType": "bool", "name": "exists", "type": "bool"},
        {"internalType": "bool", "name": "isActive", "type": "bool"},
        {"internalType": "bool", "name": "isDeleted", "type": "bool"}
      ],
      "internalType": "struct UniversityDegreeProtocolCore.University",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextUniversityId",
    "outputs": [{"internalType": "uint64", "name": "", "type": "uint64"}],
    "stateMutability": "view",
    "type": "function"
  }
]

async function testFetchUniversity() {
  console.log('='.repeat(60))
  console.log('  TESTING BLOCKCHAIN UNIVERSITY FETCH')
  console.log('='.repeat(60))
  console.log()
  console.log(`Contract: ${CORE_CONTRACT_ADDRESS}`)
  console.log(`RPC: ${BASE_RPC_URL}`)
  console.log()

  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL, {
      chainId: 8453,
      name: "base",
    })

    const contract = new ethers.Contract(CORE_CONTRACT_ADDRESS, GET_UNIVERSITY_ABI, provider)

    // Test 1: Get nextUniversityId
    console.log('📊 Test 1: Getting nextUniversityId...')
    const nextId = await contract.nextUniversityId()
    console.log(`✅ nextUniversityId = ${nextId.toString()}`)
    console.log()

    // Test 2: Fetch each university
    for (let i = 1; i < Number(nextId); i++) {
      console.log(`📊 Test 2.${i}: Fetching university ${i}...`)
      try {
        const result = await contract.getUniversity(i)
        console.log(`✅ University ${i} result:`)
        console.log(`   - admin: ${result.admin}`)
        console.log(`   - nameEn: ${result.nameEn || '(empty)'}`)
        console.log(`   - nameAr: ${result.nameAr || '(empty)'}`)
        console.log(`   - exists: ${result.exists}`)
        console.log(`   - isActive: ${result.isActive}`)
        console.log(`   - isDeleted: ${result.isDeleted}`)
        
        if (!result.exists) {
          console.log(`   ⚠️  University ${i} exists = false`)
        }
        if (result.isDeleted) {
          console.log(`   ⚠️  University ${i} isDeleted = true`)
        }
        console.log()
      } catch (err) {
        console.error(`   ❌ Error fetching university ${i}:`, {
          message: err.message,
          code: err.code,
          reason: err.reason,
          shortMessage: err.shortMessage
        })
        console.log()
      }
    }

    console.log('✅ Test completed!')
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

testFetchUniversity()
