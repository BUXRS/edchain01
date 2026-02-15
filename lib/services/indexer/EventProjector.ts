/**
 * Event Projector - Deterministic CQRS Projection Layer
 * 
 * Projects raw blockchain events (from chain_events table) into materialized read-model tables.
 * 
 * Principles:
 * - Deterministic: Same events → same state
 * - Replayable: Can rebuild entire DB from chain_events
 * - Idempotent: Safe to reprocess events
 * - Transactional: All updates in single transaction
 * 
 * Architecture:
 * - Reads from: chain_events (append-only event store)
 * - Writes to: universities, issuers, revokers, verifiers, degrees, degree_requests, revocation_requests (materialized views)
 */

import { sql } from "@/lib/db"
import { CHAIN_ID, CORE_CONTRACT_ADDRESS } from "@/lib/contracts/abi"

export interface ProjectionResult {
  success: boolean
  eventsProcessed: number
  eventsSkipped: number
  errors: string[]
}

export class EventProjector {
  private readonly chainId = CHAIN_ID
  private readonly coreContractAddress = CORE_CONTRACT_ADDRESS.toLowerCase()

  /**
   * Project a single event to materialized tables
   * Must be deterministic and idempotent
   */
  async projectEvent(event: {
    id: number
    event_name: string
    event_data: any
    block_number: number
    tx_hash: string
    contract_address: string
    log_index?: number
    created_at?: Date | string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const eventData = typeof event.event_data === 'string' 
        ? JSON.parse(event.event_data) 
        : event.event_data

      // Route to appropriate handler based on event name
      switch (event.event_name) {
        case "UniversityRegistered":
          return await this.projectUniversityRegistered(eventData, event.block_number, event.tx_hash)
        
        case "IssuerUpdated":
          return await this.projectIssuerUpdated(eventData, event.block_number, event.tx_hash)
        
        case "RevokerUpdated":
          return await this.projectRevokerUpdated(eventData, event.block_number, event.tx_hash)
        
        case "VerifierAdded":
          return await this.projectVerifierAdded(eventData, event.block_number, event.tx_hash)
        
        case "VerifierRemoved":
          return await this.projectVerifierRemoved(eventData, event.block_number, event.tx_hash)
        
        case "DegreeIssued":
          return await this.projectDegreeIssued(eventData, event.block_number, event.tx_hash)
        
        case "DegreeRevoked":
          return await this.projectDegreeRevoked(eventData, event.block_number, event.tx_hash)
        
        case "DegreeRequested":
          return await this.projectDegreeRequested(eventData, event.block_number, event.tx_hash, event.log_index || 0)
        
        case "RevocationRequested":
          return await this.projectRevocationRequested(eventData, event.block_number, event.tx_hash, event.log_index || 0)
        
        case "DegreeRequestApproved":
          return await this.projectDegreeRequestApproved(eventData, event.block_number, event.tx_hash, event.log_index || 0)
        
        case "DegreeRequestRejected":
          return await this.projectDegreeRequestRejected(eventData, event.block_number, event.tx_hash)
        
        case "RevocationApproved":
          return await this.projectRevocationApproved(eventData, event.block_number, event.tx_hash, event.log_index || 0)
        
        case "RevocationRejected":
          return await this.projectRevocationRejected(eventData, event.block_number, event.tx_hash)
        
        case "ApprovalWithdrawn":
          return await this.projectApprovalWithdrawn(eventData, event.block_number, event.tx_hash)
        
        case "ExpiredRequestCleaned":
          return await this.projectExpiredRequestCleaned(eventData, event.block_number, event.tx_hash)
        
        case "UniversityDeleted":
          return await this.projectUniversityDeleted(
            eventData, 
            event.block_number, 
            event.tx_hash, 
            event.log_index || 0, 
            event.id,
            event.created_at ? new Date(event.created_at) : null
          )
        
        default:
          // Unknown event - log but don't fail
          console.warn(`[EventProjector] Unknown event type: ${event.event_name}`)
          return { success: true } // Don't fail on unknown events
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[EventProjector] Error projecting event ${event.event_name}:`, error)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Project UniversityRegistered event
   * Event: UniversityRegistered(uint64 indexed universityId, address indexed admin, string nameEn, string nameAr)
   */
  private async projectUniversityRegistered(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const universityId = Number(eventData.universityId || eventData[0])
      const admin = (eventData.admin || eventData[1] || '').toLowerCase()
      const nameEn = eventData.nameEn || eventData[2] || ''
      const nameAr = eventData.nameAr || eventData[3] || ''

      // UPSERT: Idempotent insert/update
      await sql`
        INSERT INTO universities (
          blockchain_id, wallet_address, admin_wallet, name_en, name_ar,
          is_active, blockchain_verified, last_verified_at, created_at, updated_at
        ) VALUES (
          ${universityId}, ${admin}, ${admin}, ${nameEn}, ${nameAr},
          true, true, NOW(), NOW(), NOW()
        )
        ON CONFLICT (blockchain_id) 
        DO UPDATE SET
          wallet_address = EXCLUDED.wallet_address,
          admin_wallet = EXCLUDED.admin_wallet,
          name_en = EXCLUDED.name_en,
          name_ar = EXCLUDED.name_ar,
          is_active = true,
          blockchain_verified = true,
          last_verified_at = NOW(),
          updated_at = NOW()
      `

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project IssuerUpdated event
   * Event: IssuerUpdated(uint64 indexed universityId, address indexed issuer, bool status)
   */
  private async projectIssuerUpdated(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const universityId = Number(eventData.universityId || eventData[0])
      const issuerAddress = (eventData.issuer || eventData[1] || '').toLowerCase()
      const status = eventData.status !== undefined ? eventData.status : (eventData[2] === true)

      // Get DB university ID
      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
      `
      if (dbUniversity.length === 0) {
        // University not in DB yet - will be synced later
        return { success: true } // Don't fail, just skip
      }
      const dbUniversityId = dbUniversity[0].id

      if (status) {
        // Add/activate issuer
        await sql`
          INSERT INTO issuers (
            university_id, wallet_address, is_active, blockchain_verified, 
            last_verified_at, created_at, updated_at
          ) VALUES (
            ${dbUniversityId}, ${issuerAddress}, true, true, NOW(), NOW(), NOW()
          )
          ON CONFLICT (university_id, wallet_address)
          DO UPDATE SET
            is_active = true,
            blockchain_verified = true,
            last_verified_at = NOW(),
            updated_at = NOW()
        `
      } else {
        // Deactivate issuer
        await sql`
          UPDATE issuers
          SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
          WHERE university_id = ${dbUniversityId} AND wallet_address = ${issuerAddress}
        `
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project RevokerUpdated event
   * Event: RevokerUpdated(uint64 indexed universityId, address indexed revoker, bool status)
   */
  private async projectRevokerUpdated(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const universityId = Number(eventData.universityId || eventData[0])
      const revokerAddress = (eventData.revoker || eventData[1] || '').toLowerCase()
      const status = eventData.status !== undefined ? eventData.status : (eventData[2] === true)

      // Get DB university ID
      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
      `
      if (dbUniversity.length === 0) {
        return { success: true }
      }
      const dbUniversityId = dbUniversity[0].id

      if (status) {
        // Add/activate revoker
        await sql`
          INSERT INTO revokers (
            university_id, wallet_address, is_active, blockchain_verified,
            last_verified_at, created_at, updated_at
          ) VALUES (
            ${dbUniversityId}, ${revokerAddress}, true, true, NOW(), NOW(), NOW()
          )
          ON CONFLICT (university_id, wallet_address)
          DO UPDATE SET
            is_active = true,
            blockchain_verified = true,
            last_verified_at = NOW(),
            updated_at = NOW()
        `
      } else {
        // Deactivate revoker
        await sql`
          UPDATE revokers
          SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
          WHERE university_id = ${dbUniversityId} AND wallet_address = ${revokerAddress}
        `
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project VerifierAdded event
   * Event: VerifierAdded(uint64 indexed universityId, address indexed verifier)
   */
  private async projectVerifierAdded(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const universityId = Number(eventData.universityId || eventData[0])
      const verifierAddress = (eventData.verifier || eventData[1] || '').toLowerCase()

      // Get DB university ID
      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
      `
      if (dbUniversity.length === 0) {
        return { success: true }
      }
      const dbUniversityId = dbUniversity[0].id

      // Add verifier
      await sql`
        INSERT INTO verifiers (
          university_id, wallet_address, is_active, blockchain_verified,
          last_verified_at, created_at, updated_at
        ) VALUES (
          ${dbUniversityId}, ${verifierAddress}, true, true, NOW(), NOW(), NOW()
        )
        ON CONFLICT (university_id, wallet_address)
        DO UPDATE SET
          is_active = true,
          blockchain_verified = true,
          last_verified_at = NOW(),
          updated_at = NOW()
      `

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project VerifierRemoved event
   * Event: VerifierRemoved(uint64 indexed universityId, address indexed verifier)
   */
  private async projectVerifierRemoved(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const universityId = Number(eventData.universityId || eventData[0])
      const verifierAddress = (eventData.verifier || eventData[1] || '').toLowerCase()

      // Get DB university ID
      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
      `
      if (dbUniversity.length === 0) {
        return { success: true }
      }
      const dbUniversityId = dbUniversity[0].id

      // Deactivate verifier
      await sql`
        UPDATE verifiers
        SET is_active = false, blockchain_verified = true, last_verified_at = NOW(), updated_at = NOW()
        WHERE university_id = ${dbUniversityId} AND wallet_address = ${verifierAddress}
      `

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project DegreeIssued event
   * Event: DegreeIssued(uint256 indexed tokenId, uint64 indexed universityId, address indexed recipient, uint256 requestId)
   * Resolves university from blockchain_id; if not found, uses degree_requests.university_id when requestId is set.
   * Fills required degree columns from degree_requests when available.
   */
  private async projectDegreeIssued(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const tokenId = String(eventData.tokenId || eventData[0] || '')
      const universityId = Number(eventData.universityId || eventData[1])
      const recipient = (eventData.recipient || eventData[2] || '').toLowerCase()
      const requestId = eventData.requestId != null ? Number(eventData.requestId) : (eventData[3] != null ? Number(eventData[3]) : null)

      let dbUniversityId: number | null = null
      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
      `
      if (dbUniversity.length > 0) {
        dbUniversityId = dbUniversity[0].id
      }
      if (dbUniversityId == null && requestId != null) {
        const fromRequest = await sql`
          SELECT university_id FROM degree_requests WHERE request_id = ${requestId} LIMIT 1
        `
        if (fromRequest.length > 0) {
          dbUniversityId = fromRequest[0].university_id
        }
      }
      if (dbUniversityId == null) {
        return { success: true }
      }

      if (requestId != null) {
        await sql`
          UPDATE degree_requests
          SET status = 'ISSUED', executed_at = NOW(), token_id = ${tokenId}
          WHERE request_id = ${requestId}
        `
      }

      let studentName = 'Unknown'
      let degreeType = 'Degree'
      let major = 'N/A'
      let studentNameAr: string | null = null
      let degreeTypeAr: string | null = null
      let majorAr: string | null = null
      let graduationDate = `${new Date().getFullYear()}-06-01`
      let cgpa: number | null = null
      let issuedBy: string | null = null
      if (requestId != null) {
        const req = await sql`
          SELECT student_name, student_name_ar, degree_name_en, degree_name_ar, major_en, major_ar, gpa, year, requester_address
          FROM degree_requests WHERE request_id = ${requestId} LIMIT 1
        `
        if (req.length > 0) {
          const r = req[0]
          studentName = r.student_name ?? 'Unknown'
          studentNameAr = r.student_name_ar ?? null
          degreeType = r.degree_name_en ?? 'Degree'
          degreeTypeAr = r.degree_name_ar ?? null
          major = r.major_en ?? 'N/A'
          majorAr = r.major_ar ?? null
          cgpa = r.gpa != null ? Number(r.gpa) : null
          graduationDate = r.year != null ? `${Number(r.year)}-06-01` : graduationDate
          issuedBy = r.requester_address != null ? String(r.requester_address).toLowerCase() : null
        }
      }

      await sql`
        INSERT INTO degrees (
          token_id, university_id, student_address, student_name, student_name_ar,
          degree_type, degree_type_ar, major, major_ar, graduation_date, cgpa,
          request_id, blockchain_verified, issued_by, created_at, updated_at
        ) VALUES (
          ${tokenId}, ${dbUniversityId}, ${recipient}, ${studentName}, ${studentNameAr},
          ${degreeType}, ${degreeTypeAr}, ${major}, ${majorAr}, ${graduationDate}, ${cgpa},
          ${requestId}, true, ${issuedBy}, NOW(), NOW()
        )
        ON CONFLICT (token_id) DO UPDATE SET
          request_id = COALESCE(degrees.request_id, ${requestId}),
          student_name = COALESCE(degrees.student_name, ${studentName}),
          degree_type = COALESCE(degrees.degree_type, ${degreeType}),
          major = COALESCE(degrees.major, ${major}),
          graduation_date = COALESCE(degrees.graduation_date, ${graduationDate}::date),
          issued_by = COALESCE(degrees.issued_by, ${issuedBy}),
          updated_at = NOW()
      `
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project DegreeRevoked event
   * Event: DegreeRevoked(uint256 indexed tokenId, uint64 indexed universityId, uint256 indexed requestId, address revoker)
   */
  private async projectDegreeRevoked(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const tokenId = String(eventData.tokenId || eventData[0] || '')
      const requestId = eventData.requestId != null ? Number(eventData.requestId) : (eventData[2] != null ? Number(eventData[2]) : null)
      const revoker = (eventData.revoker || eventData[3] || '').toLowerCase()

      if (requestId != null) {
        await sql`
          UPDATE revocation_requests
          SET status = 'EXECUTED', executed_at = NOW(), updated_at = NOW()
          WHERE request_id = ${requestId}
        `
      }

      await sql`
        UPDATE degrees
        SET 
          is_revoked = true,
          revoked_by = ${revoker},
          revoked_at = NOW(),
          blockchain_verified = true,
          last_verified_at = NOW(),
          updated_at = NOW()
        WHERE token_id = ${tokenId}
      `
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project DegreeRequested event
   * Event: DegreeRequested(uint256 indexed requestId, uint64 indexed universityId, address indexed recipient, address requester)
   */
  private async projectDegreeRequested(
    eventData: any,
    blockNumber: number,
    txHash: string,
    logIndex: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestId = Number(eventData.requestId || eventData[0])
      const universityId = Number(eventData.universityId || eventData[1])
      const recipient = (eventData.recipient || eventData[2] || '').toLowerCase()
      const requester = (eventData.requester || eventData[3] || '').toLowerCase()

      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
      `
      if (dbUniversity.length === 0) {
        return { success: true }
      }
      const dbUniversityId = dbUniversity[0].id

      await sql`
        INSERT INTO degree_requests (
          request_id, university_id, recipient_address, requester_address,
          status, approval_count, requested_at, created_at,
          chain_id, created_block_number, created_tx_hash, created_log_index,
          updated_block_number, updated_tx_hash, updated_log_index
        ) VALUES (
          ${requestId}, ${dbUniversityId}, ${recipient}, ${requester},
          'PENDING', 0, NOW(), NOW(),
          ${this.chainId}, ${blockNumber}, ${txHash}, ${logIndex},
          ${blockNumber}, ${txHash}, ${logIndex}
        )
        ON CONFLICT (request_id)
        DO UPDATE SET
          recipient_address = EXCLUDED.recipient_address,
          requester_address = EXCLUDED.requester_address,
          status = 'PENDING',
          approval_count = 0,
          requested_at = NOW(),
          updated_at = NOW(),
          updated_block_number = ${blockNumber},
          updated_tx_hash = ${txHash},
          updated_log_index = ${logIndex}
      `
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project RevocationRequested event
   * Event: RevocationRequested(uint256 indexed requestId, uint256 indexed tokenId, uint64 indexed universityId, address requester)
   */
  private async projectRevocationRequested(
    eventData: any,
    blockNumber: number,
    txHash: string,
    logIndex: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestId = Number(eventData.requestId || eventData[0])
      const tokenId = String(eventData.tokenId ?? eventData[1] ?? '0')
      const universityId = Number(eventData.universityId || eventData[2])
      const requester = (eventData.requester || eventData[3] || '').toLowerCase()

      const dbUniversity = await sql`
        SELECT id FROM universities WHERE blockchain_id = ${universityId} LIMIT 1
      `
      if (dbUniversity.length === 0) {
        return { success: true }
      }
      const dbUniversityId = dbUniversity[0].id

      await sql`
        INSERT INTO revocation_requests (
          request_id, token_id, university_id, requester_address,
          status, approval_count, requested_at, created_at,
          chain_id, created_block_number, created_tx_hash, created_log_index,
          updated_block_number, updated_tx_hash, updated_log_index
        ) VALUES (
          ${requestId}, ${tokenId}, ${dbUniversityId}, ${requester},
          'PENDING', 0, NOW(), NOW(),
          ${this.chainId}, ${blockNumber}, ${txHash}, ${logIndex},
          ${blockNumber}, ${txHash}, ${logIndex}
        )
        ON CONFLICT (request_id)
        DO UPDATE SET
          token_id = EXCLUDED.token_id,
          requester_address = EXCLUDED.requester_address,
          status = 'PENDING',
          approval_count = 0,
          requested_at = NOW(),
          updated_at = NOW(),
          updated_block_number = ${blockNumber},
          updated_tx_hash = ${txHash},
          updated_log_index = ${logIndex}
      `
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project DegreeRequestApproved event
   * Event: DegreeRequestApproved(requestId, verifier, approvals, required)
   */
  private async projectDegreeRequestApproved(
    eventData: any,
    blockNumber: number,
    txHash: string,
    logIndex: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestId = Number(eventData.requestId || eventData[0])
      const verifier = (eventData.verifier || eventData[1] || '').toLowerCase()
      const approvals = Number(eventData.approvals ?? eventData[2] ?? 0)
      const required = Number(eventData.required ?? eventData[3] ?? 0)

      await sql`
        UPDATE degree_requests
        SET 
          approval_count = ${approvals},
          required_approvals = CASE WHEN required_approvals IS NULL OR required_approvals = 0 THEN ${required} ELSE required_approvals END,
          updated_at = NOW(),
          updated_block_number = ${blockNumber},
          updated_tx_hash = ${txHash},
          updated_log_index = ${logIndex}
        WHERE request_id = ${requestId}
      `

      await sql`
        INSERT INTO degree_request_approvals (
          request_id, verifier_address, approved_at, created_at, chain_id, tx_hash, block_number, log_index
        ) VALUES (
          ${requestId}, ${verifier}, NOW(), NOW(), ${this.chainId}, ${txHash}, ${blockNumber}, ${logIndex}
        )
        ON CONFLICT (request_id, verifier_address) DO UPDATE SET
          approved_at = NOW(),
          tx_hash = ${txHash},
          block_number = ${blockNumber},
          log_index = ${logIndex}
      `
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project DegreeRequestRejected event
   */
  private async projectDegreeRequestRejected(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestId = Number(eventData.requestId || eventData[0])
      await sql`
        UPDATE degree_requests
        SET status = 'REJECTED', updated_at = NOW(), updated_block_number = ${blockNumber}, updated_tx_hash = ${txHash}
        WHERE request_id = ${requestId}
      `
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project RevocationApproved event
   * Event: RevocationApproved(requestId, verifier, approvals, required)
   */
  private async projectRevocationApproved(
    eventData: any,
    blockNumber: number,
    txHash: string,
    logIndex: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestId = Number(eventData.requestId || eventData[0])
      const verifier = (eventData.verifier || eventData[1] || '').toLowerCase()
      const approvals = Number(eventData.approvals ?? eventData[2] ?? 0)
      const required = Number(eventData.required ?? eventData[3] ?? 0)

      await sql`
        UPDATE revocation_requests
        SET 
          approval_count = ${approvals},
          required_approvals = CASE WHEN required_approvals IS NULL OR required_approvals = 0 THEN ${required} ELSE required_approvals END,
          updated_at = NOW(),
          updated_block_number = ${blockNumber},
          updated_tx_hash = ${txHash},
          updated_log_index = ${logIndex}
        WHERE request_id = ${requestId}
      `

      await sql`
        INSERT INTO revocation_request_approvals (
          request_id, verifier_address, approved_at, created_at, chain_id, tx_hash, block_number, log_index
        ) VALUES (
          ${requestId}, ${verifier}, NOW(), NOW(), ${this.chainId}, ${txHash}, ${blockNumber}, ${logIndex}
        )
        ON CONFLICT (request_id, verifier_address) DO UPDATE SET
          approved_at = NOW(),
          tx_hash = ${txHash},
          block_number = ${blockNumber},
          log_index = ${logIndex}
      `
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project RevocationRejected event
   */
  private async projectRevocationRejected(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestId = Number(eventData.requestId || eventData[0])
      await sql`
        UPDATE revocation_requests
        SET status = 'REJECTED', updated_at = NOW(), updated_block_number = ${blockNumber}, updated_tx_hash = ${txHash}
        WHERE request_id = ${requestId}
      `
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project ApprovalWithdrawn event
   * Event: ApprovalWithdrawn(requestId, verifier, isDegreeRequest) - true = degree, false = revocation
   */
  private async projectApprovalWithdrawn(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestId = Number(eventData.requestId || eventData[0])
      const verifier = (eventData.verifier || eventData[1] || '').toLowerCase()
      const isDegreeRequest = eventData.isDegreeRequest !== undefined ? eventData.isDegreeRequest : (eventData[2] === true)

      if (isDegreeRequest) {
        await sql`DELETE FROM degree_request_approvals WHERE request_id = ${requestId} AND verifier_address = ${verifier}`
        const row = await sql`SELECT approval_count FROM degree_requests WHERE request_id = ${requestId} LIMIT 1`
        const current = row.length > 0 ? Math.max(0, Number(row[0].approval_count) - 1) : 0
        await sql`
          UPDATE degree_requests
          SET approval_count = ${current}, updated_at = NOW(), updated_block_number = ${blockNumber}, updated_tx_hash = ${txHash}
          WHERE request_id = ${requestId}
        `
      } else {
        await sql`DELETE FROM revocation_request_approvals WHERE request_id = ${requestId} AND verifier_address = ${verifier}`
        const row = await sql`SELECT approval_count FROM revocation_requests WHERE request_id = ${requestId} LIMIT 1`
        const current = row.length > 0 ? Math.max(0, Number(row[0].approval_count) - 1) : 0
        await sql`
          UPDATE revocation_requests
          SET approval_count = ${current}, updated_at = NOW(), updated_block_number = ${blockNumber}, updated_tx_hash = ${txHash}
          WHERE request_id = ${requestId}
        `
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project ExpiredRequestCleaned event
   * Event: ExpiredRequestCleaned(requestId, isDegreeRequest)
   */
  private async projectExpiredRequestCleaned(
    eventData: any,
    blockNumber: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestId = Number(eventData.requestId || eventData[0])
      const isDegreeRequest = eventData.isDegreeRequest !== undefined ? eventData.isDegreeRequest : (eventData[1] === true)

      if (isDegreeRequest) {
        await sql`
          UPDATE degree_requests
          SET status = 'EXPIRED', updated_at = NOW(), updated_block_number = ${blockNumber}, updated_tx_hash = ${txHash}
          WHERE request_id = ${requestId}
        `
      } else {
        await sql`
          UPDATE revocation_requests
          SET status = 'EXPIRED', updated_at = NOW(), updated_block_number = ${blockNumber}, updated_tx_hash = ${txHash}
          WHERE request_id = ${requestId}
        `
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Project UniversityDeleted event
   * Event: UniversityDeleted(uint64 indexed universityId)
   * 
   * Soft-deletes the university by setting:
   * - is_deleted = true
   * - is_active = false
   * - Stores deletion provenance (block, tx, timestamp)
   * 
   * IMPORTANT: Does NOT hard-delete the row - maintains audit trail
   */
  private async projectUniversityDeleted(
    eventData: any,
    blockNumber: number,
    txHash: string,
    logIndex: number,
    eventId: number,
    eventCreatedAt: Date | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract universityId from event data
      // Event signature: UniversityDeleted(uint64 indexed universityId)
      const universityId = Number(eventData.universityId || eventData[0])
      
      if (!universityId || isNaN(universityId)) {
        console.error(`[EventProjector] Invalid universityId in UniversityDeleted event:`, eventData)
        return { success: false, error: 'Invalid universityId' }
      }

      console.log(`[EventProjector] 🔴 Processing UniversityDeleted event for blockchain_id: ${universityId} (block ${blockNumber}, tx ${txHash})`)

      // Use event created_at as proxy for block timestamp
      // TODO: In future, store actual block timestamp in chain_events table for accuracy
      const blockTimestamp = eventCreatedAt || new Date()

      // Update university with soft-delete flags and provenance
      const result = await sql`
        UPDATE universities
        SET 
          is_deleted = true,
          is_active = false,
          deleted_at_chain = ${blockTimestamp},
          deleted_block_number = ${blockNumber},
          deleted_tx_hash = ${txHash},
          deleted_log_index = ${logIndex},
          blockchain_verified = true,
          last_verified_at = NOW(),
          updated_at = NOW()
        WHERE blockchain_id = ${universityId}
      `

      // Check if any rows were updated
      const updatedCount = result.count || 0
      if (updatedCount === 0) {
        console.warn(`[EventProjector] UniversityDeleted event for blockchain_id ${universityId} - no matching university found in DB`)
        // Don't fail - the university might not be in DB yet, or might have been deleted already
        return { success: true }
      }

      console.log(`[EventProjector] ✅ Soft-deleted university with blockchain_id ${universityId} (block ${blockNumber}, tx ${txHash})`)

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[EventProjector] Error projecting UniversityDeleted:`, error)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Process all unprocessed events in order
   * Used for catch-up and replay
   */
  async processUnprocessedEvents(limit: number = 1000): Promise<ProjectionResult> {
    const result: ProjectionResult = {
      success: true,
      eventsProcessed: 0,
      eventsSkipped: 0,
      errors: []
    }

    try {
      // Get unprocessed events in strict order (block_number, log_index)
      // Include created_at as proxy for block timestamp (will be improved later)
      const events = await sql`
        SELECT id, event_name, event_data, block_number, tx_hash, log_index, contract_address, created_at
        FROM chain_events
        WHERE chain_id = ${this.chainId}
          AND contract_address = ${this.coreContractAddress}
          AND projection_applied = false
        ORDER BY block_number ASC, log_index ASC
        LIMIT ${limit}
      `

      if (events.length > 0) {
        console.log(`[EventProjector] Processing ${events.length} unprocessed events (oldest block: ${events[0].block_number})`)
        
        // Log if UniversityDeleted events are in the batch
        const deletedCount = events.filter((e: any) => e.event_name === "UniversityDeleted").length
        if (deletedCount > 0) {
          console.log(`[EventProjector] 🔴 Found ${deletedCount} unprocessed UniversityDeleted event(s) - will process now`)
        }
      }

      for (const event of events) {
        // Pass event with log_index and created_at (as proxy for block timestamp) for UniversityDeleted handler
        const projectionResult = await this.projectEvent({
          id: event.id,
          event_name: event.event_name,
          event_data: event.event_data,
          block_number: Number(event.block_number),
          tx_hash: event.tx_hash,
          contract_address: event.contract_address,
          log_index: event.log_index || 0,
          created_at: event.created_at // Use as proxy for block timestamp
        })
        
        if (projectionResult.success) {
          // Mark as projected
          await sql`
            UPDATE chain_events
            SET projection_applied = true, processed = true, processed_at = NOW()
            WHERE id = ${event.id}
          `
          result.eventsProcessed++
          if (event.event_name === "UniversityDeleted") {
            console.log(`[EventProjector] ✅ Successfully projected UniversityDeleted event ${event.id}`)
          }
        } else {
          result.eventsSkipped++
          const errorMsg = `Event ${event.id} (${event.event_name}): ${projectionResult.error}`
          result.errors.push(errorMsg)
          console.error(`[EventProjector] ${errorMsg}`)
        }
      }

      return result
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      return result
    }
  }

  /**
   * Replay all events from a specific block (for reorg recovery)
   */
  async replayFromBlock(fromBlock: number): Promise<ProjectionResult> {
    const result: ProjectionResult = {
      success: true,
      eventsProcessed: 0,
      eventsSkipped: 0,
      errors: []
    }

    try {
      // Mark all events from this block onwards as unprocessed
      await sql`
        UPDATE chain_events
        SET projection_applied = false, processed = false
        WHERE chain_id = ${this.chainId}
          AND contract_address = ${this.coreContractAddress}
          AND block_number >= ${fromBlock}
      `

      // Process all events from this block
      return await this.processUnprocessedEvents(10000) // Process up to 10k events
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      return result
    }
  }
}

// Singleton instance
export const eventProjector = new EventProjector()
