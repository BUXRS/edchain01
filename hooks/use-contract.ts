"use client"

import { useState, useCallback } from "react"
import { Contract } from "ethers"
import { useWeb3 } from "@/components/providers/web3-provider"
import { 
  PROTOCOL_ADDRESS, // Legacy alias to CORE_CONTRACT_ADDRESS
  PROTOCOL_ABI,
  getActiveContractAddress,
  getCoreContractABI,
  getReaderContractABI,
  getRenderContractABI,
  getReaderContractAddress,
  getRenderContractAddress
} from "@/lib/contracts/abi"

export interface University {
  id: bigint
  admin: string
  nameAr: string
  nameEn: string
  exists: boolean
  isActive: boolean
}

export interface Degree {
  universityId: bigint
  gpa: number
  year: number
  level: number
  isRevoked: boolean
  issuedAt: number
  revokedAt: number
  nameAr: string
  nameEn: string
  facultyAr: string
  facultyEn: string
  majorAr: string
  majorEn: string
}

export function useContract() {
  const { getContract, getSigner, address, isCorrectChain } = useWeb3()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const safeContractCall = useCallback(async (fn, defaultValue) => {
    try {
      return await fn()
    } catch (error) {
      // Silently return default for CALL_EXCEPTION (missing function)
      if (error?.code === "CALL_EXCEPTION" || error?.message?.includes("missing revert data")) {
        return defaultValue
      }
      throw error
    }
  }, [])

  const getUniversity = useCallback(
    async (id) => {
      try {
        // Use Core contract for getUniversity (Reader doesn't have this directly)
        const provider = getContract()?.provider
        if (!provider) return null
        
        const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
        const result = await safeContractCall(() => coreContract.getUniversity(id), null)
        if (!result) return null
        return {
          id: BigInt(id),
          admin: result.admin,
          nameAr: result.nameAr,
          nameEn: result.nameEn,
          exists: result.exists,
          isActive: result.isActive,
          isDeleted: result.isDeleted || false, // New field in Core contract
        }
      } catch (error) {
        console.error("Error fetching university:", error.message || error)
        return null
      }
    },
    [getContract, safeContractCall],
  )

  const getAllUniversities = useCallback(async () => {
    try {
      // Use Core contract for nextUniversityId
      const provider = getContract()?.provider
      if (!provider) return []

      const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
      const nextId = await safeContractCall(() => coreContract.nextUniversityId(), BigInt(1))
      const universities = []

      for (let i = 1; i < Number(nextId); i++) {
        const uni = await getUniversity(i)
        if (uni && uni.exists) {
          universities.push(uni)
        }
      }

      return universities
    } catch (error) {
      console.error("Error fetching universities:", error.message || error)
      return []
    }
  }, [getContract, getUniversity, safeContractCall])

  const checkIsIssuer = useCallback(
    async (universityId, account) => {
      try {
        // Use Reader contract's checkRoles for efficient role checking
        const provider = getContract()?.provider
        if (!provider) return false
        
        const readerContract = new Contract(getReaderContractAddress(), getReaderContractABI(), provider)
        try {
          const roles = await readerContract.checkRoles(universityId, account)
          return roles.isIssuer
        } catch {
          // Fallback to Core contract
          const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
          return await safeContractCall(() => coreContract.isIssuer(universityId, account), false)
        }
      } catch (error) {
        // Silent fail - not an issuer
        return false
      }
    },
    [getContract, safeContractCall],
  )

  const checkIsRevoker = useCallback(
    async (universityId, account) => {
      try {
        // Use Reader contract's checkRoles for efficient role checking
        const provider = getContract()?.provider
        if (!provider) return false
        
        const readerContract = new Contract(getReaderContractAddress(), getReaderContractABI(), provider)
        try {
          const roles = await readerContract.checkRoles(universityId, account)
          return roles.isRevoker
        } catch {
          // Fallback to Core contract
          const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
          return await safeContractCall(() => coreContract.isRevoker(universityId, account), false)
        }
      } catch (error) {
        // Silent fail - not a revoker
        return false
      }
    },
    [getContract, safeContractCall],
  )

  const checkIsUniversityAdmin = useCallback(
    async (universityId, account) => {
      try {
        const uni = await getUniversity(universityId)
        if (!uni) return false
        return uni.admin.toLowerCase() === account.toLowerCase()
      } catch (error) {
        return false
      }
    },
    [getUniversity],
  )

  const findUserRole = useCallback(
    async (account) => {
      const result = {
        isOwner: false,
        universityAdmin: null,
        issuerFor: [],
        revokerFor: [],
      }

      try {
        const contract = getContract()
        if (!contract) return result

        const owner = await safeContractCall(() => contract.owner(), null)
        if (owner) {
          result.isOwner = owner.toLowerCase() === account.toLowerCase()
        }

        // Get all universities and check roles
        const universities = await getAllUniversities()

        for (const uni of universities) {
          const id = Number(uni.id)

          // Check if university admin
          if (uni.admin.toLowerCase() === account.toLowerCase()) {
            result.universityAdmin = { id, name: uni.nameEn }
          }

          // Check if issuer (silently fails if function doesn't exist)
          const isIssuer = await checkIsIssuer(id, account)
          if (isIssuer) {
            result.issuerFor.push({ id, name: uni.nameEn })
          }

          // Check if revoker (silently fails if function doesn't exist)
          const isRevoker = await checkIsRevoker(id, account)
          if (isRevoker) {
            result.revokerFor.push({ id, name: uni.nameEn })
          }
        }
      } catch (error) {
        console.error("Error finding user role:", error.message || error)
      }

      return result
    },
    [getContract, getAllUniversities, checkIsIssuer, checkIsRevoker, safeContractCall],
  )

  // Admin Functions
  const registerUniversity = useCallback(
    async (admin, nameAr, nameEn) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        // Use Core contract ABI for write operations
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.registerUniversity(admin, nameAr, nameEn)
        
        // Get transaction hash before waiting
        const txHash = tx.hash
        console.log(`[RegisterUniversity] Transaction submitted: ${txHash}`)
        
        const receipt = await tx.wait()
        console.log(`[RegisterUniversity] Transaction confirmed in block: ${receipt.blockNumber}`)

        // Get university ID from event
        const event = receipt.logs.find((log) => {
          try {
            const parsed = contract.interface.parseLog(log)
            return parsed?.name === "UniversityRegistered"
          } catch {
            return false
          }
        })

        if (event) {
          const parsed = contract.interface.parseLog(event)
          const universityId = parsed?.args?.[0]
          console.log(`[RegisterUniversity] ✅ University registered with ID: ${universityId}, TX: ${txHash}`)
          
          // Return both university ID and transaction hash
          return {
            id: universityId,
            universityId: universityId,
            txHash: txHash,
            hash: txHash,
            receipt: receipt
          }
        }

        console.warn(`[RegisterUniversity] ⚠️ UniversityRegistered event not found, but transaction succeeded: ${txHash}`)
        // Return transaction hash even if event not found
        return {
          id: null,
          universityId: null,
          txHash: txHash,
          hash: txHash,
          receipt: receipt
        }
      } catch (error) {
        console.error("Error registering university:", error)
        setError(error.message || "Failed to register university")
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const setUniversityStatus = useCallback(
    async (universityId, isActive) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        // Use Core contract ABI for write operations
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.setUniversityStatus(universityId, isActive)
        await tx.wait()
        return true
      } catch (error) {
        console.error("Error setting university status:", error)
        setError(error.message || "Failed to update university status")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const updateUniversityAdmin = useCallback(
    async (universityId, newAdmin) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        // Use Core contract ABI for write operations
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.updateUniversityAdmin(universityId, newAdmin)
        await tx.wait()
        return true
      } catch (error) {
        console.error("Error updating university admin:", error)
        setError(error.message || "Failed to update university admin")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  // University Admin Functions
  const grantIssuer = useCallback(
    async (universityId, issuer) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        // Use Core contract ABI for write operations
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.grantIssuer(universityId, issuer)
        await tx.wait()
        return true
      } catch (error) {
        console.error("Error granting issuer:", error)
        setError(error.message || "Failed to grant issuer role")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const revokeIssuer = useCallback(
    async (universityId, issuer) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        // Use Core contract ABI for write operations
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.revokeIssuer(universityId, issuer)
        await tx.wait()
        return true
      } catch (error) {
        console.error("Error revoking issuer:", error)
        setError(error.message || "Failed to revoke issuer role")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const grantRevoker = useCallback(
    async (universityId, revoker) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        // Use Core contract ABI for write operations
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.grantRevoker(universityId, revoker)
        await tx.wait()
        return true
      } catch (error) {
        console.error("Error granting revoker:", error)
        setError(error.message || "Failed to grant revoker role")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const revokeRevoker = useCallback(
    async (universityId, revoker) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        // Use Core contract ABI for write operations
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.revokeRevoker(universityId, revoker)
        await tx.wait()
        return true
      } catch (error) {
        console.error("Error revoking revoker:", error)
        setError(error.message || "Failed to revoke revoker role")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  // Issuer Functions - Updated for new Core contract
  // Signature: issueDegree(universityId, recipient, nameAr, nameEn, facultyAr, facultyEn, majorAr, majorEn, degreeNameAr, degreeNameEn, gpa, year, level)
  // Note: level parameter is deprecated but kept for backward compatibility
  const issueDegree = useCallback(
    async (universityId, recipient, nameAr, nameEn, facultyAr, facultyEn, majorAr, majorEn, degreeNameAr, degreeNameEn, gpa, year, level) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        // Use Core contract ABI for write operations
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        
        // Validate that degree names are provided (contract will revert with EmptyString error if empty)
        // The contract's _validateString function checks: if (len == 0) revert EmptyString();
        if (!degreeNameAr || degreeNameAr.trim() === "" || !degreeNameEn || degreeNameEn.trim() === "") {
          throw new Error("Degree name (Arabic and English) is required. The contract validates these fields and will revert if empty.")
        }
        
        // New Core contract uses requestDegree (requires verifier approval)
        // Function signature from Core contract:
        // requestDegree(universityId, recipient, nameAr, nameEn, facultyAr, facultyEn, majorAr, majorEn, degreeNameAr, degreeNameEn, gpa, year)
        const tx = await contract.requestDegree(
          universityId,
          recipient,
          nameAr,
          nameEn,
          facultyAr,
          facultyEn,
          majorAr,
          majorEn,
          degreeNameAr,
          degreeNameEn,
          gpa,
          year,
        )
        const receipt = await tx.wait()
        console.log("[issueDegree] Transaction receipt:", receipt)

        // New event: DegreeRequested (returns requestId, not tokenId)
        const event = receipt.logs.find((log) => {
          try {
            const parsed = contract.interface.parseLog(log)
            return parsed?.name === "DegreeRequested" || parsed?.name === "DegreeIssued"
          } catch {
            return false
          }
        })

        if (event) {
          const parsed = contract.interface.parseLog(event)
          console.log("[issueDegree] Found event:", parsed?.name, "args:", parsed?.args)
          // DegreeRequested returns requestId, DegreeIssued returns tokenId
          if (parsed?.name === "DegreeRequested") {
            const requestId = Number(parsed?.args?.[0])
            console.log("[issueDegree] Returning requestId:", requestId)
            return { requestId } // Return requestId for new flow
          } else {
            const tokenId = parsed?.args?.[0]
            console.log("[issueDegree] Returning tokenId:", tokenId)
            return tokenId // Return tokenId for DegreeIssued
          }
        }

        console.error("[issueDegree] No DegreeRequested or DegreeIssued event found in receipt logs")
        console.log("[issueDegree] All logs:", receipt.logs.map(log => {
          try {
            return contract.interface.parseLog(log)
          } catch {
            return log
          }
        }))
        throw new Error("Transaction succeeded but no DegreeRequested event was emitted. Please check the contract.")
      } catch (error) {
        const isUserRejection = error?.code === 4001 || error?.code === "ACTION_REJECTED" || /rejected|denied/i.test(error?.message || "")
        if (isUserRejection) throw error
        console.error("Error requesting degree:", error)
        setError(error?.message || "Failed to request degree")
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  // Revoker Functions
  const revokeDegree = useCallback(
    async (tokenId) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        // Use Core contract ABI for write operations
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        // New Core contract uses requestRevocation (requires verifier approval)
        const tx = await contract.requestRevocation(tokenId)
        const receipt = await tx.wait()
        
        // New event: RevocationRequested (returns requestId)
        const event = receipt.logs.find((log) => {
          try {
            const parsed = contract.interface.parseLog(log)
            return parsed?.name === "RevocationRequested" || parsed?.name === "DegreeRevoked"
          } catch {
            return false
          }
        })

        if (event) {
          const parsed = contract.interface.parseLog(event)
          // RevocationRequested returns requestId, DegreeRevoked means it was executed
          if (parsed?.name === "RevocationRequested") {
            return { requestId: parsed?.args?.[0] } // Return requestId for new flow
          } else {
            return true // DegreeRevoked means revocation was executed
          }
        }
        
        return true
      } catch (error) {
        console.error("Error requesting revocation:", error)
        setError(error.message || "Failed to request revocation")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  // View Functions
  const getDegree = useCallback(
    async (tokenId) => {
      try {
        // Use Reader contract for read operations
        const provider = getContract()?.provider
        if (!provider) return null
        
        const readerContract = new Contract(getReaderContractAddress(), getReaderContractABI(), provider)
        const result = await safeContractCall(() => readerContract.getDegreeInfo(tokenId), null)
        if (!result) return null

        return {
          universityId: result.universityId,
          gpa: Number(result.gpa),
          year: Number(result.year),
          // level field removed in new contracts
          level: undefined,
          isRevoked: result.isRevoked,
          issuedAt: Number(result.issuedAt),
          revokedAt: Number(result.revokedAt),
          nameAr: result.nameAr,
          nameEn: result.nameEn,
          facultyAr: result.facultyAr,
          facultyEn: result.facultyEn,
          majorAr: result.majorAr,
          majorEn: result.majorEn,
          degreeNameAr: result.degreeNameAr,
          degreeNameEn: result.degreeNameEn,
          issuer: result.issuer,
          revoker: result.revoker,
        }
      } catch (error) {
        console.error("Error fetching degree:", error.message || error)
        return null
      }
    },
    [getContract, safeContractCall],
  )

  const isValidDegree = useCallback(
    async (tokenId) => {
      try {
        // Use Core contract for isValidDegree (Reader doesn't have this)
        const provider = getContract()?.provider
        if (!provider) return false
        
        const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
        return await safeContractCall(() => coreContract.isValidDegree(tokenId), false)
      } catch (error) {
        return false
      }
    },
    [getContract, safeContractCall],
  )

  const getTokenURI = useCallback(
    async (tokenId) => {
      try {
        // tokenURI is available on Core contract (it calls Render contract internally)
        const provider = getContract()?.provider
        if (!provider) return null
        
        const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
        return await safeContractCall(() => coreContract.tokenURI(tokenId), null)
      } catch (error) {
        return null
      }
    },
    [getContract, safeContractCall],
  )

  const getTotalSupply = useCallback(async () => {
    try {
      // Use Core contract for totalSupply (Reader doesn't have this)
      const provider = getContract()?.provider
      if (!provider) return 0
      
      const coreContract = new Contract(getActiveContractAddress(), getCoreContractABI(), provider)
      const supply = await safeContractCall(() => coreContract.totalSupply(), BigInt(0))
      return Number(supply)
    } catch (error) {
      return 0
    }
  }, [getContract, safeContractCall])

  // Verifier Functions
  const addVerifier = useCallback(
    async (universityId: number, verifierAddress: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.addVerifier(universityId, verifierAddress)
        await tx.wait()
        return true
      } catch (error: any) {
        console.error("Error adding verifier:", error)
        setError(error.message || "Failed to add verifier")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const removeVerifier = useCallback(
    async (universityId: number, verifierAddress: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.removeVerifier(universityId, verifierAddress)
        await tx.wait()
        return true
      } catch (error: any) {
        console.error("Error removing verifier:", error)
        setError(error.message || "Failed to remove verifier")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const approveDegreeRequest = useCallback(
    async (requestId: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.approveDegreeRequest(requestId)
        const receipt = await tx.wait()
        
        // The function returns bool indicating if degree was issued
        const issued = receipt.logs.some((log: any) => {
          try {
            const parsed = contract.interface.parseLog(log)
            return parsed?.name === "DegreeIssued"
          } catch {
            return false
          }
        })
        
        return { success: true, issued }
      } catch (error: any) {
        console.error("Error approving degree request:", error)
        setError(error.message || "Failed to approve degree request")
        return { success: false, issued: false }
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const rejectDegreeRequest = useCallback(
    async (requestId: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.rejectDegreeRequest(requestId)
        await tx.wait()
        return true
      } catch (error: any) {
        console.error("Error rejecting degree request:", error)
        setError(error.message || "Failed to reject degree request")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const approveRevocationRequest = useCallback(
    async (requestId: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.approveRevocationRequest(requestId)
        const receipt = await tx.wait()
        
        // The function returns bool indicating if degree was revoked
        const revoked = receipt.logs.some((log: any) => {
          try {
            const parsed = contract.interface.parseLog(log)
            return parsed?.name === "DegreeRevoked"
          } catch {
            return false
          }
        })
        
        return { success: true, revoked }
      } catch (error: any) {
        console.error("Error approving revocation request:", error)
        setError(error.message || "Failed to approve revocation request")
        return { success: false, revoked: false }
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const rejectRevocationRequest = useCallback(
    async (requestId: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")

        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.rejectRevocationRequest(requestId)
        await tx.wait()
        return true
      } catch (error: any) {
        console.error("Error rejecting revocation request:", error)
        setError(error.message || "Failed to reject revocation request")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const withdrawDegreeApproval = useCallback(
    async (requestId: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.withdrawDegreeApproval(requestId)
        await tx.wait()
        return true
      } catch (error: any) {
        console.error("Error withdrawing degree approval:", error)
        setError(error?.message || "Failed to withdraw approval")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  const withdrawRevocationApproval = useCallback(
    async (requestId: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const signer = await getSigner()
        if (!signer) throw new Error("No signer available")
        const contract = new Contract(getActiveContractAddress(), getCoreContractABI(), signer)
        const tx = await contract.withdrawRevocationApproval(requestId)
        await tx.wait()
        return true
      } catch (error: any) {
        console.error("Error withdrawing revocation approval:", error)
        setError(error?.message || "Failed to withdraw approval")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [getSigner],
  )

  return {
    isLoading,
    error,
    getUniversity,
    getAllUniversities,
    checkIsIssuer,
    checkIsRevoker,
    checkIsUniversityAdmin,
    findUserRole,
    getDegree,
    isValidDegree,
    getTokenURI,
    getTotalSupply,
    registerUniversity,
    setUniversityStatus,
    updateUniversityAdmin,
    grantIssuer,
    revokeIssuer,
    grantRevoker,
    revokeRevoker,
    issueDegree,
    revokeDegree,
    addVerifier,
    removeVerifier,
    approveDegreeRequest,
    rejectDegreeRequest,
    approveRevocationRequest,
    rejectRevocationRequest,
    withdrawDegreeApproval,
    withdrawRevocationApproval,
  }
}
