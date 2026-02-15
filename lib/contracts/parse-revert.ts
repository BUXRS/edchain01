/**
 * Parse contract revert data and return a user-friendly message.
 * Uses Core ABI custom errors so "0xd6f1f946" becomes e.g. "NotAuthorizedVerifier".
 */

import { Interface } from "ethers"
import { CORE_CONTRACT_ABI } from "./abi-core"

const CORE_INTERFACE = new Interface(CORE_CONTRACT_ABI as any)

const FRIENDLY_MESSAGES: Record<string, string> = {
  NotAuthorizedVerifier:
    "Your wallet is not an authorized verifier for this university. Ask the university admin to add you as a verifier.",
  NotAuthorizedIssuer: "Your wallet is not an authorized issuer for this university.",
  NotAuthorizedRevoker: "Your wallet is not an authorized revoker for this university.",
  NotUniversityAdmin: "Your wallet is not the university admin.",
  RequestNotFound:
    "This request was not found on-chain. It may have been created on a different network or contract.",
  RequestAlreadyExecuted:
    "This request was already executed (degree issued or revocation completed).",
  RequestExpired:
    "This request has expired. The issuer or revoker must submit a new request.",
  AlreadyApproved: "You have already approved this request.",
  NoVerifiersConfigured:
    "This university has no verifiers configured. The admin must add at least one verifier before approvals.",
  ContractPaused: "The protocol is temporarily paused. Try again later.",
  UniversityNotActive: "This university is not active on the protocol.",
  InvalidUniversity: "Invalid university.",
  Unauthorized: "You are not authorized to perform this action.",
}

export function parseRevertReason(data: string | null | undefined): string | null {
  if (!data || typeof data !== "string" || !data.startsWith("0x")) return null
  try {
    const parsed = CORE_INTERFACE.parseError(data)
    if (!parsed) return null
    const name = parsed.name
    return FRIENDLY_MESSAGES[name] ?? `Contract error: ${name}`
  } catch {
    // Unknown selector (e.g. contract upgrade). Suggest the most common cause.
    if (data.length >= 10)
      return "Transaction reverted. Your wallet may not be an authorized verifier for this university, or the request may have expired."
    return null
  }
}
