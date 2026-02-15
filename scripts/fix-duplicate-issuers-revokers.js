/**
 * Fix duplicate issuers/revokers (same university_id + wallet_address, different casing).
 * Run: node scripts/fix-duplicate-issuers-revokers.js
 */

const postgres = require('postgres')
const fs = require('fs')

// Load .env.local manually (no dotenv dependency)
try {
  const envFile = fs.readFileSync('.env.local', 'utf8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  })
} catch (_) {}
try {
  const envFile = fs.readFileSync('.env', 'utf8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  })
} catch (_) {}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set. Set it in .env.local or .env')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

async function run() {
  const result = { issuers: { deleted: 0, normalized: 0 }, revokers: { deleted: 0, normalized: 0 } }

  try {
    // Issuers: delete duplicates (keep one per university_id, LOWER(wallet_address); prefer row with name)
    const delIssuers = await sql`
      DELETE FROM issuers
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY university_id, LOWER(wallet_address)
              ORDER BY (CASE WHEN name IS NOT NULL AND TRIM(COALESCE(name,'')) != '' THEN 0 ELSE 1 END), id
            ) AS rn
          FROM issuers
          WHERE wallet_address IS NOT NULL
        ) t
        WHERE rn > 1
      )
    `
    result.issuers.deleted = Array.isArray(delIssuers) ? delIssuers.length : 0
    console.log(`Issuers: deleted ${result.issuers.deleted} duplicate(s)`)

    // Issuers: normalize wallet_address to lowercase
    const normIssuers = await sql`
      UPDATE issuers
      SET wallet_address = LOWER(wallet_address), updated_at = NOW()
      WHERE wallet_address IS NOT NULL AND wallet_address != LOWER(wallet_address)
    `
    result.issuers.normalized = Array.isArray(normIssuers) ? normIssuers.length : 0
    console.log(`Issuers: normalized ${result.issuers.normalized} wallet_address(es)`)

    // Revokers: delete duplicates
    const delRevokers = await sql`
      DELETE FROM revokers
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY university_id, LOWER(wallet_address)
              ORDER BY (CASE WHEN name IS NOT NULL AND TRIM(COALESCE(name,'')) != '' THEN 0 ELSE 1 END), id
            ) AS rn
          FROM revokers
          WHERE wallet_address IS NOT NULL
        ) t
        WHERE rn > 1
      )
    `
    result.revokers.deleted = Array.isArray(delRevokers) ? delRevokers.length : 0
    console.log(`Revokers: deleted ${result.revokers.deleted} duplicate(s)`)

    // Revokers: normalize wallet_address to lowercase
    const normRevokers = await sql`
      UPDATE revokers
      SET wallet_address = LOWER(wallet_address), updated_at = NOW()
      WHERE wallet_address IS NOT NULL AND wallet_address != LOWER(wallet_address)
    `
    result.revokers.normalized = Array.isArray(normRevokers) ? normRevokers.length : 0
    console.log(`Revokers: normalized ${result.revokers.normalized} wallet_address(es)`)

    console.log('\n✅ Done:', result)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

run()
