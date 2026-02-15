#!/usr/bin/env node
/**
 * Run full database schema on production (e.g. Neon).
 * Use this when your Neon DB shows "0 tables" - it creates all tables.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL="postgresql://user:pass@host/neondb?sslmode=require"; node scripts/run-production-schema.js
 *
 * Or copy DATABASE_URL from Vercel (Settings → Environment Variables), then:
 *   $env:DATABASE_URL="<paste connection string>"; node scripts/run-production-schema.js
 *
 * Do NOT use your local .env.local DATABASE_URL unless it points to Neon.
 */

const postgres = require('postgres')
const fs = require('fs')
const path = require('path')

// Load .env.local only if DATABASE_URL not already set (so you can override in shell)
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local')
    const envFile = fs.readFileSync(envPath, 'utf8')
    envFile.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    })
  } catch (_) {}
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Set it in the shell or in .env.local')
  process.exit(1)
}

// Strip psql wrapper if pasted by mistake
let url = DATABASE_URL.trim()
const psqlMatch = url.match(/^psql\s+['"](.+)['"]\s*$/)
if (psqlMatch) url = psqlMatch[1].trim()

const sql = postgres(url, { max: 2, connect_timeout: 15 })

const FULL_SCHEMA = path.join(__dirname, '000-recreate-complete-database.sql')

async function run() {
  console.log('🚀 Running full production schema...')
  console.log('   Database:', url.split('@')[1]?.split('/')[0] || 'unknown')
  console.log('')

  if (!fs.existsSync(FULL_SCHEMA)) {
    console.error('❌ File not found:', FULL_SCHEMA)
    process.exit(1)
  }

  const content = fs.readFileSync(FULL_SCHEMA, 'utf8')
  // Split on semicolon followed by newline (statement boundary)
  const rawStatements = content
    .split(/\s*;\s*[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  const statements = rawStatements.map((s) => (s.endsWith(';') ? s : s + ';'))

  // Run all schema statements in ONE transaction so Neon pooler doesn't route
  // CREATE TABLE and CREATE INDEX to different backends (which causes "relation does not exist")
  let ok = 0
  let err = 0
  let firstError = null

  await sql.begin(async (tx) => {
    await tx.unsafe('SET client_min_messages TO ERROR')
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      try {
        await tx.unsafe(stmt)
        ok++
      } catch (e) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate'))) {
          ok++
        } else {
          if (!firstError) firstError = { index: i, message: e.message, statement: stmt.slice(0, 120) + '...' }
          console.error('   ⚠️', e.message?.split('\n')[0] || e)
          err++
        }
      }
    }
  })

  if (firstError) {
    console.log('')
    console.log('   First failure was at statement #' + (firstError.index + 1) + ':')
    console.log('   ' + firstError.message)
    console.log('   Statement preview: ' + firstError.statement)
  }

  // Create admin_notifications if not in full schema
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
  console.log('📋 Tables in public schema:', tables.length)
  tables.forEach((t) => console.log('   ', t.table_name))
  console.log('')
  console.log('✅ Production schema complete. App can now use this database.')
  await sql.end()
}

run().catch((e) => {
  console.error('❌', e.message || e)
  process.exit(1)
})
