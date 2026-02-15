/**
 * Blockchain Link Utilities
 * 
 * Centralized functions for generating blockchain explorer and marketplace links
 * Supports contract upgrades and multiple contract versions
 */

import { getActiveContractAddress, CHAIN_ID } from "@/lib/contracts/abi"

// Base network configuration
export const BASE_NETWORK = {
  chainId: CHAIN_ID,
  name: "Base",
  basescanUrl: "https://basescan.org",
  openseaUrl: "https://opensea.io/assets/base",
  basescanApiUrl: "https://api.basescan.org/api",
}

/**
 * Get BaseScan URL for a transaction
 */
export function getBasescanTxUrl(txHash: string): string {
  return `${BASE_NETWORK.basescanUrl}/tx/${txHash}`
}

/**
 * Get BaseScan URL for a token/NFT – goes directly to the certificate (NFT) page
 * Format: https://basescan.org/nft/{contractAddress}/{tokenId}
 */
export function getBasescanTokenUrl(tokenId: number | string, contractAddress?: string): string {
  const address = contractAddress || getActiveContractAddress()
  return `${BASE_NETWORK.basescanUrl}/nft/${address}/${tokenId}`
}

/**
 * Get BaseScan URL for an NFT (certificate page) – same as getBasescanTokenUrl
 */
export function getBasescanNftUrl(tokenId: number | string, contractAddress?: string): string {
  return getBasescanTokenUrl(tokenId, contractAddress)
}

/**
 * Get OpenSea URL for an NFT
 * Format: https://opensea.io/assets/base/{contractAddress}/{tokenId}
 */
export function getOpenSeaUrl(tokenId: number | string, contractAddress?: string): string {
  const address = contractAddress || getActiveContractAddress()
  return `${BASE_NETWORK.openseaUrl}/${address}/${tokenId}`
}

/**
 * Get BaseScan URL for an address
 */
export function getBasescanAddressUrl(address: string): string {
  return `${BASE_NETWORK.basescanUrl}/address/${address}`
}

/**
 * Get BaseScan URL for a contract
 */
export function getBasescanContractUrl(contractAddress?: string): string {
  const address = contractAddress || getActiveContractAddress()
  return `${BASE_NETWORK.basescanUrl}/address/${address}`
}

/**
 * Get both BaseScan and OpenSea URLs for a token
 * Returns object with both links for easy use in components
 */
export function getTokenLinks(tokenId: number | string, contractAddress?: string) {
  return {
    basescan: getBasescanTokenUrl(tokenId, contractAddress),
    opensea: getOpenSeaUrl(tokenId, contractAddress),
    basescanNft: getBasescanNftUrl(tokenId, contractAddress),
  }
}

/**
 * Get both BaseScan and OpenSea URLs for a transaction
 * Note: OpenSea doesn't support transaction links, only NFT links
 */
export function getTxLinks(txHash: string) {
  return {
    basescan: getBasescanTxUrl(txHash),
    // OpenSea doesn't have transaction pages
  }
}
