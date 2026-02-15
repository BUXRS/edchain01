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
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Building2,
  Mail,
  User,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Shield,
  Clock,
  FileText,
  RefreshCw,
  Power,
  PowerOff,
  ExternalLink,
  Copy,
  Check,
  Link as LinkIcon,
  CreditCard,
  Info,
} from "lucide-react"

interface University {
  id: number
  name: string
  name_ar: string | null
  admin_name: string
  admin_email: string
  phone: string | null
  address: string | null
  city: string | null
  wallet_address: string | null
  subscription_type: string
  subscription_expires_at: string | null
  is_active: boolean
  status: string
  blockchain_id: number | null
  created_at: string
  registration_type?: string
  is_trial?: boolean
  trial_end_date?: string
  nda_signed?: boolean
  wallet_submitted?: boolean
  account_activated?: boolean
  payment_status?: string
}

export default function UniversityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { isConnected, isCorrectChain, address, connect, switchChain } = useWeb3()
  const { registerUniversity: registerUniversityOnChain, isLoading: contractLoading } = useContract()

  const [university, setUniversity] = useState<University | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Dialog states
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [extendTrialDialogOpen, setExtendTrialDialogOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [walletInput, setWalletInput] = useState("")
  const [extendDays, setExtendDays] = useState("30")
  const [selectedPlan, setSelectedPlan] = useState("professional")
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [paymentReference, setPaymentReference] = useState("")

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

  const handleActivate = async () => {
    // Step 1: Check wallet connection
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

    // Step 2: Validate wallet address
    const finalWalletAddress = walletInput || university?.wallet_address
    if (!finalWalletAddress) {
      setError("Wallet address is required for activation")
      return
    }

    // Validate wallet format
    if (!/^0x[a-fA-F0-9]{40}$/.test(finalWalletAddress)) {
      setError("Invalid wallet address format")
      return
    }

    // Step 3: Validate university has name
    if (!university?.name || !university?.name_ar) {
      setError("University name (English and Arabic) is required")
      return
    }

    setActionLoading("activate")
    setError(null)
    setSuccess(null)

    try {
      // Step 4: Execute blockchain transaction via MetaMask
      console.log(`[Activate] Registering university on blockchain: ${university.name}, Admin: ${finalWalletAddress}`)
      
      const result = await registerUniversityOnChain(
        finalWalletAddress.toLowerCase(),
        university.name_ar || "",
        university.name
      )

      // registerUniversityOnChain returns the university ID, but we need to get the transaction hash
      // Let's check if it returns an object with txHash or just the ID
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

      // Step 5: Update database with blockchain ID and wallet address
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
        // provide a helpful error message with blockchain ID
        const errorMsg = activationResult.error || "Failed to update database after blockchain registration"
        console.error(`[Activate] ❌ Database update failed after successful blockchain registration:`, errorMsg)
        throw new Error(`${errorMsg}. The university was registered on blockchain (ID: ${blockchainId}) but the database update failed. Please contact support to sync the database, or try refreshing the page.`)
      }

      setSuccess(`University activated successfully on blockchain! University ID: ${blockchainId}. Confirmation email sent.`)
      setActivateDialogOpen(false)
      setWalletInput("")
      fetchUniversity()
    } catch (err: any) {
      console.error("[Activate] Error:", err)
      setError(err.message || "Failed to activate university. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeactivate = async () => {
    setActionLoading("deactivate")
    setError(null)

    try {
      const response = await fetch(`/api/admin/universities/${id}/deactivate`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to deactivate university")
      }

      setSuccess("University deactivated successfully")
      setDeactivateDialogOpen(false)
      fetchUniversity()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleExtendTrial = async () => {
    setActionLoading("extend")
    setError(null)

    try {
      const response = await fetch(`/api/admin/universities/${id}/extend-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: parseInt(extendDays) }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to extend trial")
      }

      setSuccess(`Trial extended by ${extendDays} days`)
      setExtendTrialDialogOpen(false)
      fetchUniversity()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleConvertToPermanent = async () => {
    setActionLoading("convert")
    setError(null)

    try {
      const response = await fetch(`/api/admin/universities/${id}/convert-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          paymentMethod,
          paymentReference,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to convert subscription")
      }

      setSuccess("Subscription converted to permanent successfully")
      setConvertDialogOpen(false)
      fetchUniversity()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSync = async () => {
    setActionLoading("sync")
    setError(null)

    try {
      const response = await fetch(`/api/admin/universities/${id}/sync`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to sync with blockchain")
      }

      setSuccess("Synced with blockchain successfully")
      fetchUniversity()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "inactive":
        return <Badge variant="destructive">Inactive</Badge>
      case "expired":
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Expired</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
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

  const isTrialExpired = university.is_trial && university.trial_end_date && new Date(university.trial_end_date) < new Date()
  const canActivate = university.nda_signed && (university.wallet_submitted || walletInput)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/universities">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{university.name}</h1>
              {getStatusBadge(university.status)}
              {university.is_trial && (
                <Badge variant="outline" className="border-amber-500 text-amber-500">
                  Trial
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{university.admin_email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={!!actionLoading}>
            {actionLoading === "sync" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Sync</span>
          </Button>
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

      {isTrialExpired && (
        <Alert variant="destructive" className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Trial period has expired. The university account is deactivated. Extend the trial or convert to a permanent subscription.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* University Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  University Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{university.name}</span>
                  </div>
                  {university.name_ar && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name (Arabic)</span>
                      <span className="font-medium" dir="rtl">{university.name_ar}</span>
                    </div>
                  )}
                  {university.city && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City</span>
                      <span className="font-medium">{university.city}</span>
                    </div>
                  )}
                  {university.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-medium text-right max-w-[200px]">{university.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blockchain ID</span>
                    <span className="font-medium">
                      {university.blockchain_id || "Not registered"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Admin Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{university.admin_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{university.admin_email}</span>
                  </div>
                  {university.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{university.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Wallet Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Blockchain Wallet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {university.wallet_address ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted p-2 rounded break-all">
                        {university.wallet_address}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(university.wallet_address!)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Wallet connected
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {university.wallet_submitted
                        ? "Wallet submitted, pending activation"
                        : "No wallet address submitted"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(university.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active</span>
                  {university.is_active ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">NDA Signed</span>
                  {university.nda_signed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {new Date(university.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Registration Tab */}
        <TabsContent value="registration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registration Progress</CardTitle>
              <CardDescription>Track the onboarding status of this university</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Progress Steps */}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className={`p-4 rounded-lg border ${university.registration_type ? "bg-green-50 dark:bg-green-950/30 border-green-200" : "bg-muted"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {university.registration_type ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Registered</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {university.registration_type === "admin_added" ? "Added by Admin" : "Self-registered"}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${university.nda_signed ? "bg-green-50 dark:bg-green-950/30 border-green-200" : "bg-muted"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {university.nda_signed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">NDA Signed</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {university.nda_signed ? "Agreements accepted" : "Pending signature"}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${university.wallet_submitted ? "bg-green-50 dark:bg-green-950/30 border-green-200" : "bg-muted"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {university.wallet_submitted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Wallet Submitted</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {university.wallet_submitted ? "Address received" : "Awaiting submission"}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${university.account_activated ? "bg-green-50 dark:bg-green-950/30 border-green-200" : "bg-muted"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {university.account_activated ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Activated</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {university.account_activated ? "Account active" : "Pending activation"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Type</div>
                  <div className="font-semibold capitalize">{university.subscription_type}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Payment Status</div>
                  <div className="font-semibold capitalize">{university.payment_status || "N/A"}</div>
                </div>
                {university.subscription_expires_at && (
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground mb-1">Expires</div>
                    <div className="font-semibold">
                      {new Date(university.subscription_expires_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {university.trial_end_date && (
                  <div className={`p-4 rounded-lg ${isTrialExpired ? "bg-red-50 dark:bg-red-950/30" : "bg-muted"}`}>
                    <div className="text-sm text-muted-foreground mb-1">Trial Ends</div>
                    <div className={`font-semibold ${isTrialExpired ? "text-red-600" : ""}`}>
                      {new Date(university.trial_end_date).toLocaleDateString()}
                      {isTrialExpired && " (Expired)"}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex gap-4">
                {university.is_trial && (
                  <>
                    <Dialog open={extendTrialDialogOpen} onOpenChange={setExtendTrialDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Clock className="mr-2 h-4 w-4" />
                          Extend Trial
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Extend Trial Period</DialogTitle>
                          <DialogDescription>
                            Add more days to the trial period for {university.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Extend by</Label>
                            <Select value={extendDays} onValueChange={setExtendDays}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="7">7 days</SelectItem>
                                <SelectItem value="14">14 days</SelectItem>
                                <SelectItem value="30">30 days</SelectItem>
                                <SelectItem value="60">60 days</SelectItem>
                                <SelectItem value="90">90 days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setExtendTrialDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleExtendTrial} disabled={actionLoading === "extend"}>
                            {actionLoading === "extend" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Extend Trial
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Convert to Permanent
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Convert to Permanent Subscription</DialogTitle>
                          <DialogDescription>
                            Convert this trial account to a permanent subscription
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Subscription Plan</Label>
                            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basic">Basic - $99/month</SelectItem>
                                <SelectItem value="professional">Professional - $299/month</SelectItem>
                                <SelectItem value="enterprise">Enterprise - Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="credit_card">Credit Card</SelectItem>
                                <SelectItem value="invoice">Invoice</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Payment Reference (Optional)</Label>
                            <Input
                              placeholder="Transaction ID or reference"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleConvertToPermanent} disabled={actionLoading === "convert"}>
                            {actionLoading === "convert" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Convert Subscription
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Activation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-5 w-5" />
                  Account Activation
                </CardTitle>
                <CardDescription>
                  Activate or deactivate this university account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {university.is_active ? (
                  <>
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        This account is currently active
                      </AlertDescription>
                    </Alert>
                    <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <PowerOff className="mr-2 h-4 w-4" />
                          Deactivate Account
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Deactivate University Account</DialogTitle>
                          <DialogDescription>
                            This will deactivate the account for {university.name}. The university will not be able to issue new degrees until reactivated.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDeactivate} disabled={actionLoading === "deactivate"}>
                            {actionLoading === "deactivate" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Deactivate
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <>
                    {!canActivate && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {!university.nda_signed
                            ? "University must sign NDA before activation"
                            : "University must submit wallet address before activation"}
                        </AlertDescription>
                      </Alert>
                    )}
                    <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" disabled={!canActivate}>
                          <Power className="mr-2 h-4 w-4" />
                          Activate Account
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Activate University Account on Blockchain</DialogTitle>
                          <DialogDescription>
                            Register {university.name} on the blockchain and activate their account. This requires a MetaMask transaction.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          {/* Wallet Connection Status */}
                          {!isConnected ? (
                            <Alert>
                              <Wallet className="h-4 w-4" />
                              <AlertDescription className="flex items-center justify-between">
                                <span>Connect your MetaMask wallet to execute the blockchain transaction</span>
                                <Button onClick={connect} size="sm" className="ml-4">
                                  Connect Wallet
                                </Button>
                              </AlertDescription>
                            </Alert>
                          ) : !isCorrectChain ? (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="flex items-center justify-between">
                                <span>Please switch to Base network to execute the transaction</span>
                                <Button onClick={switchChain} variant="outline" size="sm" className="ml-4">
                                  Switch Network
                                </Button>
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert className="border-green-500/30 bg-green-500/5">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <AlertDescription>
                                <strong>Wallet Connected:</strong> {address?.slice(0, 6)}...{address?.slice(-4)} on Base network
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Wallet Address Input */}
                          {university.wallet_address ? (
                            <div className="space-y-2">
                              <Label>University Admin Wallet Address (Submitted)</Label>
                              <code className="block text-xs bg-muted p-3 rounded break-all">
                                {university.wallet_address}
                              </code>
                              <p className="text-xs text-muted-foreground">
                                This wallet will be registered as the university admin on the blockchain
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label>University Admin Wallet Address <span className="text-destructive">*</span></Label>
                              <Input
                                placeholder="0x..."
                                value={walletInput}
                                onChange={(e) => setWalletInput(e.target.value)}
                                className="font-mono"
                                disabled={actionLoading === "activate"}
                              />
                              <p className="text-xs text-muted-foreground">
                                Enter the university admin's Ethereum wallet address. This will be registered on the blockchain.
                              </p>
                            </div>
                          )}

                          {/* Transaction Info */}
                          {isConnected && isCorrectChain && (
                            <Alert className="border-blue-500/30 bg-blue-500/5">
                              <Info className="h-4 w-4 text-blue-500" />
                              <AlertDescription className="text-sm">
                                <strong>What will happen:</strong>
                                <ol className="list-decimal ml-4 mt-2 space-y-1">
                                  <li>You'll sign a MetaMask transaction to register the university on the smart contract</li>
                                  <li>The university will be assigned a blockchain ID</li>
                                  <li>The wallet address will be saved to the database</li>
                                  <li>The university admin will receive an activation email</li>
                                  <li>They can then login with this wallet or email/password (wallet required)</li>
                                </ol>
                              </AlertDescription>
                            </Alert>
                          )}

                          {error && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setActivateDialogOpen(false); setError(null); setWalletInput(""); }}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleActivate} 
                            disabled={actionLoading === "activate" || !isConnected || !isCorrectChain || contractLoading}
                          >
                            {actionLoading === "activate" ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Registering on Blockchain...
                              </>
                            ) : (
                              <>
                                <Wallet className="mr-2 h-4 w-4" />
                                Register & Activate on Blockchain
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Resend Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Communication
                </CardTitle>
                <CardDescription>
                  Send emails to the university admin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full bg-transparent">
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Welcome Email
                </Button>
                <Button variant="outline" className="w-full bg-transparent">
                  <FileText className="mr-2 h-4 w-4" />
                  Resend NDA Link
                </Button>
                {university.is_trial && (
                  <Button variant="outline" className="w-full bg-transparent">
                    <Clock className="mr-2 h-4 w-4" />
                    Send Trial Reminder
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
