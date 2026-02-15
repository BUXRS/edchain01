"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useContract } from "@/hooks/use-contract"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  Building2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Wallet,
  Copy,
  Check,
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
  blockchain_id: number | null
}

export default function UniversityAdminPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { isConnected, isCorrectChain, isContractOwner, connect, switchChain, address } = useWeb3()
  const { updateUniversityAdmin, isLoading: contractLoading } = useContract()

  const [university, setUniversity] = useState<University | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newAdmin, setNewAdmin] = useState("")
  const [copied, setCopied] = useState(false)

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
      setNewAdmin(result.university.wallet_address || "")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!university || !newAdmin) {
      setError("New admin wallet address is required")
      return
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAdmin)) {
      setError("Invalid wallet address format")
      return
    }

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
      setError("Only the contract owner can change university admin")
      return
    }

    if (!university.blockchain_id) {
      setError("University must be registered on blockchain before changing admin")
      return
    }

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Update on blockchain
      const success = await updateUniversityAdmin(
        Number(university.blockchain_id),
        newAdmin.toLowerCase()
      )

      if (!success) {
        throw new Error("Failed to update admin on blockchain")
      }

      // Update in database
      const response = await fetch(`/api/admin/universities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: newAdmin.toLowerCase(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update admin in database")
      }

      setSuccess("University admin updated successfully")
      toast.success("University admin updated successfully")
      
      // Refresh university data
      await fetchUniversity()
      
      // Redirect back after 2 seconds
      setTimeout(() => {
        router.push(`/admin/universities/${id}/view`)
      }, 2000)
    } catch (err: any) {
      console.error("Error updating admin:", err)
      setError(err.message || "Failed to update admin")
      toast.error(err.message || "Failed to update admin")
    } finally {
      setActionLoading(false)
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
      <DashboardHeader title="Change University Admin" showAuth />
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
              Please connect your MetaMask wallet to change university admin.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && !isCorrectChain && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please switch to Base network to change university admin.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && isCorrectChain && !isContractOwner && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only the contract owner can change university admin.
            </AlertDescription>
          </Alert>
        )}

        {!university.blockchain_id && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              University must be registered on blockchain before changing admin.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Admin Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Current Admin Wallet
            </CardTitle>
            <CardDescription>
              The current admin wallet address for {university.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {university.wallet_address ? (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <code className="flex-1 text-sm break-all">{university.wallet_address}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(university.wallet_address!)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No admin wallet set</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Admin Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Change Admin Wallet
            </CardTitle>
            <CardDescription>
              Update the admin wallet address for {university.name}. The new admin will have full control over
              issuers and revokers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newAdmin">New Admin Wallet Address</Label>
                <Input
                  id="newAdmin"
                  placeholder="0x..."
                  value={newAdmin}
                  onChange={(e) => setNewAdmin(e.target.value)}
                  className="font-mono"
                  required
                  disabled={actionLoading || contractLoading || !isConnected || !isCorrectChain || !isContractOwner || !university.blockchain_id}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the new wallet address that will become the admin for this university.
                </p>
              </div>

              <Button
                type="submit"
                disabled={actionLoading || contractLoading || !isConnected || !isCorrectChain || !isContractOwner || !university.blockchain_id}
                className="w-full"
                size="lg"
              >
                {actionLoading || contractLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating Admin...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Update Admin
                  </>
                )}
              </Button>
            </form>
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
    </div>
  )
}
