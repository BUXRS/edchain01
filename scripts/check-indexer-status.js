#!/usr/bin/env node

/**
 * Check Indexer Status Script
 * 
 * This script checks if the indexer is running and fetching data from blockchain
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
  console.error('❌ Error reading .env.local:', err.message)
  process.exit(1)
}

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
})

async function checkIndexerStatus() {
  console.log('='.repeat(60))
  console.log('  INDEXER STATUS CHECK')
  console.log('='.repeat(60))
  console.log()

  try {
    // 1. Check sync_status table
    console.log('📊 Checking sync_status table...')
    const syncStatus = await sql`
      SELECT * FROM sync_status WHERE id = 1
    `.then(r => r[0] || null)

    if (syncStatus) {
      console.log('✅ Sync status found:')
      console.log(`   Last synced block: ${syncStatus.last_synced_block || 0}`)
      console.log(`   Finalized block: ${syncStatus.finalized_block || 0}`)
      console.log(`   Sync mode: ${syncStatus.sync_mode || 'unknown'}`)
      console.log(`   Updated at: ${syncStatus.updated_at || 'never'}`)
      console.log(`   Last full sync: ${syncStatus.last_full_sync_at || 'never'}`)
    } else {
      console.log('⚠️  No sync status found (indexer may not have started yet)')
    }

    console.log()

    // 2. Check chain_events table
    console.log('📊 Checking chain_events table...')
    try {
      const eventsCount = await sql`
        SELECT COUNT(*) as count FROM chain_events
      `.then(r => Number(r[0]?.count || 0))

      const recentEvents = await sql`
        SELECT COUNT(*) as count 
        FROM chain_events 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `.then(r => Number(r[0]?.count || 0))

      const lastEvent = await sql`
        SELECT event_name, block_number, created_at, tx_hash
        FROM chain_events
        ORDER BY block_number DESC, created_at DESC
        LIMIT 1
      `.then(r => r[0] || null)

      console.log(`✅ Total events in chain_events: ${eventsCount}`)
      console.log(`✅ Events in last hour: ${recentEvents}`)
      
      if (lastEvent) {
        console.log(`✅ Last event:`)
        console.log(`   Event: ${lastEvent.event_name}`)
        console.log(`   Block: ${lastEvent.block_number}`)
        console.log(`   Time: ${lastEvent.created_at}`)
        console.log(`   TX: ${lastEvent.tx_hash?.slice(0, 20)}...`)
      } else {
        console.log('⚠️  No events found in chain_events table')
      }
    } catch (err) {
      if (err.code === '42P01') {
        console.log('❌ chain_events table does not exist!')
        console.log('   Run migration: scripts/024-create-chain-events-table.sql')
      } else {
        console.error('❌ Error checking chain_events:', err.message)
      }
    }

    console.log()

    // 3. Check if data is being synced to materialized tables
    console.log('📊 Checking materialized tables (universities, degrees, etc.)...')
    
    const universitiesCount = await sql`
      SELECT COUNT(*) as count FROM universities WHERE blockchain_verified = true
    `.then(r => Number(r[0]?.count || 0))

    const degreesCount = await sql`
      SELECT COUNT(*) as count FROM degrees
    `.then(r => Number(r[0]?.count || 0))

    const issuersCount = await sql`
      SELECT COUNT(*) as count FROM issuers WHERE blockchain_verified = true
    `.then(r => Number(r[0]?.count || 0))

    const revokersCount = await sql`
      SELECT COUNT(*) as count FROM revokers WHERE blockchain_verified = true
    `.then(r => Number(r[0]?.count || 0))

    const verifiersCount = await sql`
      SELECT COUNT(*) as count FROM verifiers WHERE blockchain_verified = true
    `.then(r => Number(r[0]?.count || 0))

    console.log(`✅ Verified universities: ${universitiesCount}`)
    console.log(`✅ Degrees: ${degreesCount}`)
    console.log(`✅ Verified issuers: ${issuersCount}`)
    console.log(`✅ Verified revokers: ${revokersCount}`)
    console.log(`✅ Verified verifiers: ${verifiersCount}`)

    console.log()

    // 4. Check if indexer is actively processing
    console.log('📊 Checking if indexer is actively processing...')
    
    if (syncStatus && syncStatus.last_synced_block > 0) {
      const timeSinceLastSync = syncStatus.updated_at 
        ? Math.floor((new Date() - new Date(syncStatus.updated_at)) / 1000)
        : null

      if (timeSinceLastSync !== null) {
        if (timeSinceLastSync < 300) { // Less than 5 minutes
          console.log(`✅ Indexer appears active (last sync ${timeSinceLastSync}s ago)`)
        } else if (timeSinceLastSync < 3600) { // Less than 1 hour
          console.log(`⚠️  Indexer may be slow (last sync ${Math.floor(timeSinceLastSync / 60)}m ago)`)
        } else {
          console.log(`❌ Indexer may be stuck (last sync ${Math.floor(timeSinceLastSync / 3600)}h ago)`)
        }
      }
    }

    // 5. Summary
    console.log()
    console.log('='.repeat(60))
    console.log('  SUMMARY')
    console.log('='.repeat(60))
    
    let eventsCount = 0
    let recentEvents = 0
    try {
      eventsCount = await sql`
        SELECT COUNT(*) as count FROM chain_events
      `.then(r => Number(r[0]?.count || 0))

      recentEvents = await sql`
        SELECT COUNT(*) as count 
        FROM chain_events 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `.then(r => Number(r[0]?.count || 0))
    } catch (err) {
      // Table might not exist
    }
    
    const hasEvents = eventsCount > 0
    const hasRecentActivity = recentEvents > 0
    const hasData = universitiesCount > 0 || degreesCount > 0

    if (hasEvents && hasRecentActivity) {
      console.log('✅ Indexer appears to be RUNNING and FETCHING data')
      console.log(`   - ${eventsCount} total events stored`)
      console.log(`   - ${recentEvents} events in last hour`)
      console.log(`   - Data synced to materialized tables`)
    } else if (hasEvents && !hasRecentActivity) {
      console.log('⚠️  Indexer may be RUNNING but NOT actively fetching new data')
      console.log(`   - ${eventsCount} total events stored`)
      console.log(`   - No events in last hour`)
      console.log(`   - Check if blockchain has new activity`)
    } else if (!hasEvents && hasData) {
      console.log('⚠️  Data exists in DB but NO events in chain_events table')
      console.log('   - This suggests data was synced directly, not via indexer')
      console.log('   - Indexer may not be running or chain_events table missing')
    } else {
      console.log('❌ Indexer does NOT appear to be running or fetching data')
      console.log('   - No events found in chain_events table')
      console.log('   - No blockchain-verified data in materialized tables')
      console.log('   - Start the indexer: POST /api/admin/indexer/start')
    }

    await sql.end()
  } catch (err) {
    console.error('❌ Error:', err.message)
    await sql.end()
    process.exit(1)
  }
}

checkIndexerStatus()
