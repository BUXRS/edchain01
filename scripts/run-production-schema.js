#!/usr/bin/env node
/**
 * Run full database schema on production (e.g. Neon).
 * Delegates to setup-database.js (single source of truth).
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL="postgresql://..."; node scripts/run-production-schema.js
 *
 * Prefer: npm run db:setup  (with DATABASE_URL set to Neon DIRECT) or
 *         npm run db:setup:local  for local.
 */

require('./setup-database.js')
