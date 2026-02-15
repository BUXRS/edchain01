import postgres from "postgres"

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL
  if (!url) {
    return null
  }
  return url
}

// Create SQL client with proper connection pooling
// CRITICAL: Only create ONE connection pool for the entire application
const createSqlClient = () => {
  const url = getDatabaseUrl()
  if (!url) return null
  
  // Use a SINGLE shared connection pool with proper limits
  return postgres(url, {
    max: 5, // Reduced from 10 to prevent connection exhaustion
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30, // 30 minutes - close connections after this time
    transform: {
      undefined: null, // Transform undefined to null for PostgreSQL
    },
  })
}

// Initialize SQL client ONCE - this is the SINGLE shared pool
const sqlClient = createSqlClient()

// Graceful shutdown handler to close connections
if (typeof process !== 'undefined') {
  const gracefulShutdown = async () => {
    if (sqlClient) {
      console.log('[DB] Closing database connections...')
      await sqlClient.end({ timeout: 5 })
      console.log('[DB] Database connections closed')
    }
  }
  
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
}

// Helper to check if database is available (URL set)
export const isDatabaseAvailable = () => sqlClient !== null

/** Ping database. Returns true if reachable, false if not configured or connection refused. */
export async function pingDatabase(): Promise<boolean> {
  if (!sqlClient) return false
  try {
    await sqlClient`SELECT 1`
    return true
  } catch {
    return false
  }
}

// Export SQL function with error handling
export const sql =
  sqlClient ||
  ((() => {
    throw new Error("Database not configured")
  }) as unknown as typeof postgres)

/** Join SQL fragments with a separator (e.g. sql` AND `). postgres.js v3 does not provide sql.join. */
export function sqlJoin<T = unknown>(fragments: T[], separator: T): T {
  if (fragments.length === 0) throw new Error("sqlJoin: empty fragments")
  if (fragments.length === 1) return fragments[0]
  let result: T = fragments[0]
  const template: TemplateStringsArray = Object.assign(["", "", ""], { raw: ["", "", ""] })
  for (let i = 1; i < fragments.length; i++) {
    result = (sql as (s: TemplateStringsArray, ...v: unknown[]) => T)(template, result, separator, fragments[i])
  }
  return result
}

export async function query<T = any>(sqlQuery: string, params?: any[]): Promise<T[]> {
  if (!sqlClient) {
    throw new Error("Error connecting to database: DATABASE_URL is not set")
  }
  try {
    // postgres package uses parameterized queries differently
    if (params && params.length > 0) {
      // For postgres, we need to use the sql template tag with parameters
      const result = await sqlClient.unsafe(sqlQuery, params)
      return result as T[]
    }
    const result = await sqlClient.unsafe(sqlQuery)
    return result as T[]
  } catch (error) {
    throw new Error(`Error connecting to database: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Internal query wrapper for existing functions
async function queryInternal<T>(queryFn: () => Promise<T>): Promise<T> {
  if (!sqlClient) {
    throw new Error("Database not configured - DATABASE_URL is not set")
  }
  try {
    return await queryFn()
  } catch (error) {
    throw new Error(`Error connecting to database: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// University queries
export async function getUniversities(status?: string) {
  return await queryInternal(async () => {
    if (status) {
      return sql`SELECT * FROM universities WHERE status = ${status} ORDER BY created_at DESC`
    }
    return sql`SELECT * FROM universities ORDER BY created_at DESC`
  })
}

export async function getUniversityByWallet(walletAddress: string) {
  return await queryInternal(async () => {
    // Include admin_email explicitly for wallet login scenarios
    const result = await sql`
      SELECT 
        *,
        admin_email,
        email
      FROM universities 
      WHERE wallet_address = ${walletAddress.toLowerCase()} 
         OR admin_wallet = ${walletAddress.toLowerCase()}
    `
    return result[0] || null
  })
}

export async function getUniversityById(id: number) {
  return await queryInternal(async () => {
    const result = await sql`SELECT * FROM universities WHERE id = ${id}`
    return result[0] || null
  })
}

/**
 * Resolve session university id (may be DB id or blockchain_id) to database primary key.
 * Use this in university-scoped APIs so list/counts and inserts always use the same id.
 */
export async function getDbUniversityIdFromSessionId(sessionId: number): Promise<number | null> {
  if (!sqlClient) return null
  try {
    const result = await sql`
      SELECT id FROM universities
      WHERE id = ${Number(sessionId)} OR blockchain_id = ${Number(sessionId)}
      LIMIT 1
    `
    const row = result[0] as { id: number } | undefined
    return row ? Number(row.id) : null
  } catch {
    return null
  }
}

export async function createUniversity(data: {
  walletAddress: string
  name: string
  nameAr?: string
  country?: string
  logoUrl?: string
  website?: string
}) {
  return await queryInternal(async () => {
    const result = await sql`
      INSERT INTO universities (wallet_address, name, name_ar, country, logo_url, website, status)
      VALUES (${data.walletAddress.toLowerCase()}, ${data.name}, ${data.nameAr || null}, ${data.country || null}, ${data.logoUrl || null}, ${data.website || null}, 'pending')
      RETURNING *
    `
    return result[0]
  })
}

export async function updateUniversityStatus(id: number, status: string) {
  return await queryInternal(async () => {
    const result = await sql`
      UPDATE universities SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return result[0]
  })
}

export async function updateUniversitySubscription(
  walletAddress: string,
  data: {
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    subscriptionStatus?: string
    subscriptionPlan?: string
  },
) {
  return await queryInternal(async () => {
    const result = await sql`
      UPDATE universities 
      SET stripe_customer_id = COALESCE(${data.stripeCustomerId || null}, stripe_customer_id),
          stripe_subscription_id = COALESCE(${data.stripeSubscriptionId || null}, stripe_subscription_id),
          subscription_status = COALESCE(${data.subscriptionStatus || null}, subscription_status),
          subscription_plan = COALESCE(${data.subscriptionPlan || null}, subscription_plan),
          updated_at = NOW()
      WHERE wallet_address = ${walletAddress.toLowerCase()}
      RETURNING *
    `
    return result[0]
  })
}

// University authentication functions
export async function getUniversityByEmail(email: string) {
  return await queryInternal(async () => {
    const result = await sql`SELECT * FROM universities WHERE email = ${email.toLowerCase()}`
    return result[0] || null
  })
}

export async function getUniversityByEmailWithPassword(email: string) {
  return await queryInternal(async () => {
    // ✅ Use admin_email and admin_password_hash for authentication
    const result =
      await sql`
        SELECT 
          id, 
          name, 
          name_ar, 
          admin_email as email,
          admin_password_hash as password_hash,
          wallet_address, 
          country, 
          status, 
          stripe_customer_id, 
          stripe_subscription_id, 
          subscription_status, 
          subscription_plan,
          admin_name,
          admin_email,
          blockchain_id,
          is_active
        FROM universities 
        WHERE admin_email = ${email.toLowerCase()}
      `
    return result[0] || null
  })
}

export async function updateUniversityPassword(email: string, passwordHash: string) {
  return await queryInternal(async () => {
    const result = await sql`
      UPDATE universities 
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE email = ${email.toLowerCase()}
      RETURNING *
    `
    return result[0]
  })
}

export async function updateUniversityWallet(id: number, walletAddress: string) {
  return await queryInternal(async () => {
    const result = await sql`
      UPDATE universities 
      SET wallet_address = ${walletAddress.toLowerCase()}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return result[0]
  })
}

// Issuer queries
export async function getIssuers(universityId: number) {
  return await queryInternal(async () => {
    return sql`SELECT * FROM issuers WHERE university_id = ${universityId} ORDER BY created_at DESC`
  })
}

export async function getIssuerByWallet(walletAddress: string) {
  return await queryInternal(async () => {
    const result = await sql`
      SELECT i.*, u.name as university_name, u.wallet_address as university_wallet
      FROM issuers i
      JOIN universities u ON i.university_id = u.id
      WHERE i.wallet_address = ${walletAddress.toLowerCase()} AND i.is_active = true
    `
    return result[0] || null
  })
}

export async function createIssuer(data: {
  universityId: number
  walletAddress: string
  name?: string
  email?: string
  addedBy: string
}) {
  return await queryInternal(async () => {
    const result = await sql`
      INSERT INTO issuers (university_id, wallet_address, name, email, added_by)
      VALUES (${data.universityId}, ${data.walletAddress.toLowerCase()}, ${data.name || null}, ${data.email || null}, ${data.addedBy.toLowerCase()})
      RETURNING *
    `
    return result[0]
  })
}

export async function removeIssuer(universityId: number, walletAddress: string) {
  return await queryInternal(async () => {
    const result = await sql`
      UPDATE issuers SET is_active = false, updated_at = NOW()
      WHERE university_id = ${universityId} AND wallet_address = ${walletAddress.toLowerCase()}
      RETURNING *
    `
    return result[0]
  })
}

// Revoker queries
export async function getRevokers(universityId: number) {
  return await queryInternal(async () => {
    return sql`SELECT * FROM revokers WHERE university_id = ${universityId} ORDER BY created_at DESC`
  })
}

export async function getRevokerByWallet(walletAddress: string) {
  return await queryInternal(async () => {
    const result = await sql`
      SELECT r.*, u.name as university_name, u.wallet_address as university_wallet
      FROM revokers r
      JOIN universities u ON r.university_id = u.id
      WHERE r.wallet_address = ${walletAddress.toLowerCase()} AND r.is_active = true
    `
    return result[0] || null
  })
}

export async function createRevoker(data: {
  universityId: number
  walletAddress: string
  name?: string
  email?: string
  addedBy: string
}) {
  return await queryInternal(async () => {
    const result = await sql`
      INSERT INTO revokers (university_id, wallet_address, name, email, added_by)
      VALUES (${data.universityId}, ${data.walletAddress.toLowerCase()}, ${data.name || null}, ${data.email || null}, ${data.addedBy.toLowerCase()})
      RETURNING *
    `
    return result[0]
  })
}

export async function removeRevoker(universityId: number, walletAddress: string) {
  return await queryInternal(async () => {
    const result = await sql`
      UPDATE revokers SET is_active = false, updated_at = NOW()
      WHERE university_id = ${universityId} AND wallet_address = ${walletAddress.toLowerCase()}
      RETURNING *
    `
    return result[0]
  })
}

// Degree queries
export async function getDegrees(filters?: {
  universityId?: number
  studentAddress?: string
  issuedBy?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
}) {
  return await queryInternal(async () => {
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0
    const searchTerm = filters?.search?.toLowerCase().trim()

    // Build base query with all possible conditions
    // Handle issuedBy filter (degrees issued by a specific wallet)
    if (filters?.issuedBy) {
      const issuedByLower = filters.issuedBy.toLowerCase()
      if (filters?.status && searchTerm) {
        const searchPattern = `%${searchTerm}%`
        return sql`
          SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
          FROM degrees d
          JOIN universities u ON d.university_id = u.id
          WHERE d.issued_by = ${issuedByLower}
            AND d.is_revoked = ${filters.status === 'revoked'}
            AND (
              LOWER(d.token_id::text) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.student_name, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.student_name_ar, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.major, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.major_ar, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.degree_type, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(u.name_en, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(u.name, '')) LIKE ${searchPattern}
            )
          ORDER BY d.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }
      if (filters?.status) {
        return sql`
          SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
          FROM degrees d
          JOIN universities u ON d.university_id = u.id
          WHERE d.issued_by = ${issuedByLower}
            AND d.is_revoked = ${filters.status === 'revoked'}
          ORDER BY d.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }
      if (searchTerm) {
        const searchPattern = `%${searchTerm}%`
        return sql`
          SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
          FROM degrees d
          JOIN universities u ON d.university_id = u.id
          WHERE d.issued_by = ${issuedByLower}
            AND (
              LOWER(d.token_id::text) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.student_name, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.student_name_ar, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.major, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.major_ar, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(d.degree_type, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(u.name_en, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(u.name, '')) LIKE ${searchPattern}
            )
          ORDER BY d.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }
      // Just issuedBy filter
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE d.issued_by = ${issuedByLower}
        ORDER BY d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }
    
    if (filters?.universityId && filters?.status && searchTerm) {
      const searchPattern = `%${searchTerm}%`
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE d.university_id = ${filters.universityId}
          AND d.is_revoked = ${filters.status === 'revoked'}
          AND (
            LOWER(d.token_id::text) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.student_name, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.student_name_ar, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.major, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.major_ar, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.degree_type, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(u.name_en, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(u.name, '')) LIKE ${searchPattern}
          )
        ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    if (filters?.universityId && filters?.status) {
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE d.university_id = ${filters.universityId}
          AND d.is_revoked = ${filters.status === 'revoked'}
        ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    if (filters?.universityId && searchTerm) {
      const searchPattern = `%${searchTerm}%`
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE d.university_id = ${filters.universityId}
          AND (
            LOWER(d.token_id::text) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.student_name, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.student_name_ar, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.major, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.major_ar, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.degree_type, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(u.name_en, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(u.name, '')) LIKE ${searchPattern}
          )
        ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    if (filters?.universityId) {
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE d.university_id = ${filters.universityId}
        ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    if (filters?.studentAddress && searchTerm) {
      const searchPattern = `%${searchTerm}%`
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE d.student_address = ${filters.studentAddress.toLowerCase()}
          AND (
            LOWER(d.token_id::text) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.student_name, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.student_name_ar, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.major, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.major_ar, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.degree_type, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(u.name_en, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(u.name, '')) LIKE ${searchPattern}
          )
        ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    if (filters?.studentAddress) {
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE d.student_address = ${filters.studentAddress.toLowerCase()}
        ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    if (filters?.status && searchTerm) {
      const searchPattern = `%${searchTerm}%`
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE d.is_revoked = ${filters.status === 'revoked'}
          AND (
            LOWER(d.token_id::text) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.student_name, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.student_name_ar, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.major, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.major_ar, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(d.degree_type, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(u.name_en, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(u.name, '')) LIKE ${searchPattern}
          )
        ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    if (filters?.status) {
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE d.is_revoked = ${filters.status === 'revoked'}
        ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`
      return sql`
        SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
        FROM degrees d
        JOIN universities u ON d.university_id = u.id
        WHERE (
          LOWER(d.token_id::text) LIKE ${searchPattern} OR
          LOWER(COALESCE(d.student_name, '')) LIKE ${searchPattern} OR
          LOWER(COALESCE(d.student_name_ar, '')) LIKE ${searchPattern} OR
          LOWER(COALESCE(d.major, '')) LIKE ${searchPattern} OR
          LOWER(COALESCE(d.major_ar, '')) LIKE ${searchPattern} OR
          LOWER(COALESCE(d.degree_type, '')) LIKE ${searchPattern} OR
          LOWER(COALESCE(u.name_en, '')) LIKE ${searchPattern} OR
          LOWER(COALESCE(u.name, '')) LIKE ${searchPattern}
        )
        ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // No filters - return all
    return sql`
      SELECT d.*, u.name_en as university_name, u.name_ar as university_name_ar, u.blockchain_id as university_blockchain_id
      FROM degrees d
      JOIN universities u ON d.university_id = u.id
      ORDER BY d.last_verified_at DESC NULLS LAST, d.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  })
}

export async function getDegreeByTokenId(tokenId: number) {
  return await queryInternal(async () => {
    const result = await sql`
      SELECT d.*, u.name as university_name, u.logo_url as university_logo
      FROM degrees d
      JOIN universities u ON d.university_id = u.id
      WHERE d.token_id = ${tokenId}
    `
    return result[0] || null
  })
}

export async function createDegree(data: {
  tokenId: number
  universityId: number
  studentAddress: string
  studentName: string
  studentNameAr?: string
  degreeType: string
  degreeTypeAr?: string
  major: string
  majorAr?: string
  graduationDate: string
  cgpa?: number
  honors?: string
  honorsAr?: string
  ipfsHash?: string
  issuedBy: string
}) {
  return await queryInternal(async () => {
    const result = await sql`
      INSERT INTO degrees (
        token_id, university_id, student_address, student_name, student_name_ar,
        degree_type, degree_type_ar, major, major_ar, graduation_date, cgpa,
        honors, honors_ar, ipfs_hash, issued_by
      )
      VALUES (
        ${data.tokenId}, ${data.universityId}, ${data.studentAddress.toLowerCase()},
        ${data.studentName}, ${data.studentNameAr || null}, ${data.degreeType},
        ${data.degreeTypeAr || null}, ${data.major}, ${data.majorAr || null},
        ${data.graduationDate}, ${data.cgpa || null}, ${data.honors || null},
        ${data.honorsAr || null}, ${data.ipfsHash || null}, ${data.issuedBy.toLowerCase()}
      )
      RETURNING *
    `
    return result[0]
  })
}

export async function revokeDegree(tokenId: number, revokedBy: string, reason: string) {
  return await queryInternal(async () => {
    const result = await sql`
      UPDATE degrees 
      SET status = 'revoked', revoked_by = ${revokedBy.toLowerCase()}, revoked_at = NOW(), revocation_reason = ${reason}, updated_at = NOW()
      WHERE token_id = ${tokenId}
      RETURNING *
    `
    return result[0]
  })
}

/**
 * Backfill degrees table from degree_requests where status=ISSUED and token_id is set
 * but no matching degree row exists. Fixes issued degrees that never made it into degrees
 * (e.g. due to indexer/DB being down or projector skipping).
 */
export async function backfillIssuedDegrees(): Promise<{ synced: number; errors: string[] }> {
  if (!sqlClient) {
    return { synced: 0, errors: ['Database not configured'] }
  }
  const errors: string[] = []
  let synced = 0
  try {
    const issued = await sql`
      SELECT request_id, university_id, recipient_address, requester_address,
        student_name, student_name_ar, faculty_en, faculty_ar, major_en, major_ar,
        degree_name_en, degree_name_ar, gpa, year, token_id
      FROM degree_requests
      WHERE LOWER(status) = 'issued' AND token_id IS NOT NULL
    `
    for (const row of issued) {
      const tokenId = String(row.token_id)
      const existing = await sql`
        SELECT 1 FROM degrees WHERE token_id = ${tokenId} LIMIT 1
      `
      if (existing.length > 0) continue
      const studentName = row.student_name ?? 'Unknown'
      const degreeType = row.degree_name_en ?? 'Degree'
      const major = row.major_en ?? 'N/A'
      const gradYear = row.year != null ? Number(row.year) : new Date().getFullYear()
      const graduationDate = `${gradYear}-06-01`
      try {
        await sql`
          INSERT INTO degrees (
            token_id, university_id, student_address, student_name, student_name_ar,
            degree_type, degree_type_ar, major, major_ar, graduation_date, cgpa,
            issued_by, request_id, blockchain_verified, created_at, updated_at
          )
          VALUES (
            ${tokenId}, ${row.university_id}, ${(row.recipient_address as string).toLowerCase()},
            ${studentName}, ${row.student_name_ar ?? null}, ${degreeType},
            ${row.degree_name_ar ?? null}, ${major}, ${row.major_ar ?? null},
            ${graduationDate}, ${row.gpa ?? null},
            ${(row.requester_address as string).toLowerCase()}, ${row.request_id}, true, NOW(), NOW()
          )
          ON CONFLICT (token_id) DO NOTHING
        `
        synced += 1
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`request_id=${row.request_id} token_id=${tokenId}: ${msg}`)
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }
  return { synced, errors }
}

// Pending approvals queries
export async function getPendingApprovals(universityId?: number, status?: string) {
  return await queryInternal(async () => {
    if (universityId && status) {
      return sql`
        SELECT pa.*, u.name as university_name
        FROM pending_approvals pa
        JOIN universities u ON pa.university_id = u.id
        WHERE pa.university_id = ${universityId} AND pa.status = ${status}
        ORDER BY pa.requested_at DESC
      `
    }

    if (universityId) {
      return sql`
        SELECT pa.*, u.name as university_name
        FROM pending_approvals pa
        JOIN universities u ON pa.university_id = u.id
        WHERE pa.university_id = ${universityId}
        ORDER BY pa.requested_at DESC
      `
    }

    if (status) {
      return sql`
        SELECT pa.*, u.name as university_name
        FROM pending_approvals pa
        JOIN universities u ON pa.university_id = u.id
        WHERE pa.status = ${status}
        ORDER BY pa.requested_at DESC
      `
    }

    return sql`
      SELECT pa.*, u.name as university_name
      FROM pending_approvals pa
      JOIN universities u ON pa.university_id = u.id
      ORDER BY pa.requested_at DESC
    `
  })
}

export async function createPendingApproval(data: {
  universityId: number
  walletAddress: string
  role: "issuer" | "revoker"
  requesterEmail?: string
  requesterName?: string
}) {
  return await queryInternal(async () => {
    const result = await sql`
      INSERT INTO pending_approvals (university_id, wallet_address, role, requester_email, requester_name)
      VALUES (${data.universityId}, ${data.walletAddress.toLowerCase()}, ${data.role}, ${data.requesterEmail || null}, ${data.requesterName || null})
      RETURNING *
    `
    return result[0]
  })
}

export async function updatePendingApproval(id: number, status: string, reviewedBy: string) {
  return await queryInternal(async () => {
    const result = await sql`
      UPDATE pending_approvals 
      SET status = ${status}, reviewed_by = ${reviewedBy.toLowerCase()}, reviewed_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return result[0]
  })
}

// Admin queries
export async function getAdminByClerkId(clerkUserId: string) {
  return await queryInternal(async () => {
    const result = await sql`SELECT * FROM admin_users WHERE clerk_user_id = ${clerkUserId}`
    return result[0] || null
  })
}

export async function getAdminByEmail(email: string) {
  return await queryInternal(async () => {
    const result = await sql`SELECT * FROM admin_users WHERE email = ${email.toLowerCase()}`
    return result[0] || null
  })
}

export async function getAdminByEmailWithPassword(email: string) {
  return await queryInternal(async () => {
    const result = await sql`SELECT * FROM admin_users WHERE email = ${email.toLowerCase()}`
    return result[0] || null
  })
}

export async function updateAdminPassword(email: string, passwordHash: string) {
  return await queryInternal(async () => {
    const result = await sql`
      UPDATE admin_users 
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE email = ${email.toLowerCase()}
      RETURNING *
    `
    return result[0]
  })
}

export async function createAdminWithPassword(data: {
  clerkUserId: string
  email: string
  name?: string
  passwordHash: string
  isSuperAdmin?: boolean
}) {
  return await queryInternal(async () => {
    const result = await sql`
      INSERT INTO admin_users (clerk_user_id, email, name, password_hash, is_super_admin)
      VALUES (${data.clerkUserId}, ${data.email.toLowerCase()}, ${data.name || null}, ${data.passwordHash}, ${data.isSuperAdmin || false})
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = ${data.passwordHash},
        name = COALESCE(${data.name || null}, admin_users.name),
        is_super_admin = ${data.isSuperAdmin || false},
        updated_at = NOW()
      RETURNING *
    `
    return result[0]
  })
}

export async function createAdmin(data: {
  clerkUserId: string
  email: string
  name?: string
  isSuperAdmin?: boolean
}) {
  return await queryInternal(async () => {
    const result = await sql`
      INSERT INTO admin_users (clerk_user_id, email, name, is_super_admin)
      VALUES (${data.clerkUserId}, ${data.email.toLowerCase()}, ${data.name || null}, ${data.isSuperAdmin || false})
      RETURNING *
    `
    return result[0]
  })
}

// Activity log queries
export async function logActivity(data: {
  actorType: "admin" | "university" | "issuer" | "revoker" | "system"
  actorId?: string
  actorAddress?: string
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}) {
  return await queryInternal(async () => {
    const result = await sql`
      INSERT INTO activity_logs (actor_type, actor_id, actor_address, action, entity_type, entity_id, details, ip_address)
      VALUES (${data.actorType}, ${data.actorId || null}, ${data.actorAddress || null}, ${data.action}, ${data.entityType || null}, ${data.entityId || null}, ${JSON.stringify(data.details || {})}, ${data.ipAddress || null})
      RETURNING *
    `
    return result[0]
  })
}

export async function getActivityLogs(limit = 50, offset = 0) {
  return await queryInternal(async () => {
    return sql`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
  })
}

// Statistics queries
export async function getStats() {
  return await queryInternal(async () => {
    const universitiesCount = await sql`SELECT COUNT(*) as count FROM universities WHERE status = 'active'`
    const degreesCount = await sql`SELECT COUNT(*) as count FROM degrees`
    const issuersCount = await sql`SELECT COUNT(*) as count FROM issuers WHERE is_active = true`
    const revokersCount = await sql`SELECT COUNT(*) as count FROM revokers WHERE is_active = true`
    const pendingCount = await sql`SELECT COUNT(*) as count FROM pending_approvals WHERE status = 'pending'`

    return {
      universities: Number(universitiesCount[0]?.count || 0),
      degrees: Number(degreesCount[0]?.count || 0),
      issuers: Number(issuersCount[0]?.count || 0),
      revokers: Number(revokersCount[0]?.count || 0),
      pendingApprovals: Number(pendingCount[0]?.count || 0),
    }
  })
}
