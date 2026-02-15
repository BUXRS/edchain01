"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useContract } from "@/hooks/use-contract"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  Building2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Power,
  PowerOff,
  Shield,
  RefreshCw,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { toast } from "sonner"

interface University {
  id: number
  name: string
  name_ar: string | null
  admin_name: string
  admin_email: string
  wallet_address: string | null
  is_active: boolean
  status: string
  blockchain_id: number | null
}

export default function UniversityStatusPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { isConnected, isCorrectChain, isContractOwner, connect, switchChain, checkIsContractOwner, address } = useWeb3()
  const { registerUniversity: registerUniversityOnChain, setUniversityStatus, isLoading: contractLoading } = useContract()

  const [university, setUniversity] = useState<University | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [walletInput, setWalletInput] = useState("")
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchUniversity()
  }, [id])

  const fetchUniversity = async () => {
    try {
      const response = await fetch(`/api/admin/universities/${id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch university")
      }

      setUniversity(result.university)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!university) return

    // If deactivating, use simple toggle
    if (university.is_active) {
      await handleDeactivate()
      return
    }

    // If activating and not on blockchain, need full activation flow
    if (!university.blockchain_id) {
      // Check if wallet address is available
      const finalWalletAddress = walletInput || university.wallet_address || address
      if (!finalWalletAddress) {
        setError("Wallet address is required for activation. Please provide a wallet address.")
        setActivateDialogOpen(true)
        return
      }
      await handleActivate(finalWalletAddress)
      return
    }

    // If already on blockchain, just toggle status
    await handleToggleBlockchainStatus()
  }

  const handleActivate = async (walletAddress?: string) => {
    if (!university) return

    // Check wallet connection
    if (!isConnected) {
      setError("Please connect your MetaMask wallet first")
      await connect()
      return
    }

    if (!isCorrectChain) {
      setError("Please switch to Base network")
      await switchChain()
      return
    }

    // Validate wallet address
    const finalWalletAddress = walletAddress || walletInput || university.wallet_address || address
    if (!finalWalletAddress) {
      setError("Wallet address is required for activation")
      setActivateDialogOpen(true)
      return
    }

    // Validate wallet format
    if (!/^0x[a-fA-F0-9]{40}$/.test(finalWalletAddress)) {
      setError("Invalid wallet address format")
      return
    }

    // Validate university has name
    if (!university.name || !university.name_ar) {
      setError("University name (English and Arabic) is required")
      return
    }

    setActionLoading(true)
    setError(null)
    setSuccess(null)
    setActivateDialogOpen(false)

    try {
      // Step 1: Register university on blockchain
      console.log(`[Activate] Registering university on blockchain: ${university.name}, Admin: ${finalWalletAddress}`)
      
      const result = await registerUniversityOnChain(
        finalWalletAddress.toLowerCase(),
        university.name_ar || "",
        university.name
      )

      // Extract blockchain ID and transaction hash
      const blockchainId = typeof result === 'object' && result !== null && 'id' in result 
        ? result.id 
        : typeof result === 'object' && result !== null && 'universityId' in result
        ? result.universityId
        : result

      const txHash = typeof result === 'object' && result !== null && 'txHash' in result
        ? result.txHash
        : typeof result === 'object' && result !== null && 'hash' in result
        ? result.hash
        : null

      if (!blockchainId) {
        throw new Error("Failed to register university on blockchain. Transaction may have failed.")
      }

      console.log(`[Activate] ✅ University registered on blockchain with ID: ${blockchainId}${txHash ? `, TX: ${txHash}` : ''}`)

      // Step 2: Update database with blockchain ID and wallet address
      const response = await fetch(`/api/admin/universities/${id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: finalWalletAddress.toLowerCase(),
          blockchainId: Number(blockchainId),
          txHash: txHash || undefined,
        }),
      })

      const activationResult = await response.json()

      if (!response.ok) {
        // If blockchain registration succeeded but database update failed,
        // provide a helpful error message
        const errorMsg = activationResult.error || "Failed to update database after blockchain registration"
        console.error(`[Activate] ❌ Database update failed after successful blockchain registration:`, errorMsg)
        throw new Error(`${errorMsg}. The university was registered on blockchain (ID: ${blockchainId}) but the database update failed. Please contact support to sync the database.`)
      }

      setSuccess(`University activated successfully on blockchain! University ID: ${blockchainId}. Confirmation email sent.`)
      toast.success(`University activated successfully! Blockchain ID: ${blockchainId}`)
      
      // Refresh university data
      await fetchUniversity()
      
      // Redirect back after 2 seconds
      setTimeout(() => {
        router.push(`/admin/universities/${id}/view`)
      }, 2000)
    } catch (err: any) {
      console.error("[Activate] Error:", err)
      const errorMessage = err.message || "Failed to activate university. Please try again."
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setActionLoading(false)
      setWalletInput("")
    }
  }

  const handleToggleBlockchainStatus = async () => {
    if (!university || !university.blockchain_id) return

    // Check wallet connection
    if (!isConnected) {
      setError("Please connect your MetaMask wallet first")
      await connect()
      return
    }

    if (!isCorrectChain) {
      setError("Please switch to Base network")
      await switchChain()
      return
    }

    if (!isContractOwner) {
      setError("Only the contract owner can change university status")
      return
    }

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const newStatus = !university.is_active
      
      // Update status on blockchain
      const success = await setUniversityStatus(Number(university.blockchain_id), newStatus)
      if (!success) {
        throw new Error("Failed to update status on blockchain")
      }

      // Update in database
      const response = await fetch(`/api/admin/universities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          is_active: newStatus,
          status: newStatus ? "active" : "inactive",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update status in database")
      }

      setSuccess(`University ${newStatus ? "activated" : "deactivated"} successfully`)
      toast.success(`University ${newStatus ? "activated" : "deactivated"} successfully`)
      
      // Refresh university data
      await fetchUniversity()
      
      // Redirect back after 2 seconds
      setTimeout(() => {
        router.push(`/admin/universities/${id}/view`)
      }, 2000)
    } catch (err: any) {
      console.error("Error updating status:", err)
      setError(err.message || "Failed to update status")
      toast.error(err.message || "Failed to update status")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSync = async () => {
    if (!university || !university.blockchain_id) {
      setError("University is not registered on blockchain")
      return
    }

    setSyncing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/universities/${id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to sync from blockchain")
      }

      setSuccess("University synced successfully from blockchain")
      toast.success("University synced successfully")
      await fetchUniversity()
    } catch (err: any) {
      console.error("Error syncing:", err)
      setError(err.message || "Failed to sync from blockchain")
      toast.error(err.message || "Failed to sync")
    } finally {
      setSyncing(false)
    }
  }

  const handleDeactivate = async () => {
    if (!university || !university.blockchain_id) {
      // If not on blockchain, just update database
      setActionLoading(true)
      try {
        const response = await fetch(`/api/admin/universities/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_active: false,
            status: "inactive",
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to deactivate university")
        }

        await fetchUniversity()
        toast.success("University deactivated successfully")
      } catch (err: any) {
        setError(err.message || "Failed to deactivate")
        toast.error(err.message || "Failed to deactivate")
      } finally {
        setActionLoading(false)
      }
      return
    }

    // If on blockchain, use toggle function
    await handleToggleBlockchainStatus()
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (isActive) {
      return <Badge className="bg-green-500">Active</Badge>
    }
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "inactive":
        return <Badge variant="destructive">Inactive</Badge>
      case "expired":
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Expired</Badge>
      default:
        return <Badge variant="destructive">Inactive</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!university) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>University not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Change University Status" showAuth />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/admin/universities/${id}/view`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{university.name}</h1>
            <p className="text-muted-foreground">{university.admin_email}</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/30">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {!isConnected && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please connect your MetaMask wallet to change university status.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && !isCorrectChain && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please switch to Base network to change university status.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && isCorrectChain && !isContractOwner && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only the contract owner can change university status.
            </AlertDescription>
          </Alert>
        )}

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Status
            </CardTitle>
            <CardDescription>
              Manage the activation status of {university.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(university.status, university.is_active)}
                  {university.blockchain_id && (
                    <Badge variant="outline" className="ml-2">
                      On-Chain: #{university.blockchain_id}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Change Status</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {university.is_active
                  ? "Deactivating this university will disable all operations and access."
                  : "Activating this university will enable all operations and access."}
              </p>

              <Button
                onClick={handleToggleStatus}
                disabled={actionLoading || contractLoading || !isConnected || !isCorrectChain || (university.blockchain_id && !isContractOwner)}
                variant={university.is_active ? "destructive" : "default"}
                className="w-full"
                size="lg"
              >
                {actionLoading || contractLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {university.is_active ? "Deactivating..." : "Activating..."}
                  </>
                ) : (
                  <>
                    {university.is_active ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-2" />
                        Deactivate University
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-2" />
                        {university.blockchain_id ? "Activate University" : "Register & Activate University"}
                      </>
                    )}
                  </>
                )}
              </Button>
              
              {!university.blockchain_id && (
                <p className="text-sm text-muted-foreground mt-2">
                  This university is not yet registered on blockchain. Activation will register it first.
                </p>
              )}
              
              {university.blockchain_id && !university.is_active && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ This university is registered on blockchain (ID: {university.blockchain_id}) but appears inactive in the database.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync from Blockchain
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <Link href={`/admin/universities/${id}/view`}>
            <Button variant="outline">
              Back to Details
            </Button>
          </Link>
          <Link href="/admin/universities">
            <Button variant="outline">
              Back to List
            </Button>
          </Link>
        </div>
      </div>

      {/* Wallet Input Dialog for Activation */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet Address Required</DialogTitle>
            <DialogDescription>
              Please provide the wallet address for the university admin. This will be used to register the university on the blockchain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="wallet">Wallet Address</Label>
              <Input
                id="wallet"
                placeholder="0x..."
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                className="mt-2"
              />
              {address && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setWalletInput(address)}
                >
                  Use Connected Wallet
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleActivate(walletInput || address)} 
              disabled={!walletInput && !address}
            >
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
