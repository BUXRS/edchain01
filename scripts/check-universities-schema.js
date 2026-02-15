#!/usr/bin/env node

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

async function checkSchema() {
  try {
    console.log('📊 Checking universities table schema...\n')
    
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'universities' 
      ORDER BY ordinal_position
    `
    
    console.log('Columns in universities table:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`)
    })
    
    await sql.end()
  } catch (err) {
    console.error('❌ Error:', err.message)
    await sql.end()
    process.exit(1)
  }
}

checkSchema()
