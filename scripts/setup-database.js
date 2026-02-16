#!/usr/bin/env node
/**
 * Full database setup: (optionally) create DB, then apply complete schema.
 * Use for local reset or production (Neon) initial setup.
 *
 * ENV:
 *   DATABASE_URL     - From .env.local / .env if not set. Use Neon DIRECT URL for production.
 *   ALLOW_LOCAL_SCHEMA=yes - Required when DATABASE_URL is localhost (safety).
 *   CREATE_DB=1      - If set and URL is local, create the database if it doesn't exist.
 *
 * USAGE:
 *   Local (reset schema; DB must exist):
 *     npm run db:setup:local
 *   Local (create DB if missing, then schema):
 *     npm run db:setup:local:create
 *   Production (set Neon DIRECT URL first):
 *     $env:DATABASE_URL="postgresql://..."; npm run db:setup
 */

const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SCHEMA_FILE = path.join(__dirname, '000-recreate-complete-database.sql')

// Load .env.local then .env if DATABASE_URL not set
function loadEnv() {
  if (process.env.DATABASE_URL) return
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, file)
    try {
      const content = fs.readFileSync(envPath, 'utf8')
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^["']|["']$/g, '')
          if (!process.env[key]) process.env[key] = value
        }
      })
    } catch (_) {}
  }
}

function parseDatabaseUrl(input) {
  let url = (input || '').trim()
  const psqlMatch = url.match(/^psql\s+['"](.+)['"]\s*$/)
  if (psqlMatch) url = psqlMatch[1].trim()
  if (!url) return null
  try {
    const u = new URL(url.replace(/^postgres:\/\//, 'postgresql://'))
    const dbName = u.pathname.replace(/^\//, '').split('?')[0].trim()
    return { url, dbName: dbName || null }
  } catch (_) {
    return { url, dbName: null }
  }
}

function isLocalUrl(url) {
  if (!url) return false
  const isLocalHost = url.includes('localhost') || url.includes('127.0.0.1')
  const isCloud = /\.neon\.tech|\.supabase\.co|railway\.app|render\.com/i.test(url)
  return isLocalHost && !isCloud
}

async function ensureDatabaseExists(targetUrl, dbName) {
  if (!dbName || !/^[a-zA-Z0-9_]+$/.test(dbName)) {
    console.log('   ⚠️ Could not parse or validate DB name; skipping CREATE DATABASE.')
    return
  }
  const u = new URL(targetUrl.replace(/^postgres:\/\//, 'postgresql://'))
  u.pathname = '/postgres'
  const postgresUrl = u.toString()
  const sql = postgres(postgresUrl, { max: 1, connect_timeout: 10 })
  try {
    const exists = await sql`SELECT 1 FROM pg_database WHERE datname = ${dbName}`
    if (exists.length > 0) {
      console.log('   Database "' + dbName + '" already exists.')
    } else {
      await sql.unsafe('CREATE DATABASE ' + dbName)
      console.log('   Created database "' + dbName + '".')
    }
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log('   Database "' + dbName + '" already exists.')
    } else {
      throw e
    }
  } finally {
    await sql.end()
  }
}

async function runSchema(url) {
  const sql = postgres(url, { max: 2, connect_timeout: 15 })

  if (!fs.existsSync(SCHEMA_FILE)) {
    await sql.end()
    throw new Error('Schema file not found: ' + SCHEMA_FILE)
  }

  const content = fs.readFileSync(SCHEMA_FILE, 'utf8')
  const rawStatements = content
    .split(/\s*;\s*[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const statements = rawStatements.map((s) => (s.endsWith(';') ? s : s + ';'))

  await sql.unsafe('SET client_min_messages TO ERROR')

  const isTableOrDrop = (s) => {
    const t = s.replace(/^\s*--[^\n]*/gm, '').trim()
    return /^DROP\s+TABLE/i.test(t) || /^CREATE\s+TABLE/i.test(t) || /^INSERT\s+INTO/i.test(t)
  }
  const isIndexOrComment = (s) => {
    const t = s.replace(/^\s*--[^\n]*/gm, '').trim()
    return /^CREATE\s+(UNIQUE\s+)?INDEX/i.test(t) || /^COMMENT\s+ON/i.test(t)
  }
  const phase1 = statements.filter(isTableOrDrop)
  const phase2 = statements.filter(isIndexOrComment)

  console.log('   Phase 1: ' + phase1.length + ' statements (DROP/CREATE TABLE/INSERT)')
  let ok = 0,
    err = 0
  for (const stmt of phase1) {
    try {
      await sql.unsafe(stmt)
      ok++
    } catch (e) {
      if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate'))) ok++
      else {
        console.error('   ⚠️', (e.message || '').split('\n')[0])
        err++
      }
    }
  }
  console.log('   Phase 1 done: ' + ok + ' ok, ' + err + ' errors')

  console.log('   Phase 2: ' + phase2.length + ' statements (CREATE INDEX / COMMENT)')
  ok = 0
  err = 0
  for (const stmt of phase2) {
    try {
      await sql.unsafe(stmt)
      ok++
    } catch (e) {
      if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate'))) ok++
      else {
        console.error('   ⚠️', (e.message || '').split('\n')[0])
        err++
      }
    }
  }
  console.log('   Phase 2 done: ' + ok + ' ok, ' + err + ' errors')

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        related_entity_type VARCHAR(50),
        related_entity_id INTEGER,
        action_url VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
    console.log('   ✅ admin_notifications table ensured')
  } catch (e) {
    if (!e.message?.includes('already exists')) console.error('   ⚠️ admin_notifications:', e.message)
  }

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `
  console.log('')
  console.log('📋 Tables in public schema: ' + tables.length)
  tables.forEach((t) => console.log('   ', t.table_name))
  console.log('')
  console.log('✅ Database setup complete. App can use this database.')
  await sql.end()
}

async function main() {
  loadEnv()
  const raw = process.env.DATABASE_URL
  if (!raw) {
    console.error('❌ DATABASE_URL is not set. Set it in the shell or in .env.local / .env')
    process.exit(1)
  }

  const { url, dbName } = parseDatabaseUrl(raw)
  if (!url) {
    console.error('❌ DATABASE_URL is not a valid URL.')
    process.exit(1)
  }

  const local = isLocalUrl(url)
  if (local && process.env.ALLOW_LOCAL_SCHEMA !== 'yes') {
    console.error('❌ DATABASE_URL points to LOCAL. This script would DROP all local tables and data.')
    console.error('   To run against local: npm run db:setup:local  or  db:setup:local:create')
    console.error('   To run against production: set DATABASE_URL to your Neon DIRECT URL in the shell.')
    process.exit(1)
  }

  const createDb = process.env.CREATE_DB === '1' && local && dbName
  const target = url
  console.log('🚀 Database setup')
  console.log('   Target: ' + (target.split('@')[1] || target.split('/').pop() || 'unknown'))
  console.log('')

  if (createDb) {
    console.log('   Ensuring database exists...')
    await ensureDatabaseExists(target, dbName)
    console.log('')
  }

  await runSchema(target)
}

main().catch((e) => {
  console.error('❌', e.message || e)
  process.exit(1)
})
