/**
 * Transaction Manager Service
 * 
 * Handles the lifecycle of blockchain transactions:
 * 1. Create pending transaction record
 * 2. Monitor transaction status
 * 3. Update database on confirmation
 * 4. Handle failures and retries
 */

import { sql } from '@/lib/db'

export type TransactionAction = 
  | 'add_issuer' 
  | 'remove_issuer' 
  | 'add_revoker' 
  | 'remove_revoker'
  | 'issue_degree'
  | 'revoke_degree'
  | 'register_university'
  | 'update_university'

export type TransactionStatus = 'pending' | 'confirmed' | 'failed'

export interface PendingTransaction {
  id: number
  txHash: string
  action: TransactionAction
  entityType: string
  entityId?: number
  initiatedBy: string
  universityId?: number
  data?: Record<string, unknown>
  status: TransactionStatus
  blockNumber?: number
  gasUsed?: number
  errorMessage?: string
  createdAt: Date
  confirmedAt?: Date
}

export interface CreateTransactionParams {
  txHash: string
  action: TransactionAction
  entityType: string
  entityId?: number
  initiatedBy: string
  universityId?: number
  data?: Record<string, unknown>
}

export interface TransactionResult {
  success: boolean
  txHash: string
  blockNumber?: number
  gasUsed?: number
  error?: string
}

class TransactionManagerService {
  /**
   * Create a pending transaction record
   */
  async createPendingTransaction(params: CreateTransactionParams): Promise<PendingTransaction> {
    try {
      const result = await sql`
        INSERT INTO pending_transactions (
          tx_hash, action, entity_type, entity_id, initiated_by, university_id, data, status
        ) VALUES (
          ${params.txHash},
          ${params.action},
          ${params.entityType},
          ${params.entityId || null},
          ${params.initiatedBy},
          ${params.universityId || null},
          ${JSON.stringify(params.data || {})},
          'pending'
        )
        RETURNING *
      `
      
      if (result.length > 0) {
        return this.mapToTransaction(result[0])
      }
      
      throw new Error('Failed to create pending transaction')
    } catch (error) {
      // If DB fails, return a mock transaction object
      console.error('Failed to create pending transaction in DB:', error)
      return {
        id: 0,
        txHash: params.txHash,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        initiatedBy: params.initiatedBy,
        universityId: params.universityId,
        data: params.data,
        status: 'pending',
        createdAt: new Date()
      }
    }
  }

  /**
   * Get a pending transaction by hash
   */
  async getTransaction(txHash: string): Promise<PendingTransaction | null> {
    try {
      const result = await sql`
        SELECT * FROM pending_transactions WHERE tx_hash = ${txHash}
      `
      
      if (result.length > 0) {
        return this.mapToTransaction(result[0])
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Get all pending transactions for a wallet
   */
  async getPendingTransactionsForWallet(wallet: string): Promise<PendingTransaction[]> {
    try {
      const result = await sql`
        SELECT * FROM pending_transactions 
        WHERE initiated_by = ${wallet.toLowerCase()} AND status = 'pending'
        ORDER BY created_at DESC
      `
      return result.map(r => this.mapToTransaction(r))
    } catch {
      return []
    }
  }

  /**
   * Mark a transaction as confirmed
   */
  async confirmTransaction(
    txHash: string, 
    blockNumber: number, 
    gasUsed?: number
  ): Promise<void> {
    try {
      await sql`
        UPDATE pending_transactions 
        SET status = 'confirmed', 
            block_number = ${blockNumber},
            gas_used = ${gasUsed || null},
            confirmed_at = NOW()
        WHERE tx_hash = ${txHash}
      `
      
      // Log the sync
      const tx = await this.getTransaction(txHash)
      if (tx) {
        await this.logSync(tx.entityType, tx.entityId || 0, tx.action, txHash, blockNumber, 'completed')
      }
    } catch (error) {
      console.error('Failed to confirm transaction in DB:', error)
    }
  }

  /**
   * Mark a transaction as failed
   */
  async failTransaction(txHash: string, errorMessage: string): Promise<void> {
    try {
      await sql`
        UPDATE pending_transactions 
        SET status = 'failed', 
            error_message = ${errorMessage},
            confirmed_at = NOW()
        WHERE tx_hash = ${txHash}
      `
      
      // Log the failure
      const tx = await this.getTransaction(txHash)
      if (tx) {
        await this.logSync(tx.entityType, tx.entityId || 0, tx.action, txHash, null, 'failed', errorMessage)
      }
    } catch (error) {
      console.error('Failed to mark transaction as failed in DB:', error)
    }
  }

  /**
   * Log a sync operation
   */
  async logSync(
    entityType: string,
    entityId: number,
    action: string,
    txHash?: string,
    blockNumber?: number | null,
    status: 'pending' | 'completed' | 'failed' = 'pending',
    errorMessage?: string
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO sync_logs (entity_type, entity_id, action, tx_hash, block_number, status, error_message, completed_at)
        VALUES (
          ${entityType},
          ${entityId},
          ${action},
          ${txHash || null},
          ${blockNumber || null},
          ${status},
          ${errorMessage || null},
          ${status !== 'pending' ? new Date().toISOString() : null}
        )
      `
    } catch (error) {
      console.error('Failed to log sync:', error)
    }
  }

  /**
   * Get recent sync logs
   */
  async getRecentSyncLogs(limit: number = 50): Promise<Array<{
    id: number
    entityType: string
    entityId: number
    action: string
    txHash?: string
    status: string
    createdAt: Date
  }>> {
    try {
      const result = await sql`
        SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT ${limit}
      `
      return result.map(r => ({
        id: r.id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        action: r.action,
        txHash: r.tx_hash,
        status: r.status,
        createdAt: new Date(r.created_at)
      }))
    } catch {
      return []
    }
  }

  /**
   * Update entity after blockchain confirmation
   */
  async syncEntityAfterConfirmation(tx: PendingTransaction): Promise<void> {
    try {
      switch (tx.action) {
        case 'add_issuer':
          await this.syncIssuer(tx)
          break
        case 'remove_issuer':
          await this.removeIssuer(tx)
          break
        case 'add_revoker':
          await this.syncRevoker(tx)
          break
        case 'remove_revoker':
          await this.removeRevoker(tx)
          break
        case 'issue_degree':
          await this.syncDegree(tx)
          break
        case 'revoke_degree':
          await this.markDegreeRevoked(tx)
          break
        default:
          console.log(`Unknown action: ${tx.action}`)
      }
    } catch (error) {
      console.error('Failed to sync entity after confirmation:', error)
    }
  }

  private async syncIssuer(tx: PendingTransaction): Promise<void> {
    const data = tx.data as { wallet?: string }
    if (!data?.wallet || !tx.universityId) return

    await sql`
      INSERT INTO issuers (university_id, wallet_address, added_by, is_active, tx_hash, blockchain_verified, last_verified_at)
      VALUES (${tx.universityId}, ${data.wallet.toLowerCase()}, ${tx.initiatedBy}, true, ${tx.txHash}, true, NOW())
      ON CONFLICT (university_id, wallet_address) 
      DO UPDATE SET is_active = true, tx_hash = ${tx.txHash}, blockchain_verified = true, last_verified_at = NOW()
    `
  }

  private async removeIssuer(tx: PendingTransaction): Promise<void> {
    const data = tx.data as { wallet?: string }
    if (!data?.wallet || !tx.universityId) return

    await sql`
      UPDATE issuers 
      SET is_active = false, blockchain_verified = true, last_verified_at = NOW()
      WHERE university_id = ${tx.universityId} AND wallet_address = ${data.wallet.toLowerCase()}
    `
  }

  private async syncRevoker(tx: PendingTransaction): Promise<void> {
    const data = tx.data as { wallet?: string }
    if (!data?.wallet || !tx.universityId) return

    await sql`
      INSERT INTO revokers (university_id, wallet_address, added_by, is_active, tx_hash, blockchain_verified, last_verified_at)
      VALUES (${tx.universityId}, ${data.wallet.toLowerCase()}, ${tx.initiatedBy}, true, ${tx.txHash}, true, NOW())
      ON CONFLICT (university_id, wallet_address) 
      DO UPDATE SET is_active = true, tx_hash = ${tx.txHash}, blockchain_verified = true, last_verified_at = NOW()
    `
  }

  private async removeRevoker(tx: PendingTransaction): Promise<void> {
    const data = tx.data as { wallet?: string }
    if (!data?.wallet || !tx.universityId) return

    await sql`
      UPDATE revokers 
      SET is_active = false, blockchain_verified = true, last_verified_at = NOW()
      WHERE university_id = ${tx.universityId} AND wallet_address = ${data.wallet.toLowerCase()}
    `
  }

  private async syncDegree(tx: PendingTransaction): Promise<void> {
    const data = tx.data as { tokenId?: number; studentName?: string; recipient?: string }
    if (!data?.tokenId) return

    await sql`
      UPDATE degrees 
      SET tx_hash = ${tx.txHash}, blockchain_verified = true, last_verified_at = NOW()
      WHERE token_id = ${data.tokenId}
    `
  }

  private async markDegreeRevoked(tx: PendingTransaction): Promise<void> {
    const data = tx.data as { tokenId?: number }
    if (!data?.tokenId) return

    await sql`
      UPDATE degrees 
      SET is_revoked = true, revoked_by = ${tx.initiatedBy}, revoked_at = NOW(), 
          blockchain_verified = true, last_verified_at = NOW()
      WHERE token_id = ${data.tokenId}
    `
  }

  private mapToTransaction(row: Record<string, unknown>): PendingTransaction {
    return {
      id: row.id as number,
      txHash: row.tx_hash as string,
      action: row.action as TransactionAction,
      entityType: row.entity_type as string,
      entityId: row.entity_id as number | undefined,
      initiatedBy: row.initiated_by as string,
      universityId: row.university_id as number | undefined,
      data: row.data as Record<string, unknown> | undefined,
      status: row.status as TransactionStatus,
      blockNumber: row.block_number as number | undefined,
      gasUsed: row.gas_used as number | undefined,
      errorMessage: row.error_message as string | undefined,
      createdAt: new Date(row.created_at as string),
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at as string) : undefined
    }
  }
}

export const transactionManager = new TransactionManagerService()
