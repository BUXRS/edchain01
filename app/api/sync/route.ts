/**
 * Sync API - Blockchain to Database Synchronization
 * 
 * Endpoints for syncing data between blockchain (source of truth) and database (cache)
 */

import { type NextRequest, NextResponse } from "next/server"
import { blockchainSync } from "@/lib/services/blockchain-sync"
import { transactionManager } from "@/lib/services/transaction-manager"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const universityId = searchParams.get("universityId")
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")

    // If no action, return general sync status
    if (!action) {
      const { sql } = await import("@/lib/db")
      const { getIndexerStatus } = await import("@/lib/services/websocket-indexer")
      
      const syncStatus = await sql`
        SELECT * FROM sync_status WHERE id = 1
      `.then(r => r[0] || null).catch(() => null)
      
      const indexerStatus = getIndexerStatus()
      
      return NextResponse.json({
        indexer: indexerStatus,
        database: syncStatus,
        message: "Use ?action=status&entityType=X&entityId=Y for specific entity status"
      })
    }

    // Get sync status for specific entity
    if (action === "status" && entityType && entityId) {
      const status = await blockchainSync.getSyncStatus(entityType, Number(entityId))
      return NextResponse.json(status)
    }

    // Get recent sync logs
    if (action === "logs") {
      const logs = await transactionManager.getRecentSyncLogs(50)
      return NextResponse.json({ logs })
    }

    // Get pending transactions for a wallet
    if (action === "pending") {
      const wallet = searchParams.get("wallet")
      if (!wallet) {
        return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
      }
      const pending = await transactionManager.getPendingTransactionsForWallet(wallet)
      return NextResponse.json({ transactions: pending })
    }

    return NextResponse.json({ 
      error: "Invalid action. Valid actions: status, logs, pending" 
    }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to get sync info",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, universityId, tokenId, wallet } = body

    switch (action) {
      case "university": {
        if (!universityId) {
          return NextResponse.json({ error: "universityId is required" }, { status: 400 })
        }
        const result = await blockchainSync.syncUniversity(universityId)
        return NextResponse.json({ success: result.success, result })
      }

      case "all_universities": {
        const result = await blockchainSync.syncAllUniversities()
        return NextResponse.json({ success: result.success, result })
      }

      case "issuers": {
        if (!universityId) {
          return NextResponse.json({ error: "universityId is required" }, { status: 400 })
        }
        const result = await blockchainSync.syncIssuersForUniversity(universityId)
        return NextResponse.json({ success: result.success, result })
      }

      case "revokers": {
        if (!universityId) {
          return NextResponse.json({ error: "universityId is required" }, { status: 400 })
        }
        const result = await blockchainSync.syncRevokersForUniversity(universityId)
        return NextResponse.json({ success: result.success, result })
      }

      case "degrees": {
        if (!universityId) {
          return NextResponse.json({ error: "universityId is required" }, { status: 400 })
        }
        const result = await blockchainSync.syncDegreesForUniversity(universityId)
        return NextResponse.json({ success: result.success, result })
      }

      case "full_university": {
        if (!universityId) {
          return NextResponse.json({ error: "universityId is required" }, { status: 400 })
        }
        const result = await blockchainSync.fullSyncUniversity(universityId)
        return NextResponse.json({ 
          success: result.university.success && result.issuers.success && 
                   result.revokers.success && result.degrees.success,
          result 
        })
      }

      case "comprehensive_full_sync": {
        console.log("[API] Starting comprehensive full sync of ALL blockchain data...")
        const result = await blockchainSync.performComprehensiveFullSync()
        return NextResponse.json({ 
          success: true,
          message: "Comprehensive full sync completed",
          result 
        })
      }

      case "verify_issuer": {
        if (!universityId || !wallet) {
          return NextResponse.json({ error: "universityId and wallet are required" }, { status: 400 })
        }
        const result = await blockchainSync.verifyIssuer(universityId, wallet)
        return NextResponse.json(result)
      }

      case "verify_revoker": {
        if (!universityId || !wallet) {
          return NextResponse.json({ error: "universityId and wallet are required" }, { status: 400 })
        }
        const result = await blockchainSync.verifyRevoker(universityId, wallet)
        return NextResponse.json(result)
      }

      case "verify_degree": {
        if (!tokenId) {
          return NextResponse.json({ error: "tokenId is required" }, { status: 400 })
        }
        const result = await blockchainSync.verifyDegree(tokenId)
        return NextResponse.json(result)
      }

      case "confirm_transaction": {
        const { txHash, blockNumber, gasUsed } = body
        if (!txHash || !blockNumber) {
          return NextResponse.json({ error: "txHash and blockNumber are required" }, { status: 400 })
        }
        
        await transactionManager.confirmTransaction(txHash, blockNumber, gasUsed)
        
        // Also sync the entity after confirmation
        const tx = await transactionManager.getTransaction(txHash)
        if (tx) {
          await transactionManager.syncEntityAfterConfirmation(tx)
        }
        
        return NextResponse.json({ success: true, message: "Transaction confirmed and entity synced" })
      }

      case "fail_transaction": {
        const { txHash, errorMessage } = body
        if (!txHash) {
          return NextResponse.json({ error: "txHash is required" }, { status: 400 })
        }
        
        await transactionManager.failTransaction(txHash, errorMessage || "Unknown error")
        return NextResponse.json({ success: true, message: "Transaction marked as failed" })
      }

      default:
        return NextResponse.json({ 
          error: "Invalid action. Valid actions: university, all_universities, issuers, revokers, degrees, full_university, verify_issuer, verify_revoker, verify_degree, confirm_transaction, fail_transaction" 
        }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Sync failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
