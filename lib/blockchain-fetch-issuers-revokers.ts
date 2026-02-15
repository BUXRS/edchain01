/**
 * Fetch Issuers and Revokers from Blockchain Events
 * 
 * Since the contract doesn't expose getIssuers()/getRevokers() functions,
 * we fetch them by scanning blockchain events (IssuerUpdated, RevokerUpdated).
 */

import { getReadOnlyProvider } from "./blockchain"
import { getActiveContractAddress } from "./contracts/abi"
import { CORE_CONTRACT_ABI } from "./contracts/abi-core"
import { Interface } from "ethers"

/**
 * ✅ RATE LIMIT PROTECTION: Check if error is a rate limit error
 */
function isRateLimitError(error: any): boolean {
  if (!error) return false
  
  // Infura rate limit error code: -32005
  const errorCode = error?.code || error?.info?.error?.code || error?.error?.code
  const errorMessage = (error?.message || error?.info?.error?.message || error?.error?.message || "").toLowerCase()
  
  // Check for Infura-specific rate limit error
  if (errorCode === -32005 || errorCode === "-32005") {
    return true
  }
  
  // Check for "Too Many Requests" message
  if (errorMessage.includes("too many requests") || errorMessage.includes("rate limit")) {
    return true
  }
  
  // Check for rate limit in nested error structure
  if (error?.info?.error?.code === -32005 || error?.error?.code === -32005) {
    return true
  }
  
  return false
}

/**
 * Fetch all issuers for a university from blockchain events
 */
export async function fetchIssuersFromBlockchainEvents(
  universityId: number,
  fromBlock?: number,
  toBlock?: number
): Promise<string[]> {
  try {
    const provider = getReadOnlyProvider()
    const contractAddress = getActiveContractAddress()
    
    // Get contract deployment block if fromBlock not provided
    // Use a SHORT default range to avoid Infura rate limits (429 / -32005).
    // Callers can pass a larger range for full historical sync if needed.
    if (!fromBlock) {
      const currentBlock = await provider.getBlockNumber()
      // Default: last 50k blocks (~2.5 days on Base). Reduces eth_getLogs from 100 chunks to 5.
      const DEFAULT_BLOCK_WINDOW = 50_000
      fromBlock = Math.max(0, currentBlock - DEFAULT_BLOCK_WINDOW)
    }

    if (!toBlock) {
      toBlock = await provider.getBlockNumber()
    }

    // Chunk large block ranges to avoid RPC errors
    // Public Base RPC allows 10,000+ blocks, but we'll use 10,000 for safety
    // If using Alchemy Free tier, change this to 10 (Alchemy Free tier limit)
    const MAX_BLOCK_RANGE = 10_000 // Process 10k blocks at a time (works with public Base RPC)
    const allLogs: any[] = []
    
    // Create contract interface to decode events
    const iface = new Interface(CORE_CONTRACT_ABI)
    const eventTopic = iface.getEvent("IssuerUpdated").topicHash
    const universityIdTopic = "0x" + BigInt(universityId).toString(16).padStart(64, "0")
    
    const totalBlocks = toBlock - fromBlock + 1
    const totalChunks = Math.ceil(totalBlocks / MAX_BLOCK_RANGE)
    let processedChunks = 0
    
    // Process in chunks with retry logic
    for (let start = fromBlock; start <= toBlock; start += MAX_BLOCK_RANGE) {
      const end = Math.min(start + MAX_BLOCK_RANGE - 1, toBlock)
      processedChunks++
      
      let retries = 3
      let chunkLogs: any[] = []
      
      while (retries > 0) {
        try {
          chunkLogs = await provider.getLogs({
            address: contractAddress,
            topics: [
              eventTopic,
              universityIdTopic,
              null, // issuer address (any)
            ],
            fromBlock: start,
            toBlock: end,
          })
          break // Success, exit retry loop
        } catch (error: any) {
          // ✅ RATE LIMIT DETECTION: Check for Infura rate limit errors
          const isRateLimit = isRateLimitError(error)
          
          if (isRateLimit) {
            console.error(`[FetchIssuers] ⚠️ Rate limit detected (Infura -32005) for blocks ${start}-${end}`)
            console.error(`[FetchIssuers] Stopping fetch to prevent further rate limiting. Please wait before retrying.`)
            // Stop processing to prevent further rate limits
            throw new Error(`Rate limit exceeded: ${error?.message || "Too Many Requests"}`)
          }
          
          retries--
          if (retries === 0) {
            console.warn(`[FetchIssuers] Failed to fetch logs for blocks ${start}-${end} after 3 retries:`, error.message)
            // Continue to next chunk instead of failing completely
            break
          }
          // Exponential backoff (longer delays for rate limit protection)
          const waitTime = isRateLimit ? Math.min(Math.pow(2, 4 - retries) * 2000, 30000) : 1000 * (4 - retries)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
      
      allLogs.push(...chunkLogs)
      
      // Progress logging for large ranges
      if (processedChunks % 100 === 0) {
        console.log(`[FetchIssuers] Progress: ${processedChunks}/${totalChunks} chunks (${Math.round(processedChunks / totalChunks * 100)}%)`)
      }
      
      // ✅ RATE LIMIT PROTECTION: Increased delay between chunks significantly
      // Infura free tier: ~1.16 requests/second, so we need at least 1 second between requests
      if (end < toBlock) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds between chunks (was 200ms)
      }
    }
    
    const logs = allLogs

    const issuers: Set<string> = new Set()
    
    // Decode each log
    for (const log of logs) {
      try {
        const decoded = iface.decodeEventLog("IssuerUpdated", log.data, log.topics)
        const eventUniId = Number(decoded.universityId)
        const issuerAddress = decoded.issuer.toLowerCase()
        const status = decoded.status
        
        // Double-check it's for the right university
        if (eventUniId === universityId) {
          if (status === true) {
            // Only add if status is true (active)
            issuers.add(issuerAddress)
          } else {
            // Remove if status is false (deactivated)
            issuers.delete(issuerAddress)
          }
        }
      } catch (decodeError) {
        console.warn(`[FetchIssuers] Error decoding log:`, decodeError)
      }
    }

    // Also check current state for any issuers that might have been added but events missed
    // We can't scan all addresses, but we can verify known addresses from DB
    // For now, return what we found in events

    return Array.from(issuers)
  } catch (error) {
    console.error(`[FetchIssuers] Error fetching issuers for university ${universityId}:`, error)
    return []
  }
}

/**
 * Fetch all revokers for a university from blockchain events
 */
export async function fetchRevokersFromBlockchainEvents(
  universityId: number,
  fromBlock?: number,
  toBlock?: number
): Promise<string[]> {
  try {
    const provider = getReadOnlyProvider()
    const contractAddress = getActiveContractAddress()
    
    // Use a short default range to avoid Infura rate limits (same as issuers)
    if (!fromBlock) {
      const currentBlock = await provider.getBlockNumber()
      const DEFAULT_BLOCK_WINDOW = 50_000
      fromBlock = Math.max(0, currentBlock - DEFAULT_BLOCK_WINDOW)
    }

    if (!toBlock) {
      toBlock = await provider.getBlockNumber()
    }

    const MAX_BLOCK_RANGE = 10_000
    const allLogs: any[] = []

    const iface = new Interface(CORE_CONTRACT_ABI)
    const eventTopic = iface.getEvent("RevokerUpdated").topicHash
    const universityIdTopic = "0x" + BigInt(universityId).toString(16).padStart(64, "0")
    
    const totalBlocks = toBlock - fromBlock + 1
    const totalChunks = Math.ceil(totalBlocks / MAX_BLOCK_RANGE)
    let processedChunks = 0
    
    // Process in chunks with retry logic
    for (let start = fromBlock; start <= toBlock; start += MAX_BLOCK_RANGE) {
      const end = Math.min(start + MAX_BLOCK_RANGE - 1, toBlock)
      processedChunks++
      
      let retries = 3
      let chunkLogs: any[] = []
      
      while (retries > 0) {
        try {
          chunkLogs = await provider.getLogs({
            address: contractAddress,
            topics: [
              eventTopic,
              universityIdTopic,
              null, // revoker address (any)
            ],
            fromBlock: start,
            toBlock: end,
          })
          break
        } catch (error: any) {
          retries--
          if (retries === 0) {
            console.warn(`[FetchRevokers] Failed to fetch logs for blocks ${start}-${end} after 3 retries:`, error.message)
            break
          }
          // ✅ RATE LIMIT DETECTION: Check for Infura rate limit errors
          const isRateLimit = isRateLimitError(error)
          
          if (isRateLimit) {
            console.error(`[FetchRevokers] ⚠️ Rate limit detected (Infura -32005) for blocks ${start}-${end}`)
            console.error(`[FetchRevokers] Stopping fetch to prevent further rate limiting. Please wait before retrying.`)
            throw new Error(`Rate limit exceeded: ${error?.message || "Too Many Requests"}`)
          }
          
          const waitTime = isRateLimit ? Math.min(Math.pow(2, 4 - retries) * 2000, 30000) : 1000 * (4 - retries)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
      
      allLogs.push(...chunkLogs)
      
      // Progress logging for large ranges
      if (processedChunks % 100 === 0) {
        console.log(`[FetchRevokers] Progress: ${processedChunks}/${totalChunks} chunks (${Math.round(processedChunks / totalChunks * 100)}%)`)
      }
      
      // ✅ RATE LIMIT PROTECTION: Increased delay between chunks significantly
      if (end < toBlock) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds between chunks (was 200ms)
      }
    }
    
    const logs = allLogs

    const revokers: Set<string> = new Set()
    
    // Decode each log
    for (const log of logs) {
      try {
        const decoded = iface.decodeEventLog("RevokerUpdated", log.data, log.topics)
        const eventUniId = Number(decoded.universityId)
        const revokerAddress = decoded.revoker.toLowerCase()
        const status = decoded.status
        
        // Double-check it's for the right university
        if (eventUniId === universityId) {
          if (status === true) {
            // Only add if status is true (active)
            revokers.add(revokerAddress)
          } else {
            // Remove if status is false (deactivated)
            revokers.delete(revokerAddress)
          }
        }
      } catch (decodeError) {
        console.warn(`[FetchRevokers] Error decoding log:`, decodeError)
      }
    }

    return Array.from(revokers)
  } catch (error) {
    console.error(`[FetchRevokers] Error fetching revokers for university ${universityId}:`, error)
    return []
  }
}

/**
 * Fetch all issuers and revokers for all universities
 * Used for initial migration
 */
export async function fetchAllIssuersAndRevokersFromEvents(
  fromBlock?: number,
  toBlock?: number
): Promise<{
  [universityId: number]: {
    issuers: string[]
    revokers: string[]
  }
}> {
  try {
    const provider = getReadOnlyProvider()
    const contractAddress = getActiveContractAddress()
    
    // Use a short default range to avoid Infura rate limits
    if (!fromBlock) {
      const currentBlock = await provider.getBlockNumber()
      const DEFAULT_BLOCK_WINDOW = 50_000
      fromBlock = Math.max(0, currentBlock - DEFAULT_BLOCK_WINDOW)
    }

    if (!toBlock) {
      toBlock = await provider.getBlockNumber()
    }

    const result: {
      [universityId: number]: {
        issuers: string[]
        revokers: string[]
      }
    } = {}

    const iface = new Interface(CORE_CONTRACT_ABI)
    const issuerTopic = iface.getEvent("IssuerUpdated").topicHash
    const revokerTopic = iface.getEvent("RevokerUpdated").topicHash
    
    // ✅ RATE LIMIT PROTECTION: Reduced block range for Infura free tier
    const MAX_BLOCK_RANGE = 1_000 // Process 1k blocks at a time (reduced from 10k for Infura)
    const issuerLogs: any[] = []
    const revokerLogs: any[] = []
    
    const totalBlocks = toBlock - fromBlock + 1
    const totalChunks = Math.ceil(totalBlocks / MAX_BLOCK_RANGE)
    let processedChunks = 0
    
    // Fetch IssuerUpdated events in chunks
    for (let start = fromBlock; start <= toBlock; start += MAX_BLOCK_RANGE) {
      const end = Math.min(start + MAX_BLOCK_RANGE - 1, toBlock)
      processedChunks++
      
      let retries = 3
      while (retries > 0) {
        try {
          const logs = await provider.getLogs({
            address: contractAddress,
            topics: [issuerTopic],
            fromBlock: start,
            toBlock: end,
          })
          issuerLogs.push(...logs)
          break
        } catch (error: any) {
          // ✅ RATE LIMIT DETECTION: Check for Infura rate limit errors
          const isRateLimit = isRateLimitError(error)
          
          if (isRateLimit) {
            console.error(`[FetchAll] ⚠️ Rate limit detected (Infura -32005) for IssuerUpdated blocks ${start}-${end}`)
            console.error(`[FetchAll] Stopping fetch to prevent further rate limiting.`)
            throw new Error(`Rate limit exceeded: ${error?.message || "Too Many Requests"}`)
          }
          
          retries--
          if (retries === 0) {
            console.warn(`[FetchAll] Failed to fetch IssuerUpdated logs for blocks ${start}-${end}:`, error.message)
            break
          }
          const waitTime = isRateLimit ? Math.min(Math.pow(2, 4 - retries) * 2000, 30000) : 1000 * (4 - retries)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
      
      // Progress logging for large ranges
      if (processedChunks % 100 === 0) {
        console.log(`[FetchAll] IssuerUpdated Progress: ${processedChunks}/${totalChunks} chunks (${Math.round(processedChunks / totalChunks * 100)}%)`)
      }
      
      // ✅ RATE LIMIT PROTECTION: Increased delay between chunks significantly
      if (end < toBlock) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds between chunks (was 200ms)
      }
    }
    
    // Reset counter for revoker logs
    processedChunks = 0
    
    // Fetch RevokerUpdated events in chunks
    for (let start = fromBlock; start <= toBlock; start += MAX_BLOCK_RANGE) {
      const end = Math.min(start + MAX_BLOCK_RANGE - 1, toBlock)
      processedChunks++
      
      let retries = 3
      while (retries > 0) {
        try {
          const logs = await provider.getLogs({
            address: contractAddress,
            topics: [revokerTopic],
            fromBlock: start,
            toBlock: end,
          })
          revokerLogs.push(...logs)
          break
        } catch (error: any) {
          // ✅ RATE LIMIT DETECTION: Check for Infura rate limit errors
          const isRateLimit = isRateLimitError(error)
          
          if (isRateLimit) {
            console.error(`[FetchAll] ⚠️ Rate limit detected (Infura -32005) for RevokerUpdated blocks ${start}-${end}`)
            console.error(`[FetchAll] Stopping fetch to prevent further rate limiting.`)
            throw new Error(`Rate limit exceeded: ${error?.message || "Too Many Requests"}`)
          }
          
          retries--
          if (retries === 0) {
            console.warn(`[FetchAll] Failed to fetch RevokerUpdated logs for blocks ${start}-${end}:`, error.message)
            break
          }
          const waitTime = isRateLimit ? Math.min(Math.pow(2, 4 - retries) * 2000, 30000) : 1000 * (4 - retries)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
      
      // Progress logging for large ranges
      if (processedChunks % 100 === 0) {
        console.log(`[FetchAll] RevokerUpdated Progress: ${processedChunks}/${totalChunks} chunks (${Math.round(processedChunks / totalChunks * 100)}%)`)
      }
      
      // ✅ RATE LIMIT PROTECTION: Increased delay between chunks significantly
      if (end < toBlock) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds between chunks (was 200ms)
      }
    }

    // Process issuer events
    for (const log of issuerLogs) {
      try {
        const decoded = iface.decodeEventLog("IssuerUpdated", log.data, log.topics)
        const universityId = Number(decoded.universityId)
        const issuerAddress = decoded.issuer.toLowerCase()
        const status = decoded.status

        if (!result[universityId]) {
          result[universityId] = { issuers: [], revokers: [] }
        }

        if (status === true) {
          if (!result[universityId].issuers.includes(issuerAddress)) {
            result[universityId].issuers.push(issuerAddress)
          }
        } else {
          // Remove if deactivated
          result[universityId].issuers = result[universityId].issuers.filter(
            addr => addr !== issuerAddress
          )
        }
      } catch (decodeError) {
        console.warn(`[FetchAll] Error decoding IssuerUpdated log:`, decodeError)
      }
    }

    // Process revoker events
    for (const log of revokerLogs) {
      try {
        const decoded = iface.decodeEventLog("RevokerUpdated", log.data, log.topics)
        const universityId = Number(decoded.universityId)
        const revokerAddress = decoded.revoker.toLowerCase()
        const status = decoded.status

        if (!result[universityId]) {
          result[universityId] = { issuers: [], revokers: [] }
        }

        if (status === true) {
          if (!result[universityId].revokers.includes(revokerAddress)) {
            result[universityId].revokers.push(revokerAddress)
          }
        } else {
          // Remove if deactivated
          result[universityId].revokers = result[universityId].revokers.filter(
            addr => addr !== revokerAddress
          )
        }
      } catch (decodeError) {
        console.warn(`[FetchAll] Error decoding RevokerUpdated log:`, decodeError)
      }
    }

    return result
  } catch (error) {
    console.error("[FetchAllIssuersRevokers] Error:", error)
    return {}
  }
}
