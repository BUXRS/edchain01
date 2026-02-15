/**
 * Contract Manager - Smart Contract Upgrade Support
 * 
 * Handles multiple contract versions, feature detection, and graceful upgrades
 * Supports contract address changes without breaking the app
 */

import { Contract, JsonRpcProvider } from "ethers"
import { 
  PROTOCOL_ABI, 
  PROTOCOL_ABI_V2, 
  getProtocolABI, 
  CHAIN_ID,
  CORE_CONTRACT_ADDRESS,
  READER_CONTRACT_ADDRESS,
  RENDER_CONTRACT_ADDRESS,
  getActiveContractAddress,
  getReaderContractAddress,
  getRenderContractAddress
} from "./abi"

// Contract version configuration
export interface ContractVersion {
  version: string
  address: string
  abi: any[]
  deployedAt?: number // Block number
  features?: string[] // List of available functions
}

// Get contract address from environment (supports multiple versions)
// V2 is now the default/active contract
// Uses new CORE contract address
export function getContractAddress(version: "v1" | "v2" = "v2"): string {
  // Always use new CORE contract address
  return getActiveContractAddress()
}

// Get all configured contract versions
export function getContractVersions(): ContractVersion[] {
  const versions: ContractVersion[] = []
  
  // V2 (new contract with verifier stage) - using new CORE address
  versions.push({
    version: "v2",
    address: getActiveContractAddress(),
    abi: PROTOCOL_ABI_V2, // V2 has different ABI with verifier functions
  })
  
  return versions
}

// Get contract instance for a specific version
export function getContractInstance(
  version: "v1" | "v2" = "v2",
  provider?: JsonRpcProvider
): Contract {
  const address = getContractAddress(version)
  const providerInstance = provider || getDefaultProvider()
  const abi = getProtocolABI(version)
  return new Contract(address, abi, providerInstance)
}

// Get default provider - uses centralized RPC configuration
function getDefaultProvider(): JsonRpcProvider {
  // Use centralized RPC provider for upgradable configuration
  const { getRpcHttpProvider } = require("@/lib/config/rpc-provider")
  return getRpcHttpProvider()
}

// Check if a contract has a specific feature/function
export async function hasContractFeature(
  contract: Contract,
  featureName: string
): Promise<boolean> {
  try {
    return contract.interface.hasFunction(featureName)
  } catch {
    return false
  }
}

// Check if a contract version supports a feature
export async function checkFeatureSupport(
  version: "v1" | "v2" = "v1",
  feature: string
): Promise<boolean> {
  try {
    const contract = getContractInstance(version)
    return await hasContractFeature(contract, feature)
  } catch {
    return false
  }
}

// Get the latest contract version available
export function getLatestContractVersion(): "v1" | "v2" {
  if (process.env.NEXT_PUBLIC_UNIVERSITY_REGISTRY_V2) {
    return "v2"
  }
  return "v1"
}

// Try to use a feature, falling back to older version if needed
export async function useFeatureWithFallback<T>(
  featureName: string,
  callFn: (contract: Contract) => Promise<T>,
  fallbackFn?: () => Promise<T>
): Promise<T> {
  // Try latest version first
  const latestVersion = getLatestContractVersion()
  const latestContract = getContractInstance(latestVersion)
  
  if (await hasContractFeature(latestContract, featureName)) {
    try {
      return await callFn(latestContract)
    } catch (error) {
      console.warn(`[Contract] Feature ${featureName} failed on ${latestVersion}, trying fallback`)
    }
  }
  
  // Try v1 if latest is v2
  if (latestVersion === "v2") {
    const v1Contract = getContractInstance("v1")
    if (await hasContractFeature(v1Contract, featureName)) {
      try {
        return await callFn(v1Contract)
      } catch (error) {
        console.warn(`[Contract] Feature ${featureName} failed on v1`)
      }
    }
  }
  
  // Use fallback if provided
  if (fallbackFn) {
    return await fallbackFn()
  }
  
  throw new Error(`Feature ${featureName} not available in any contract version`)
}

// Validate contract address format
export function isValidContractAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Get contract info (version, address, features)
export async function getContractInfo(version: "v1" | "v2" = "v1"): Promise<{
  version: string
  address: string
  chainId: number
  features: string[]
}> {
  const contract = getContractInstance(version)
  const address = getContractAddress(version)
  
  // Extract available functions from ABI
  const features = PROTOCOL_ABI
    .filter((item: any) => item.type === "function")
    .map((item: any) => item.name)
  
  return {
    version,
    address,
    chainId: CHAIN_ID,
    features,
  }
}
