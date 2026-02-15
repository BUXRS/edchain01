/**
 * Blockchain Sync Service
 * 
 * Synchronizes data between the blockchain (source of truth) and database (cache).
 * 
 * Flow:
 * 1. Read from blockchain
 * 2. Compare with database
 * 3. Update database to match blockchain
 * 4. Log sync operations
 */

import { sql } from '@/lib/db'
import { getSyncDelayUniversity, getSyncDelayEntity } from '@/lib/config/sync-config'
import {
  fetchUniversityFromBlockchain,
  fetchAllUniversities,
  checkIsIssuerOnChain,
  checkIsRevokerOnChain,
  checkIsVerifierOnChain,
  getUniversityVerifiers,
  fetchDegreeFromBlockchain,
  fetchDegreesForUniversity,
} from '@/lib/blockchain'
import { transactionManager } from './transaction-manager'

export interface SyncResult {
  success: boolean
  entityType: string
  entityId?: number
  added: number
  updated: number
  removed: number
  errors: string[]
}

class BlockchainSyncService {
  /**
   * Helper: Get database university ID from blockchain_id
   * Ensures university exists in DB, syncs if needed
   */
  private async getDbUniversityId(blockchainId: number): Promise<number | null> {
    try {
      // First, check if university exists in DB
      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${blockchainId} LIMIT 1
      `
      
      if (dbUniversity.length > 0) {
        return dbUniversity[0].id
      }
      
      // University doesn't exist - sync it first
      console.log(`[BlockchainSync] University with blockchain_id=${blockchainId} not found in DB, syncing...`)
      const syncResult = await this.syncUniversity(blockchainId)
      
      if (!syncResult.success) {
        console.error(`[BlockchainSync] Failed to sync university ${blockchainId}:`, syncResult.errors)
        return null
      }
      
      // Retry lookup after sync
      const retryDbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${blockchainId} LIMIT 1
      `
      
      if (retryDbUniversity.length > 0) {
        return retryDbUniversity[0].id
      }
      
      console.error(`[BlockchainSync] University ${blockchainId} still not found in DB after sync`)
      return null
    } catch (error) {
      console.error(`[BlockchainSync] Error getting DB university ID for blockchain_id=${blockchainId}:`, error)
      return null
    }
  }

  /**
   * Sync a single university from blockchain to database
   * Uses fetchUniversityFromBlockchain (may hit rate limits)
   */
  async syncUniversity(blockchainId: number): Promise<SyncResult> {
    try {
      console.log(`[BlockchainSync] Fetching university ${blockchainId} from blockchain...`)
      const university = await fetchUniversityFromBlockchain(blockchainId)
      
      if (!university || !university.exists) {
        console.warn(`[BlockchainSync] University ${blockchainId} not found or doesn't exist on blockchain`)
        return {
          success: false,
          entityType: 'university',
          entityId: blockchainId,
          added: 0,
          updated: 0,
          removed: 0,
          errors: [`University ${blockchainId} not found on blockchain`]
        }
      }
      
      return await this.syncUniversityFromData(blockchainId, university)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[BlockchainSync] ❌ Error syncing university ${blockchainId}:`, error)
      return {
        success: false,
        entityType: 'university',
        entityId: blockchainId,
        added: 0,
        updated: 0,
        removed: 0,
        errors: [errorMsg]
      }
    }
  }

  /**
   * Sync university from already-fetched data (avoids rate limiting)
   * Internal method used by comprehensive sync
   */
  private async syncUniversityFromData(blockchainId: number, university: { id: bigint; admin: string; nameAr: string; nameEn: string; exists: boolean; isActive: boolean }): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      entityType: 'university',
      entityId: blockchainId,
      added: 0,
      updated: 0,
      removed: 0,
      errors: []
    }

    try {
      if (!university || !university.exists) {
        console.warn(`[BlockchainSync] University ${blockchainId} data invalid or doesn't exist`)
        result.errors.push(`University ${blockchainId} data invalid`)
        return result
      }
      
      console.log(`[BlockchainSync] University ${blockchainId} found: ${university.nameEn || university.nameAr || 'Unnamed'}`)

      // Check if university exists in DB
      const existing = await sql`
        SELECT * FROM universities WHERE blockchain_id = ${blockchainId}
      `

      if (existing.length === 0) {
        // Insert new university
        console.log(`[BlockchainSync] Inserting university ${blockchainId} into database...`)
        
        // Use nameEn as primary name, fallback to nameAr
        const primaryName = university.nameEn || university.nameAr || `University ${blockchainId}`
        
        // ✅ FIX: Try INSERT with name_en first, fallback to without it if column doesn't exist
        try {
          await sql`
            INSERT INTO universities (
              blockchain_id, 
              name, 
              name_ar, 
              name_en,
              wallet_address,
              admin_wallet,
              is_active, 
              blockchain_verified, 
              last_synced_at,
              created_at,
              updated_at
            )
            VALUES (
              ${blockchainId}, 
              ${primaryName}, 
              ${university.nameAr || null},
              ${university.nameEn || null},
              ${university.admin?.toLowerCase() || null},
              ${university.admin?.toLowerCase() || null},
              ${university.isActive || false}, 
              true, 
              NOW(),
              NOW(),
              NOW()
            )
          `
          console.log(`[BlockchainSync] ✅ Successfully inserted university ${blockchainId}: ${primaryName}`)
        } catch (insertError: any) {
          // If name_en column doesn't exist, insert without it
          if (insertError?.code === '42703' && insertError?.message?.includes('name_en')) {
            console.warn(`[BlockchainSync] name_en column doesn't exist, inserting without it...`)
            await sql`
              INSERT INTO universities (
                blockchain_id, 
                name, 
                name_ar,
                wallet_address,
                admin_wallet,
                is_active, 
                blockchain_verified, 
                last_synced_at,
                created_at,
                updated_at
              )
              VALUES (
                ${blockchainId}, 
                ${primaryName}, 
                ${university.nameAr || null},
                ${university.admin?.toLowerCase() || null},
                ${university.admin?.toLowerCase() || null},
                ${university.isActive || false}, 
                true, 
                NOW(),
                NOW(),
                NOW()
              )
            `
            console.log(`[BlockchainSync] ✅ Successfully inserted university ${blockchainId} (without name_en): ${primaryName}`)
          } else {
            // Re-throw if it's a different error
            throw insertError
          }
        }
        result.added = 1
      } else {
        // Update existing university
        console.log(`[BlockchainSync] Updating existing university ${blockchainId} in database...`)
        const primaryName = university.nameEn || university.nameAr || `University ${blockchainId}`
        
        // ✅ FIX: Check if name_en column exists before trying to update it
        // Try with name_en first, fallback to without it if column doesn't exist
        try {
          // First, try to update with name_en
          await sql`
            UPDATE universities 
            SET 
              name = ${primaryName},
              name_ar = ${university.nameAr || null},
              name_en = ${university.nameEn || null},
              wallet_address = ${university.admin?.toLowerCase() || null},
              admin_wallet = ${university.admin?.toLowerCase() || null},
              is_active = ${university.isActive || false},
              blockchain_verified = true,
              last_synced_at = NOW(),
              updated_at = NOW()
            WHERE blockchain_id = ${blockchainId}
          `
          console.log(`[BlockchainSync] ✅ Successfully updated university ${blockchainId}: ${primaryName}`)
        } catch (updateError: any) {
          // If name_en column doesn't exist, update without it
          if (updateError?.code === '42703' && updateError?.message?.includes('name_en')) {
            console.warn(`[BlockchainSync] name_en column doesn't exist, updating without it...`)
            await sql`
              UPDATE universities 
              SET 
                name = ${primaryName},
                name_ar = ${university.nameAr || null},
                wallet_address = ${university.admin?.toLowerCase() || null},
                admin_wallet = ${university.admin?.toLowerCase() || null},
                is_active = ${university.isActive || false},
                blockchain_verified = true,
                last_synced_at = NOW(),
                updated_at = NOW()
              WHERE blockchain_id = ${blockchainId}
            `
            console.log(`[BlockchainSync] ✅ Successfully updated university ${blockchainId} (without name_en): ${primaryName}`)
          } else {
            // Re-throw if it's a different error
            throw updateError
          }
        }
        result.updated = 1
      }

      await transactionManager.logSync('university', blockchainId, 'sync', undefined, undefined, 'completed').catch(err => {
        console.warn(`[BlockchainSync] Failed to log sync for university ${blockchainId}:`, err)
      })
      result.success = true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[BlockchainSync] ❌ Error syncing university ${blockchainId}:`, error)
      if (error instanceof Error) {
        console.error(`[BlockchainSync] Error stack:`, error.stack)
      }
      result.errors.push(errorMsg)
      await transactionManager.logSync('university', blockchainId, 'sync', undefined, undefined, 'failed', errorMsg).catch(err => {
        console.warn(`[BlockchainSync] Failed to log sync error:`, err)
      })
    }

    return result
  }

  /**
   * Sync all universities from blockchain
   */
  async syncAllUniversities(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      entityType: 'universities',
      added: 0,
      updated: 0,
      removed: 0,
      errors: []
    }

    try {
      const universities = await fetchAllUniversities()
      
      for (const uni of universities) {
        const syncResult = await this.syncUniversity(uni.id)
        result.added += syncResult.added
        result.updated += syncResult.updated
        result.errors.push(...syncResult.errors)
      }

      result.success = result.errors.length === 0
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Fetch and sync issuers for a university from blockchain
   * Fetches from blockchain events FIRST, then syncs to DB
   */
  async syncIssuersForUniversity(universityId: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      entityType: 'issuers',
      entityId: universityId,
      added: 0,
      updated: 0,
      removed: 0,
      errors: []
    }

    try {
      // CRITICAL: Get database university ID from blockchain_id
      const dbUniversityId = await this.getDbUniversityId(universityId)
      if (!dbUniversityId) {
        result.errors.push(`University ${universityId} not found in database`)
        return result
      }
      
      // STEP 1: Get existing issuers from database FIRST
      const dbIssuers = await sql`
        SELECT * FROM issuers WHERE university_id = ${dbUniversityId}
      `
      const dbIssuerMap = new Map<string, any>()
      for (const i of dbIssuers) {
        if (i.wallet_address) dbIssuerMap.set(i.wallet_address.toLowerCase(), i)
      }

      // Web2-first flow: issuers with blockchain_verified = false are pending admin "Add to Chain".
      // Do NOT look for them on-chain; they will appear on-chain only after university admin triggers MetaMask.
      const isPendingBlockchain = (i: any) => i.blockchain_verified === false
      const dbIssuersOnChain = dbIssuers.filter((i: any) => !isPendingBlockchain(i) && i.wallet_address)

      console.log(`[BlockchainSync] Found ${dbIssuers.length} issuers in database for university ${universityId} (${dbIssuersOnChain.length} already on-chain or expected on-chain)`)

      // STEP 2: Try to fetch from blockchain events (may fail due to rate limits)
      let blockchainIssuers: string[] = []
      try {
        console.log(`[BlockchainSync] Attempting to fetch issuers from blockchain events...`)
        const { fetchIssuersFromBlockchainEvents } = await import("@/lib/blockchain-fetch-issuers-revokers")
        blockchainIssuers = await fetchIssuersFromBlockchainEvents(universityId)
        console.log(`[BlockchainSync] ✅ Found ${blockchainIssuers.length} issuers from blockchain events`)
      } catch (error: any) {
        console.warn(`[BlockchainSync] ⚠️ Failed to fetch from events (likely rate limited): ${error.message}`)
        console.log(`[BlockchainSync] 🔄 Falling back to direct contract verification for DB issuers that are already on-chain...`)
        const { checkIsIssuerOnChain } = await import("@/lib/blockchain")
        // Only verify issuers that are supposed to be on-chain (blockchain_verified = true). Skip pending admin "Add to Chain".
        for (const dbIssuer of dbIssuersOnChain) {
          const normalizedAddress = dbIssuer.wallet_address?.toLowerCase()
          if (!normalizedAddress) continue
          try {
            await new Promise(resolve => setTimeout(resolve, 30000 + Math.random() * 30000))
            const isActiveOnChain = await checkIsIssuerOnChain(universityId, normalizedAddress)
            if (isActiveOnChain && !dbIssuer.is_active) {
              console.log(`[BlockchainSync] ✅ Activating issuer ${normalizedAddress} (active on blockchain)`)
              await sql`
                UPDATE issuers SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${dbIssuer.id}
              `
              result.updated++
            } else if (!isActiveOnChain && dbIssuer.is_active) {
              console.log(`[BlockchainSync] ⚠️ Deactivating issuer ${normalizedAddress} (inactive on blockchain)`)
              await sql`
                UPDATE issuers SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${dbIssuer.id}
              `
              result.removed++
            } else if (isActiveOnChain && dbIssuer.is_active) {
              await sql`UPDATE issuers SET blockchain_verified = true, last_verified_at = NOW() WHERE id = ${dbIssuer.id}`
            }
          } catch (err: any) {
            console.error(`[BlockchainSync] ❌ Error verifying issuer ${normalizedAddress}:`, err)
            result.errors.push(`Failed to verify issuer ${normalizedAddress}: ${err.message}`)
          }
        }
        console.log(`[BlockchainSync] ✅ Completed direct verification for ${dbIssuersOnChain.length} on-chain issuers (skipped ${dbIssuers.length - dbIssuersOnChain.length} pending admin Add to Chain)`)
        await transactionManager.logSync('issuers', universityId, 'sync', undefined, undefined, 'completed')
        result.success = true
        return result
      }

      // When event fetch returns EMPTY but we have DB issuers: only verify issuers that are supposed to be on-chain.
      // Do NOT call chain for pending_blockchain issuers — they are web2-only until admin triggers "Add to Chain".
      if (blockchainIssuers.length === 0 && dbIssuersOnChain.length > 0) {
        console.log(`[BlockchainSync] Event fetch returned 0 on-chain; verifying ${dbIssuersOnChain.length} DB issuers that are expected on-chain (skipping ${dbIssuers.length - dbIssuersOnChain.length} pending Add to Chain)`)
        const { checkIsIssuerOnChain } = await import("@/lib/blockchain")
        for (const dbIssuer of dbIssuersOnChain) {
          const normalizedAddress = dbIssuer.wallet_address?.toLowerCase()
          if (!normalizedAddress) continue
          try {
            await new Promise(resolve => setTimeout(resolve, getSyncDelayUniversity()))
            const isActiveOnChain = await checkIsIssuerOnChain(universityId, normalizedAddress)
            if (isActiveOnChain && !dbIssuer.is_active) {
              await sql`
                UPDATE issuers SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${dbIssuer.id}
              `
              result.updated++
            } else if (!isActiveOnChain && dbIssuer.is_active) {
              await sql`
                UPDATE issuers SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${dbIssuer.id}
              `
              result.removed++
            } else if (isActiveOnChain && dbIssuer.is_active) {
              await sql`UPDATE issuers SET blockchain_verified = true, last_verified_at = NOW() WHERE id = ${dbIssuer.id}`
            }
          } catch (err: any) {
            result.errors.push(`Failed to verify issuer ${normalizedAddress}: ${err.message}`)
          }
        }
        console.log(`[BlockchainSync] ✅ Completed on-chain verification for ${dbIssuersOnChain.length} issuers (empty event list)`)
        await transactionManager.logSync('issuers', universityId, 'sync', undefined, undefined, 'completed')
        result.success = true
        return result
      }
      // If we have 0 events and 0 "on-chain" DB issuers (all pending), nothing to verify — success and exit
      if (blockchainIssuers.length === 0 && dbIssuersOnChain.length === 0) {
        console.log(`[BlockchainSync] Event fetch returned 0; no DB issuers expected on-chain yet (all pending admin Add to Chain). Nothing to verify.`)
        await transactionManager.logSync('issuers', universityId, 'sync', undefined, undefined, 'completed')
        result.success = true
        return result
      }

      // STEP 3: If event fetching succeeded and returned data, use event-based sync
      // Insert new issuers that don't exist in DB
      for (const issuerAddress of blockchainIssuers) {
        const normalizedAddress = issuerAddress.toLowerCase()
        const existing = dbIssuerMap.get(normalizedAddress)
        
        if (!existing) {
          // New issuer - insert into DB (ON CONFLICT updates to avoid duplicate rows from case or race)
          try {
            console.log(`[BlockchainSync] Inserting new issuer ${normalizedAddress} for university ${universityId}...`)
            await sql`
              INSERT INTO issuers (
                university_id, wallet_address, is_active, blockchain_verified, last_verified_at, created_at, updated_at
              ) VALUES (
                ${dbUniversityId}, ${normalizedAddress}, true, true, NOW(), NOW(), NOW()
              )
              ON CONFLICT (wallet_address, university_id) DO UPDATE SET
                is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
            `
            console.log(`[BlockchainSync] ✅ Successfully inserted/updated issuer ${normalizedAddress}`)
            result.added++
          } catch (err: any) {
            console.error(`[BlockchainSync] ❌ Error inserting issuer ${normalizedAddress}:`, err)
            result.errors.push(`Failed to insert issuer ${normalizedAddress}: ${err.message}`)
          }
        } else {
          // Existing issuer - update if needed
          if (!existing.is_active || !existing.blockchain_verified) {
            try {
              await sql`
                UPDATE issuers 
                SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${existing.id}
              `
              result.updated++
            } catch (err: any) {
              result.errors.push(`Failed to update issuer ${normalizedAddress}: ${err.message}`)
            }
          } else {
            // Just update verification timestamp
            await sql`
              UPDATE issuers 
              SET last_verified_at = NOW()
              WHERE id = ${existing.id}
            `
          }
        }
      }

      // STEP 4: Deactivate only issuers that were on-chain but are no longer on blockchain.
      // Do NOT deactivate pending_blockchain issuers (web2-only until admin "Add to Chain").
      for (const dbIssuer of dbIssuers) {
        const normalizedAddress = dbIssuer.wallet_address?.toLowerCase()
        if (!normalizedAddress) continue
        if (isPendingBlockchain(dbIssuer)) continue
        if (!blockchainIssuers.includes(normalizedAddress) && dbIssuer.is_active) {
          try {
            console.log(`[BlockchainSync] Deactivating issuer ${normalizedAddress} (no longer on blockchain)`)
            await sql`
              UPDATE issuers 
              SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
              WHERE id = ${dbIssuer.id}
            `
            result.removed++
          } catch (err: any) {
            result.errors.push(`Failed to deactivate issuer ${normalizedAddress}: ${err.message}`)
          }
        }
      }

      console.log(`[BlockchainSync] ✅ Completed syncing issuers for university ${universityId}: added=${result.added}, updated=${result.updated}, removed=${result.removed}`)
      
      // Log final DB count for verification
      const finalCount = await sql`
        SELECT COUNT(*) as count FROM issuers WHERE university_id = ${dbUniversityId} AND is_active = true
      `.then(r => Number(r[0]?.count || 0))
      console.log(`[BlockchainSync] 📊 Final DB count for university ${universityId}: ${finalCount} active issuers`)
      await transactionManager.logSync('issuers', universityId, 'sync', undefined, undefined, 'completed')
      result.success = true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[BlockchainSync] ❌ Error syncing issuers for university ${universityId}:`, error)
      result.errors.push(errorMsg)
      await transactionManager.logSync('issuers', universityId, 'sync', undefined, undefined, 'failed', errorMsg)
    }

    return result
  }

  /**
   * Fetch and sync revokers for a university from blockchain
   * Fetches from blockchain events FIRST, then syncs to DB
   */
  async syncRevokersForUniversity(universityId: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      entityType: 'revokers',
      entityId: universityId,
      added: 0,
      updated: 0,
      removed: 0,
      errors: []
    }

    try {
      // CRITICAL: Get database university ID from blockchain_id
      const dbUniversityId = await this.getDbUniversityId(universityId)
      if (!dbUniversityId) {
        result.errors.push(`University ${universityId} not found in database`)
        return result
      }
      
      // STEP 1: Get existing revokers from database FIRST
      const dbRevokers = await sql`
        SELECT * FROM revokers WHERE university_id = ${dbUniversityId}
      `
      const dbRevokerMap = new Map<string, any>()
      for (const r of dbRevokers) {
        if (r.wallet_address) dbRevokerMap.set(r.wallet_address.toLowerCase(), r)
      }
      const isPendingBlockchainRevoker = (r: any) => r.blockchain_verified === false
      const dbRevokersOnChain = dbRevokers.filter((r: any) => !isPendingBlockchainRevoker(r) && r.wallet_address)
      console.log(`[BlockchainSync] Found ${dbRevokers.length} revokers in database for university ${universityId} (${dbRevokersOnChain.length} already on-chain or expected on-chain)`)

      // STEP 2: Try to fetch from blockchain events (may fail due to rate limits)
      let blockchainRevokers: string[] = []
      try {
        console.log(`[BlockchainSync] Attempting to fetch revokers from blockchain events...`)
        const { fetchRevokersFromBlockchainEvents } = await import("@/lib/blockchain-fetch-issuers-revokers")
        blockchainRevokers = await fetchRevokersFromBlockchainEvents(universityId)
        console.log(`[BlockchainSync] ✅ Found ${blockchainRevokers.length} revokers from blockchain events`)
      } catch (error: any) {
        console.warn(`[BlockchainSync] ⚠️ Failed to fetch from events (likely rate limited): ${error.message}`)
        console.log(`[BlockchainSync] 🔄 Falling back to direct contract verification for DB revokers that are already on-chain...`)
        const { checkIsRevokerOnChain } = await import("@/lib/blockchain")
        for (const dbRevoker of dbRevokersOnChain) {
          const normalizedAddress = dbRevoker.wallet_address?.toLowerCase()
          if (!normalizedAddress) continue
          try {
            await new Promise(resolve => setTimeout(resolve, 30000 + Math.random() * 30000))
            const isActiveOnChain = await checkIsRevokerOnChain(universityId, normalizedAddress)
            if (isActiveOnChain && !dbRevoker.is_active) {
              console.log(`[BlockchainSync] ✅ Activating revoker ${normalizedAddress} (active on blockchain)`)
              await sql`
                UPDATE revokers SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${dbRevoker.id}
              `
              result.updated++
            } else if (!isActiveOnChain && dbRevoker.is_active) {
              console.log(`[BlockchainSync] ⚠️ Deactivating revoker ${normalizedAddress} (inactive on blockchain)`)
              await sql`
                UPDATE revokers SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${dbRevoker.id}
              `
              result.removed++
            } else if (isActiveOnChain && dbRevoker.is_active) {
              await sql`UPDATE revokers SET blockchain_verified = true, last_verified_at = NOW() WHERE id = ${dbRevoker.id}`
            }
          } catch (err: any) {
            console.error(`[BlockchainSync] ❌ Error verifying revoker ${normalizedAddress}:`, err)
            result.errors.push(`Failed to verify revoker ${normalizedAddress}: ${err.message}`)
          }
        }
        console.log(`[BlockchainSync] ✅ Completed direct verification for ${dbRevokersOnChain.length} on-chain revokers (skipped ${dbRevokers.length - dbRevokersOnChain.length} pending admin Add to Chain)`)
        await transactionManager.logSync('revokers', universityId, 'sync', undefined, undefined, 'completed')
        result.success = true
        return result
      }

      if (blockchainRevokers.length === 0 && dbRevokersOnChain.length > 0) {
        console.log(`[BlockchainSync] Event fetch returned 0 on-chain; verifying ${dbRevokersOnChain.length} DB revokers that are expected on-chain (skipping ${dbRevokers.length - dbRevokersOnChain.length} pending Add to Chain)`)
        const { checkIsRevokerOnChain } = await import("@/lib/blockchain")
        for (const dbRevoker of dbRevokersOnChain) {
          const normalizedAddress = dbRevoker.wallet_address?.toLowerCase()
          if (!normalizedAddress) continue
          try {
            await new Promise(resolve => setTimeout(resolve, getSyncDelayUniversity()))
            const isActiveOnChain = await checkIsRevokerOnChain(universityId, normalizedAddress)
            if (isActiveOnChain && !dbRevoker.is_active) {
              await sql`
                UPDATE revokers SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${dbRevoker.id}
              `
              result.updated++
            } else if (!isActiveOnChain && dbRevoker.is_active) {
              await sql`
                UPDATE revokers SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${dbRevoker.id}
              `
              result.removed++
            } else if (isActiveOnChain && dbRevoker.is_active) {
              await sql`UPDATE revokers SET blockchain_verified = true, last_verified_at = NOW() WHERE id = ${dbRevoker.id}`
            }
          } catch (err: any) {
            result.errors.push(`Failed to verify revoker ${normalizedAddress}: ${err.message}`)
          }
        }
        console.log(`[BlockchainSync] ✅ Completed on-chain verification for ${dbRevokersOnChain.length} revokers (empty event list)`)
        await transactionManager.logSync('revokers', universityId, 'sync', undefined, undefined, 'completed')
        result.success = true
        return result
      }
      if (blockchainRevokers.length === 0 && dbRevokersOnChain.length === 0) {
        console.log(`[BlockchainSync] Event fetch returned 0; no DB revokers expected on-chain yet (all pending admin Add to Chain). Nothing to verify.`)
        await transactionManager.logSync('revokers', universityId, 'sync', undefined, undefined, 'completed')
        result.success = true
        return result
      }

      // STEP 3: If event fetching succeeded and returned data, use event-based sync
      // Insert new revokers that don't exist in DB
      for (const revokerAddress of blockchainRevokers) {
        const normalizedAddress = revokerAddress.toLowerCase()
        const existing = dbRevokerMap.get(normalizedAddress)
        
        if (!existing) {
          // New revoker - insert into DB (ON CONFLICT updates to avoid duplicate rows from case or race)
          try {
            console.log(`[BlockchainSync] Inserting new revoker ${normalizedAddress} for university ${universityId}...`)
            await sql`
              INSERT INTO revokers (
                university_id, wallet_address, is_active, blockchain_verified, last_verified_at, created_at, updated_at
              ) VALUES (
                ${dbUniversityId}, ${normalizedAddress}, true, true, NOW(), NOW(), NOW()
              )
              ON CONFLICT (wallet_address, university_id) DO UPDATE SET
                is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
            `
            console.log(`[BlockchainSync] ✅ Successfully inserted/updated revoker ${normalizedAddress}`)
            result.added++
          } catch (err: any) {
            console.error(`[BlockchainSync] ❌ Error inserting revoker ${normalizedAddress}:`, err)
            result.errors.push(`Failed to insert revoker ${normalizedAddress}: ${err.message}`)
          }
        } else {
          // Existing revoker - update if needed
          if (!existing.is_active || !existing.blockchain_verified) {
            try {
              await sql`
                UPDATE revokers 
                SET is_active = true, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
                WHERE id = ${existing.id}
              `
              result.updated++
            } catch (err: any) {
              result.errors.push(`Failed to update revoker ${normalizedAddress}: ${err.message}`)
            }
          } else {
            // Just update verification timestamp
            await sql`
              UPDATE revokers 
              SET last_verified_at = NOW()
              WHERE id = ${existing.id}
            `
          }
        }
      }

      // STEP 4: Deactivate only revokers that were on-chain but are no longer on blockchain.
      for (const dbRevoker of dbRevokers) {
        const normalizedAddress = dbRevoker.wallet_address?.toLowerCase()
        if (!normalizedAddress) continue
        if (isPendingBlockchainRevoker(dbRevoker)) continue
        if (!blockchainRevokers.includes(normalizedAddress) && dbRevoker.is_active) {
          try {
            console.log(`[BlockchainSync] Deactivating revoker ${normalizedAddress} (no longer on blockchain)`)
            await sql`
              UPDATE revokers 
              SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
              WHERE id = ${dbRevoker.id}
            `
            result.removed++
          } catch (err: any) {
            result.errors.push(`Failed to deactivate revoker ${normalizedAddress}: ${err.message}`)
          }
        }
      }

      console.log(`[BlockchainSync] ✅ Completed syncing revokers for university ${universityId}: added=${result.added}, updated=${result.updated}, removed=${result.removed}`)
      
      // Log final DB count for verification
      const finalCount = await sql`
        SELECT COUNT(*) as count FROM revokers WHERE university_id = ${dbUniversityId} AND is_active = true
      `.then(r => Number(r[0]?.count || 0))
      console.log(`[BlockchainSync] 📊 Final DB count for university ${universityId}: ${finalCount} active revokers`)
      await transactionManager.logSync('revokers', universityId, 'sync', undefined, undefined, 'completed')
      result.success = true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[BlockchainSync] ❌ Error syncing revokers for university ${universityId}:`, error)
      result.errors.push(errorMsg)
      await transactionManager.logSync('revokers', universityId, 'sync', undefined, undefined, 'failed', errorMsg)
    }

    return result
  }

  /**
   * Verify a single issuer against blockchain
   */
  async verifyIssuer(universityId: number, walletAddress: string): Promise<{
    verified: boolean
    isIssuer: boolean
    source: 'blockchain' | 'database'
  }> {
    try {
      // Get database university ID from blockchain_id
      const dbUniversityId = await this.getDbUniversityId(universityId)
      if (!dbUniversityId) {
        return {
          verified: false,
          isIssuer: false,
          source: 'database'
        }
      }
      
      const isIssuerOnChain = await checkIsIssuerOnChain(universityId, walletAddress)
      
      // Update database
      await sql`
        UPDATE issuers 
        SET is_active = ${isIssuerOnChain}, blockchain_verified = true, last_verified_at = NOW()
        WHERE university_id = ${dbUniversityId} AND wallet_address = ${walletAddress.toLowerCase()}
      `

      return {
        verified: true,
        isIssuer: isIssuerOnChain,
        source: 'blockchain'
      }
    } catch {
      // Fall back to database
      const dbUniversityId = await this.getDbUniversityId(universityId)
      if (!dbUniversityId) {
        return {
          verified: false,
          isIssuer: false,
          source: 'database'
        }
      }
      
      const dbResult = await sql`
        SELECT is_active FROM issuers 
        WHERE university_id = ${dbUniversityId} AND wallet_address = ${walletAddress.toLowerCase()}
      `
      
      return {
        verified: false,
        isIssuer: dbResult.length > 0 && dbResult[0].is_active,
        source: 'database'
      }
    }
  }

  /**
   * Verify a single revoker against blockchain
   */
  async verifyRevoker(universityId: number, walletAddress: string): Promise<{
    verified: boolean
    isRevoker: boolean
    source: 'blockchain' | 'database'
  }> {
    try {
      // Get database university ID from blockchain_id
      const dbUniversityId = await this.getDbUniversityId(universityId)
      if (!dbUniversityId) {
        return {
          verified: false,
          isRevoker: false,
          source: 'database'
        }
      }
      
      const isRevokerOnChain = await checkIsRevokerOnChain(universityId, walletAddress)
      
      // Update database
      await sql`
        UPDATE revokers 
        SET is_active = ${isRevokerOnChain}, blockchain_verified = true, last_verified_at = NOW()
        WHERE university_id = ${dbUniversityId} AND wallet_address = ${walletAddress.toLowerCase()}
      `

      return {
        verified: true,
        isRevoker: isRevokerOnChain,
        source: 'blockchain'
      }
    } catch {
      // Fall back to database
      const dbUniversityId = await this.getDbUniversityId(universityId)
      if (!dbUniversityId) {
        return {
          verified: false,
          isRevoker: false,
          source: 'database'
        }
      }
      
      const dbResult = await sql`
        SELECT is_active FROM revokers 
        WHERE university_id = ${dbUniversityId} AND wallet_address = ${walletAddress.toLowerCase()}
      `
      
      return {
        verified: false,
        isRevoker: dbResult.length > 0 && dbResult[0].is_active,
        source: 'database'
      }
    }
  }

  /**
   * Sync degrees for a university from blockchain
   */
  async syncDegreesForUniversity(universityId: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      entityType: 'degrees',
      entityId: universityId,
      added: 0,
      updated: 0,
      removed: 0,
      errors: []
    }

    try {
      console.log(`[BlockchainSync] Fetching degrees for university ${universityId} from blockchain...`)
      
      // CRITICAL: Look up database university ID from blockchain_id
      // The degrees table has a foreign key to universities.id (not blockchain_id)
      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
      `
      
      if (dbUniversity.length === 0) {
        console.warn(`[BlockchainSync] University with blockchain_id=${universityId} not found in database. Syncing university first...`)
        // Try to sync the university first
        const uniSyncResult = await this.syncUniversity(universityId)
        if (!uniSyncResult.success) {
          result.errors.push(`University ${universityId} not found in database and sync failed`)
          return result
        }
        // Retry lookup after sync
        const retryDbUniversity = await sql`
          SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
        `
        if (retryDbUniversity.length === 0) {
          result.errors.push(`University ${universityId} still not found in database after sync`)
          return result
        }
        var dbUniversityId = retryDbUniversity[0].id
      } else {
        var dbUniversityId = dbUniversity[0].id
      }
      
      console.log(`[BlockchainSync] Found database university ID: ${dbUniversityId} for blockchain_id: ${universityId}`)
      
      const degrees = await fetchDegreesForUniversity(universityId)
      console.log(`[BlockchainSync] Found ${degrees.length} degrees for university ${universityId}`)
      
      for (const degree of degrees) {
        try {
          // Check if degree exists in DB
          const existing = await sql`
            SELECT * FROM degrees WHERE token_id = ${String(degree.tokenId)}
          `

          if (existing.length === 0) {
            // Insert new degree
            console.log(`[BlockchainSync] Inserting degree ${degree.tokenId} into database...`)
            
            // Map blockchain data to database schema
            // Schema: student_address, degree_type, major, student_name, graduation_date, cgpa
            // Blockchain: owner, level/degreeNameEn, majorEn, nameEn, year, gpa
            const graduationDate = degree.year ? new Date(degree.year, 0, 1).toISOString().split('T')[0] : null
            const degreeType = degree.degreeNameEn || (degree.level ? `Level ${degree.level}` : 'Bachelor')
            
            await sql`
              INSERT INTO degrees (
                token_id, university_id, student_address, student_name, student_name_ar,
                degree_type, major, major_ar, graduation_date, cgpa,
                is_revoked, blockchain_verified, last_verified_at
              ) VALUES (
                ${String(degree.tokenId)}, ${dbUniversityId}, ${degree.owner?.toLowerCase() || ''},
                ${degree.nameEn || null}, ${degree.nameAr || null},
                ${degreeType}, ${degree.majorEn || null}, ${degree.majorAr || null},
                ${graduationDate}, ${degree.gpa || null},
                ${degree.isRevoked || false}, true, NOW()
              )
            `
            console.log(`[BlockchainSync] ✅ Successfully inserted degree ${degree.tokenId}`)
            result.added++
          } else {
            // Update existing degree
            console.log(`[BlockchainSync] Updating existing degree ${degree.tokenId} in database...`)
            
            // Map blockchain data to database schema
            const graduationDate = degree.year ? new Date(degree.year, 0, 1).toISOString().split('T')[0] : existing[0].graduation_date
            const degreeType = degree.degreeNameEn || (degree.level ? `Level ${degree.level}` : existing[0].degree_type || 'Bachelor')
            
            await sql`
              UPDATE degrees 
              SET university_id = ${dbUniversityId},
                  student_name = ${degree.nameEn || existing[0].student_name},
                  student_name_ar = ${degree.nameAr || existing[0].student_name_ar},
                  degree_type = ${degreeType},
                  major = ${degree.majorEn || existing[0].major},
                  major_ar = ${degree.majorAr || existing[0].major_ar},
                  cgpa = ${degree.gpa || existing[0].cgpa},
                  graduation_date = ${graduationDate},
                  is_revoked = ${degree.isRevoked || false},
                  blockchain_verified = true,
                  last_verified_at = NOW()
              WHERE token_id = ${String(degree.tokenId)}
            `
            console.log(`[BlockchainSync] ✅ Successfully updated degree ${degree.tokenId}`)
            result.updated++
          }
        } catch (err) {
          console.error(`[BlockchainSync] ❌ Error syncing degree ${degree.tokenId}:`, err)
          result.errors.push(`Failed to sync degree ${degree.tokenId}: ${err}`)
        }
      }

      console.log(`[BlockchainSync] ✅ Completed syncing degrees for university ${universityId}: added=${result.added}, updated=${result.updated}`)
      await transactionManager.logSync('degrees', universityId, 'sync', undefined, undefined, 'completed').catch(() => {})
      result.success = true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(errorMsg)
      await transactionManager.logSync('degrees', universityId, 'sync', undefined, undefined, 'failed', errorMsg)
    }

    return result
  }

  /**
   * Verify a single degree against blockchain
   */
  async verifyDegree(tokenId: number): Promise<{
    verified: boolean
    exists: boolean
    isRevoked: boolean
    data?: Record<string, unknown>
    source: 'blockchain' | 'database'
  }> {
    try {
      const degree = await fetchDegreeFromBlockchain(tokenId)
      
      if (!degree) {
        return {
          verified: true,
          exists: false,
          isRevoked: false,
          source: 'blockchain'
        }
      }

      // Update database
      await sql`
        UPDATE degrees 
        SET is_revoked = ${degree.isRevoked || false},
            blockchain_verified = true,
            last_verified_at = NOW()
        WHERE token_id = ${tokenId}
      `

      return {
        verified: true,
        exists: true,
        isRevoked: degree.isRevoked || false,
        data: degree as unknown as Record<string, unknown>,
        source: 'blockchain'
      }
    } catch {
      // Fall back to database
      const dbResult = await sql`
        SELECT * FROM degrees WHERE token_id = ${tokenId}
      `
      
      if (dbResult.length === 0) {
        return {
          verified: false,
          exists: false,
          isRevoked: false,
          source: 'database'
        }
      }

      return {
        verified: false,
        exists: true,
        isRevoked: dbResult[0].is_revoked,
        data: dbResult[0] as Record<string, unknown>,
        source: 'database'
      }
    }
  }

  /**
   * Fetch and sync verifiers for a university from blockchain
   * Fetches from blockchain FIRST, then syncs to DB
   */
  async syncVerifiersForUniversity(universityId: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      entityType: 'verifiers',
      entityId: universityId,
      added: 0,
      updated: 0,
      removed: 0,
      errors: []
    }

    try {
      // CRITICAL: Get database university ID from blockchain_id
      const dbUniversityId = await this.getDbUniversityId(universityId)
      if (!dbUniversityId) {
        result.errors.push(`University ${universityId} not found in database`)
        return result
      }
      
      console.log(`[BlockchainSync] Fetching verifiers for university ${universityId} from blockchain...`)
      
      // STEP 1: Fetch ALL verifiers from blockchain (source of truth)
      const { getUniversityVerifiers } = await import("@/lib/blockchain")
      const blockchainVerifiers = await getUniversityVerifiers(universityId)
      console.log(`[BlockchainSync] Found ${blockchainVerifiers.length} verifiers on blockchain for university ${universityId}`)
      
      const blockchainVerifierSet = new Set(blockchainVerifiers.map((v: string) => v.toLowerCase()))

      // STEP 2: Get existing verifiers from database
      const dbVerifiers = await sql`
        SELECT * FROM verifiers WHERE university_id = ${dbUniversityId}
      `
      const dbVerifierMap = new Map(dbVerifiers.map((v: any) => [v.wallet_address.toLowerCase(), v]))

      // STEP 3: Insert new verifiers that don't exist in DB
      for (const verifierAddress of blockchainVerifiers) {
        const normalizedAddress = verifierAddress.toLowerCase()
        const existing = dbVerifierMap.get(normalizedAddress)
        
        if (!existing) {
          // New verifier - insert into DB
          try {
            console.log(`[BlockchainSync] Inserting new verifier ${normalizedAddress} for university ${universityId}...`)
            await sql`
              INSERT INTO verifiers (
                university_id, wallet_address, is_active, blockchain_verified, last_verified_at, created_at
              ) VALUES (
                ${dbUniversityId}, ${normalizedAddress}, true, true, NOW(), NOW()
              )
            `
            console.log(`[BlockchainSync] ✅ Successfully inserted verifier ${normalizedAddress}`)
            result.added++
          } catch (err: any) {
            console.error(`[BlockchainSync] ❌ Error inserting verifier ${normalizedAddress}:`, err)
            result.errors.push(`Failed to insert verifier ${normalizedAddress}: ${err.message}`)
          }
        } else {
          // Existing verifier - update if needed
          if (!existing.is_active || !existing.blockchain_verified) {
            try {
              await sql`
                UPDATE verifiers 
                SET is_active = true, blockchain_verified = true, last_verified_at = NOW()
                WHERE id = ${existing.id}
              `
              result.updated++
            } catch (err: any) {
              result.errors.push(`Failed to update verifier ${normalizedAddress}: ${err.message}`)
            }
          } else {
            // Just update verification timestamp
            await sql`
              UPDATE verifiers 
              SET last_verified_at = NOW()
              WHERE id = ${existing.id}
            `
          }
        }
      }

      // STEP 4: Deactivate verifiers that are no longer on blockchain
      for (const dbVerifier of dbVerifiers) {
        const normalizedAddress = dbVerifier.wallet_address.toLowerCase()
        if (!blockchainVerifierSet.has(normalizedAddress) && dbVerifier.is_active) {
          try {
            console.log(`[BlockchainSync] Deactivating verifier ${normalizedAddress} (no longer on blockchain)`)
            await sql`
              UPDATE verifiers 
              SET is_active = false, blockchain_verified = true, last_verified_at = NOW()
              WHERE id = ${dbVerifier.id}
            `
            result.removed++
          } catch (err: any) {
            result.errors.push(`Failed to deactivate verifier ${normalizedAddress}: ${err.message}`)
          }
        }
      }

      console.log(`[BlockchainSync] ✅ Completed syncing verifiers for university ${universityId}: added=${result.added}, updated=${result.updated}, removed=${result.removed}`)
      
      // Log final DB count for verification
      const finalCount = await sql`
        SELECT COUNT(*) as count FROM verifiers WHERE university_id = ${dbUniversityId} AND is_active = true
      `.then(r => Number(r[0]?.count || 0))
      console.log(`[BlockchainSync] 📊 Final DB count for university ${universityId}: ${finalCount} active verifiers`)
      await transactionManager.logSync('verifiers', universityId, 'sync', undefined, undefined, 'completed')
      result.success = true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[BlockchainSync] ❌ Error syncing verifiers for university ${universityId}:`, error)
      result.errors.push(errorMsg)
      await transactionManager.logSync('verifiers', universityId, 'sync', undefined, undefined, 'failed', errorMsg)
    }

    return result
  }

  /**
   * Verify a single verifier against blockchain
   */
  async verifyVerifier(universityId: number, walletAddress: string): Promise<{
    verified: boolean
    isVerifier: boolean
    source: 'blockchain' | 'database'
  }> {
    try {
      // Get database university ID from blockchain_id
      const dbUniversityId = await this.getDbUniversityId(universityId)
      if (!dbUniversityId) {
        return {
          verified: false,
          isVerifier: false,
          source: 'database'
        }
      }
      
      const isVerifierOnChain = await checkIsVerifierOnChain(universityId, walletAddress)
      
      // Update database
      await sql`
        UPDATE verifiers 
        SET is_active = ${isVerifierOnChain}, blockchain_verified = true, last_verified_at = NOW()
        WHERE university_id = ${dbUniversityId} AND wallet_address = ${walletAddress.toLowerCase()}
      `

      return {
        verified: true,
        isVerifier: isVerifierOnChain,
        source: 'blockchain'
      }
    } catch {
      // Fall back to database
      const dbUniversityId = await this.getDbUniversityId(universityId)
      if (!dbUniversityId) {
        return {
          verified: false,
          isVerifier: false,
          source: 'database'
        }
      }
      
      const dbResult = await sql`
        SELECT is_active FROM verifiers 
        WHERE university_id = ${dbUniversityId} AND wallet_address = ${walletAddress.toLowerCase()}
      `
      
      return {
        verified: false,
        isVerifier: dbResult.length > 0 && dbResult[0].is_active,
        source: 'database'
      }
    }
  }

  /**
   * Sync a single degree (alias for verifyDegree for consistency)
   */
  async syncDegree(tokenId: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      entityType: 'degree',
      entityId: tokenId,
      added: 0,
      updated: 0,
      removed: 0,
      errors: []
    }

    try {
      const degree = await fetchDegreeFromBlockchain(tokenId)
      
      if (!degree) {
        result.errors.push(`Degree ${tokenId} not found on blockchain`)
        return result
      }

      const universityId = Number(degree.universityId)
      
      // CRITICAL: Ensure university exists in DB before syncing degree
      // If university doesn't exist on-chain, create placeholder
      try {
        const university = await fetchUniversityFromBlockchain(universityId)
        if (!university || !university.exists) {
          console.warn(`[BlockchainSync] University ${universityId} doesn't exist on-chain, creating placeholder`)
          // Create placeholder university entry
          await sql`
            INSERT INTO universities (blockchain_id, name, name_en, is_active, blockchain_verified)
            VALUES (${universityId}, ${`University ${universityId}`}, ${`University ${universityId}`}, false, false)
            ON CONFLICT (blockchain_id) DO NOTHING
          `
        } else {
          // Sync the university properly
          await this.syncUniversity(universityId)
        }
      } catch (uniError: any) {
        console.warn(`[BlockchainSync] Could not sync university ${universityId} for degree ${tokenId}:`, uniError.message)
        // Create placeholder anyway
        try {
          // ✅ FIX: Try with name_en, fallback without it
          try {
            await sql`
              INSERT INTO universities (blockchain_id, name, name_en, is_active, blockchain_verified)
              VALUES (${universityId}, ${`University ${universityId}`}, ${`University ${universityId}`}, false, false)
              ON CONFLICT (blockchain_id) DO NOTHING
            `
          } catch (insertError: any) {
            if (insertError?.code === '42703' && insertError?.message?.includes('name_en')) {
              await sql`
                INSERT INTO universities (blockchain_id, name, is_active, blockchain_verified)
                VALUES (${universityId}, ${`University ${universityId}`}, false, false)
                ON CONFLICT (blockchain_id) DO NOTHING
              `
            } else {
              throw insertError
            }
          }
        } catch {}
      }

      // Get university ID from DB (might be placeholder)
      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
      `
      const dbUniversityId = dbUniversity.length > 0 ? dbUniversity[0].id : null

      if (!dbUniversityId) {
        result.errors.push(`Could not find or create university ${universityId} in database`)
        return result
      }

      // Fetch owner address
      const { fetchDegreeOwner } = await import("@/lib/blockchain")
      let ownerAddress: string | null = null
      try {
        ownerAddress = await fetchDegreeOwner(tokenId)
      } catch {
        // Owner fetch failed, continue without it
      }

      // Check if degree exists in DB
      const existing = await sql`
        SELECT * FROM degrees WHERE token_id = ${tokenId}
      `

      if (existing.length === 0) {
        // Insert new degree
        console.log(`[BlockchainSync] Inserting degree ${tokenId} into database...`)
        
        // Map blockchain data to database schema
        const graduationDate = degree.year ? new Date(degree.year, 0, 1).toISOString().split('T')[0] : null
        const degreeType = degree.degreeNameEn || (degree.level ? `Level ${degree.level}` : 'Bachelor')
        
        await sql`
          INSERT INTO degrees (
            token_id, university_id, student_address, student_name, student_name_ar,
            degree_type, major, major_ar, graduation_date, cgpa,
            is_revoked, blockchain_verified, last_verified_at
          ) VALUES (
            ${String(tokenId)}, ${dbUniversityId}, ${ownerAddress?.toLowerCase() || ''},
            ${degree.nameEn || null}, ${degree.nameAr || null},
            ${degreeType}, ${degree.majorEn || null}, ${degree.majorAr || null},
            ${graduationDate}, ${degree.gpa || null},
            ${degree.isRevoked || false}, true, NOW()
          )
        `
        console.log(`[BlockchainSync] ✅ Successfully inserted degree ${tokenId}`)
        result.added = 1
      } else {
        // Update existing degree
        console.log(`[BlockchainSync] Updating existing degree ${tokenId} in database...`)
        
        // Map blockchain data to database schema
        const graduationDate = degree.year ? new Date(degree.year, 0, 1).toISOString().split('T')[0] : existing[0].graduation_date
        const degreeType = degree.degreeNameEn || (degree.level ? `Level ${degree.level}` : existing[0].degree_type || 'Bachelor')
        
        await sql`
          UPDATE degrees 
          SET university_id = ${dbUniversityId},
              student_name = ${degree.nameEn || existing[0].student_name},
              student_name_ar = ${degree.nameAr || existing[0].student_name_ar},
              degree_type = ${degreeType},
              major = ${degree.majorEn || existing[0].major},
              major_ar = ${degree.majorAr || existing[0].major_ar},
              cgpa = ${degree.gpa || existing[0].cgpa},
              graduation_date = ${graduationDate},
              is_revoked = ${degree.isRevoked || false},
              blockchain_verified = true,
              last_verified_at = NOW()
          WHERE token_id = ${String(tokenId)}
        `
        console.log(`[BlockchainSync] ✅ Successfully updated degree ${tokenId}`)
        result.updated = 1
      }

      result.success = true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(errorMsg)
    }

    return result
  }

  /**
   * Full sync of all data for a university
   */
  async fullSyncUniversity(universityId: number): Promise<{
    university: SyncResult
    issuers: SyncResult
    revokers: SyncResult
    verifiers: SyncResult
    degrees: SyncResult
  }> {
    const university = await this.syncUniversity(universityId)
    const issuers = await this.syncIssuersForUniversity(universityId)
    const revokers = await this.syncRevokersForUniversity(universityId)
    const verifiers = await this.syncVerifiersForUniversity(universityId)
    const degrees = await this.syncDegreesForUniversity(universityId)

    return {
      university,
      issuers,
      revokers,
      verifiers,
      degrees
    }
  }

  /**
   * Comprehensive full sync - syncs ALL blockchain data
   * This ensures everything is in sync: universities, issuers, revokers, verifiers, degrees, requests
   */
  async performComprehensiveFullSync(): Promise<{
    universities: { added: number; updated: number; errors: string[] }
    issuers: { added: number; updated: number; errors: string[] }
    revokers: { added: number; updated: number; errors: string[] }
    verifiers: { added: number; updated: number; errors: string[] }
    degrees: { added: number; updated: number; errors: string[] }
    requests: { degreeRequests: number; revocationRequests: number; errors: string[] }
  }> {
    console.log("[BlockchainSync] Starting comprehensive full sync of ALL blockchain data...")
    
    const result = {
      universities: { added: 0, updated: 0, errors: [] as string[] },
      issuers: { added: 0, updated: 0, errors: [] as string[] },
      revokers: { added: 0, updated: 0, errors: [] as string[] },
      verifiers: { added: 0, updated: 0, errors: [] as string[] },
      degrees: { added: 0, updated: 0, errors: [] as string[] },
      requests: { degreeRequests: 0, revocationRequests: 0, errors: [] as string[] }
    }

    try {
      // Step 1: Sync all universities
      console.log("[BlockchainSync] Step 1: Syncing all universities...")
      const { fetchAllUniversities } = await import("@/lib/blockchain")
      const universities = await fetchAllUniversities()
      
      console.log(`[BlockchainSync] Found ${universities.length} universities to sync`)
      
      for (let i = 0; i < universities.length; i++) {
        const uni = universities[i]
        try {
          const uniId = Number(uni.id)
          
          // ✅ Tier-aware delay (Free: 2s, Paid: 500ms - set RPC_PAID_TIER=true)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, getSyncDelayUniversity()))
          }
          
          console.log(`[BlockchainSync] Syncing university ${uniId} (${i + 1}/${universities.length}): ${uni.nameEn || uni.nameAr || 'Unnamed'}`)
          
          // ✅ Use the university data we already fetched instead of calling fetchUniversityFromBlockchain again
          // This avoids rate limiting issues - we already have the data from fetchAllUniversities
          const syncResult = await this.syncUniversityFromData(uniId, {
            id: uni.id,
            admin: uni.admin,
            nameAr: uni.nameAr,
            nameEn: uni.nameEn,
            exists: uni.exists,
            isActive: uni.isActive
          })
          result.universities.added += syncResult.added
          result.universities.updated += syncResult.updated
          result.universities.errors.push(...syncResult.errors)
          
          // Step 2: For each university, sync all related entities
          if (syncResult.success) {
            console.log(`[BlockchainSync] Syncing all entities for university ${uniId}...`)
            
            // Tier-aware delay before syncing entities
            await new Promise(resolve => setTimeout(resolve, getSyncDelayEntity()))
            
            // Sync issuers
            try {
              const issuersResult = await this.syncIssuersForUniversity(uniId)
              result.issuers.added += issuersResult.added
              result.issuers.updated += issuersResult.updated
              result.issuers.errors.push(...issuersResult.errors)
            } catch (err) {
              result.issuers.errors.push(`University ${uniId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
            }
            
            await new Promise(resolve => setTimeout(resolve, getSyncDelayEntity()))
            
            // Sync revokers
            try {
              const revokersResult = await this.syncRevokersForUniversity(uniId)
              result.revokers.added += revokersResult.added
              result.revokers.updated += revokersResult.updated
              result.revokers.errors.push(...revokersResult.errors)
            } catch (err) {
              result.revokers.errors.push(`University ${uniId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
            }
            
            await new Promise(resolve => setTimeout(resolve, getSyncDelayEntity()))
            
            // Sync verifiers
            try {
              const verifiersResult = await this.syncVerifiersForUniversity(uniId)
              result.verifiers.added += verifiersResult.added
              result.verifiers.updated += verifiersResult.updated
              result.verifiers.errors.push(...verifiersResult.errors)
            } catch (err) {
              result.verifiers.errors.push(`University ${uniId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
            }
            
            await new Promise(resolve => setTimeout(resolve, getSyncDelayEntity()))
            
            // Sync degrees
            try {
              const degreesResult = await this.syncDegreesForUniversity(uniId)
              result.degrees.added += degreesResult.added
              result.degrees.updated += degreesResult.updated
              result.degrees.errors.push(...degreesResult.errors)
            } catch (err) {
              result.degrees.errors.push(`University ${uniId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
            }
          } else {
            console.warn(`[BlockchainSync] ⚠️ University ${uniId} sync failed, skipping entity sync`)
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          console.error(`[BlockchainSync] ❌ Error syncing university ${uni.id}:`, errorMsg)
          result.universities.errors.push(`University ${uni.id}: ${errorMsg}`)
        }
      }

      // Step 3: Sync all requests (degree requests and revocation requests)
      // Note: Requests are indexed from events, but we can backfill by scanning events
      console.log("[BlockchainSync] Step 3: Syncing requests from chain_events...")
      try {
        const { syncAllRequestsFromEvents } = await import("./websocket-indexer")
        const requestsResult = await syncAllRequestsFromEvents()
        result.requests.degreeRequests = requestsResult.degreeRequests
        result.requests.revocationRequests = requestsResult.revocationRequests
        result.requests.errors.push(...requestsResult.errors)
      } catch (err) {
        result.requests.errors.push(`Requests sync: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      console.log("[BlockchainSync] ✅ Comprehensive full sync completed:", {
        universities: `${result.universities.added} added, ${result.universities.updated} updated`,
        issuers: `${result.issuers.added} added, ${result.issuers.updated} updated`,
        revokers: `${result.revokers.added} added, ${result.revokers.updated} updated`,
        verifiers: `${result.verifiers.added} added, ${result.verifiers.updated} updated`,
        degrees: `${result.degrees.added} added, ${result.degrees.updated} updated`,
        requests: `${result.requests.degreeRequests} degree requests, ${result.requests.revocationRequests} revocation requests`
      })

      return result
    } catch (error) {
      console.error("[BlockchainSync] ❌ Comprehensive full sync failed:", error)
      throw error
    }
  }

  /**
   * Get sync status for an entity
   */
  async getSyncStatus(entityType: string, entityId: number): Promise<{
    lastSyncedAt?: Date
    blockchainVerified: boolean
    pendingTransactions: number
  }> {
    try {
      // Get pending transactions count
      const pendingTx = await sql`
        SELECT COUNT(*) as count FROM pending_transactions 
        WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND status = 'pending'
      `

      // Get last sync log
      const lastSync = await sql`
        SELECT * FROM sync_logs 
        WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND status = 'completed'
        ORDER BY created_at DESC LIMIT 1
      `

      return {
        lastSyncedAt: lastSync.length > 0 ? new Date(lastSync[0].created_at) : undefined,
        blockchainVerified: lastSync.length > 0,
        pendingTransactions: Number(pendingTx[0]?.count || 0)
      }
    } catch {
      return {
        blockchainVerified: false,
        pendingTransactions: 0
      }
    }
  }
}

export const blockchainSync = new BlockchainSyncService()
