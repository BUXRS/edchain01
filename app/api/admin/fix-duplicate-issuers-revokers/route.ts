/**
 * Fix duplicate issuers/revokers caused by mixed-case wallet_address.
 * 1. Deletes duplicate rows (keeps one per university_id + LOWER(wallet_address), preferring row with name set).
 * 2. Normalizes wallet_address to lowercase.
 */

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin, isErrorResponse } from "@/lib/middleware/admin-auth"

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (isErrorResponse(admin)) {
    return admin
  }

  try {
    const result = { issuers: { deleted: 0, normalized: 0 }, revokers: { deleted: 0, normalized: 0 }, errors: [] as string[] }

    // Issuers: delete duplicates (keep one per university_id, LOWER(wallet_address); prefer row with name)
    try {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`issuers delete: ${msg}`)
    }

    // Issuers: normalize wallet_address to lowercase
    try {
      const normIssuers = await sql`
        UPDATE issuers
        SET wallet_address = LOWER(wallet_address), updated_at = NOW()
        WHERE wallet_address IS NOT NULL AND wallet_address != LOWER(wallet_address)
      `
      result.issuers.normalized = Array.isArray(normIssuers) ? normIssuers.length : 0
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`issuers normalize: ${msg}`)
    }

    // Revokers: delete duplicates
    try {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`revokers delete: ${msg}`)
    }

    // Revokers: normalize wallet_address to lowercase
    try {
      const normRevokers = await sql`
        UPDATE revokers
        SET wallet_address = LOWER(wallet_address), updated_at = NOW()
        WHERE wallet_address IS NOT NULL AND wallet_address != LOWER(wallet_address)
      `
      result.revokers.normalized = Array.isArray(normRevokers) ? normRevokers.length : 0
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`revokers normalize: ${msg}`)
    }

    return NextResponse.json({
      ok: result.errors.length === 0,
      ...result,
      message: `Deleted ${result.issuers.deleted} duplicate issuer(s), ${result.revokers.deleted} duplicate revoker(s). Normalized ${result.issuers.normalized} issuer(s), ${result.revokers.normalized} revoker(s).`,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
