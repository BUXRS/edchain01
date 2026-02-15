// Smart Contract ABIs for UniversityDegreeProtocol
// Import new contract ABIs
import { CORE_CONTRACT_ABI } from "./abi-core"
import { RENDER_CONTRACT_ABI } from "./abi-render"
import { READER_CONTRACT_ABI } from "./abi-reader"
// Legacy V2 ABI (for backward compatibility during transition)
import { PROTOCOL_ABI_V2 } from "./abi-v2"

// New contract addresses (final)
export const CORE_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CORE_CONTRACT_ADDRESS ||
  "0xBb51Dc84f0b35d3344f777543CA6549F9427B313") as `0x${string}`
export const RENDER_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_RENDER_CONTRACT_ADDRESS ||
  "0xC28ed1b3DD8AE49e7FC94cB15891524848f6ef42") as `0x${string}`
export const READER_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_READER_CONTRACT_ADDRESS ||
  "0x41c5ad012b71706Fc2a9510A17bB1f8Df857D275") as `0x${string}`

// Legacy exports for backward compatibility (deprecated - use new addresses above)
export const PROTOCOL_ADDRESS = CORE_CONTRACT_ADDRESS
export const RENDERER_ADDRESS = RENDER_CONTRACT_ADDRESS

export const CHAIN_ID = 8453

export const CONTRACT_ADDRESSES = {
  core: CORE_CONTRACT_ADDRESS,
  render: RENDER_CONTRACT_ADDRESS,
  reader: READER_CONTRACT_ADDRESS,
  // Legacy aliases
  degreeProtocol: CORE_CONTRACT_ADDRESS,
  renderer: RENDER_CONTRACT_ADDRESS,
} as const

export const PROTOCOL_ABI = [
  // View Functions
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextUniversityId",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextTokenId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    name: "universities",
    outputs: [
      { internalType: "address", name: "admin", type: "address" },
      { internalType: "string", name: "nameAr", type: "string" },
      { internalType: "string", name: "nameEn", type: "string" },
      { internalType: "bool", name: "exists", type: "bool" },
      { internalType: "bool", name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "universityId", type: "uint64" }],
    name: "getUniversity",
    outputs: [
      {
        components: [
          { internalType: "address", name: "admin", type: "address" },
          { internalType: "string", name: "nameAr", type: "string" },
          { internalType: "string", name: "nameEn", type: "string" },
          { internalType: "bool", name: "exists", type: "bool" },
          { internalType: "bool", name: "isActive", type: "bool" },
        ],
        internalType: "struct UniversityDegreeProtocol.University",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "", type: "uint64" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "issuers",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "", type: "uint64" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "revokers",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "universityId", type: "uint64" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "isIssuer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "universityId", type: "uint64" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "isRevoker",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getDegree",
    outputs: [
      {
        components: [
          { internalType: "uint64", name: "universityId", type: "uint64" },
          { internalType: "uint16", name: "gpa", type: "uint16" },
          { internalType: "uint16", name: "year", type: "uint16" },
          { internalType: "uint8", name: "level", type: "uint8" },
          { internalType: "bool", name: "isRevoked", type: "bool" },
          { internalType: "uint40", name: "issuedAt", type: "uint40" },
          { internalType: "uint40", name: "revokedAt", type: "uint40" },
          { internalType: "string", name: "nameAr", type: "string" },
          { internalType: "string", name: "nameEn", type: "string" },
          { internalType: "string", name: "facultyAr", type: "string" },
          { internalType: "string", name: "facultyEn", type: "string" },
          { internalType: "string", name: "majorAr", type: "string" },
          { internalType: "string", name: "majorEn", type: "string" },
        ],
        internalType: "struct UniversityDegreeProtocol.Degree",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "isValidDegree",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // Admin Functions (Owner only)
  {
    inputs: [
      { internalType: "address", name: "admin", type: "address" },
      { internalType: "string", name: "nameAr", type: "string" },
      { internalType: "string", name: "nameEn", type: "string" },
    ],
    name: "registerUniversity",
    outputs: [{ internalType: "uint64", name: "id", type: "uint64" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "universityId", type: "uint64" },
      { internalType: "bool", name: "isActive", type: "bool" },
    ],
    name: "setUniversityStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "universityId", type: "uint64" },
      { internalType: "address", name: "newAdmin", type: "address" },
    ],
    name: "updateUniversityAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // University Admin Functions
  {
    inputs: [
      { internalType: "uint64", name: "universityId", type: "uint64" },
      { internalType: "address", name: "issuer", type: "address" },
    ],
    name: "grantIssuer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "universityId", type: "uint64" },
      { internalType: "address", name: "issuer", type: "address" },
    ],
    name: "revokeIssuer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "universityId", type: "uint64" },
      { internalType: "address", name: "revoker", type: "address" },
    ],
    name: "grantRevoker",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "universityId", type: "uint64" },
      { internalType: "address", name: "revoker", type: "address" },
    ],
    name: "revokeRevoker",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Issuer Function
  {
    inputs: [
      { internalType: "uint64", name: "universityId", type: "uint64" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "string", name: "nameAr", type: "string" },
      { internalType: "string", name: "nameEn", type: "string" },
      { internalType: "string", name: "facultyAr", type: "string" },
      { internalType: "string", name: "facultyEn", type: "string" },
      { internalType: "string", name: "majorAr", type: "string" },
      { internalType: "string", name: "majorEn", type: "string" },
      { internalType: "uint16", name: "gpa", type: "uint16" },
      { internalType: "uint16", name: "year", type: "uint16" },
      { internalType: "uint8", name: "level", type: "uint8" },
    ],
    name: "issueDegree",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Revoker Function
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "revokeDegree",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint64", name: "universityId", type: "uint64" },
      { indexed: false, internalType: "string", name: "nameEn", type: "string" },
      { indexed: false, internalType: "address", name: "admin", type: "address" },
    ],
    name: "UniversityRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint64", name: "universityId", type: "uint64" },
      { indexed: false, internalType: "bool", name: "isActive", type: "bool" },
    ],
    name: "UniversityStatusChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint64", name: "universityId", type: "uint64" },
      { indexed: false, internalType: "address", name: "newAdmin", type: "address" },
    ],
    name: "UniversityAdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "uint64", name: "universityId", type: "uint64" },
      { indexed: true, internalType: "address", name: "recipient", type: "address" },
    ],
    name: "DegreeIssued",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "uint64", name: "universityId", type: "uint64" },
    ],
    name: "DegreeRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint64", name: "universityId", type: "uint64" },
      { indexed: true, internalType: "address", name: "issuer", type: "address" },
      { indexed: false, internalType: "bool", name: "status", type: "bool" },
    ],
    name: "IssuerUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint64", name: "universityId", type: "uint64" },
      { indexed: true, internalType: "address", name: "revoker", type: "address" },
      { indexed: false, internalType: "bool", name: "status", type: "bool" },
    ],
    name: "RevokerUpdated",
    type: "event",
  },
] as const

export const DEGREE_PROTOCOL_ABI = PROTOCOL_ABI

// Export new contract ABIs
export { CORE_CONTRACT_ABI } from "./abi-core"
export { RENDER_CONTRACT_ABI } from "./abi-render"
export { READER_CONTRACT_ABI } from "./abi-reader"

// Helper functions for contract management
/**
 * Get the active core contract address (for write operations)
 */
export function getActiveContractAddress(): string {
  return CORE_CONTRACT_ADDRESS
}

/**
 * Get the reader contract address (for read-only operations)
 */
export function getReaderContractAddress(): string {
  return READER_CONTRACT_ADDRESS
}

/**
 * Get the render contract address (for rendering operations)
 */
export function getRenderContractAddress(): string {
  return RENDER_CONTRACT_ADDRESS
}

/**
 * Get protocol ABI for a specific version
 * @deprecated Use getCoreContractABI(), getReaderContractABI(), or getRenderContractABI() instead
 */
export function getProtocolABI(version: "v1" | "v2" = "v2"): typeof PROTOCOL_ABI {
  // Return Core ABI for new contracts
  return CORE_CONTRACT_ABI as typeof PROTOCOL_ABI
}

/**
 * Get Core contract ABI (for write operations)
 */
export function getCoreContractABI(): typeof CORE_CONTRACT_ABI {
  return CORE_CONTRACT_ABI
}

/**
 * Get Reader contract ABI (for read-only operations)
 */
export function getReaderContractABI(): typeof READER_CONTRACT_ABI {
  return READER_CONTRACT_ABI
}

/**
 * Get Render contract ABI (for rendering operations)
 */
export function getRenderContractABI(): typeof RENDER_CONTRACT_ABI {
  return RENDER_CONTRACT_ABI
}

/**
 * Check if V2 contract is available
 * @deprecated Always returns true now - new contracts are always available
 */
export function hasV2Contract(): boolean {
  return true // New contracts are always available
}
