"use client"

import type React from "react"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useContract } from "@/hooks/use-contract"
import { useAuth } from "@/components/providers/auth-provider"
import useSWR, { mutate as globalMutate } from "swr"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { 
  UserCheck, 
  Plus, 
  Loader2, 
  AlertTriangle, 
  Trash2, 
  RefreshCw,
  Mail,
  Wallet,
  Clock,
  Shield,
  Info,
  CheckCircle2,
  Search,
  Activity,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Copy,
  MoreHorizontal,
  FileCheck,
  Pause,
} from "lucide-react"
import { checkIsVerifierOnChain, getVerifierCount, getRequiredApprovals, type BlockchainUniversity } from "@/lib/blockchain"
import { getPageLoadRpcDeferMs } from "@/lib/config/sync-config"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

interface Verifier {
  id?: number
  address: string
  name?: string
  email?: string
  phone?: string
  department?: string
  position?: string
  isActive: boolean
  addedAt?: Date
  onboardingStatus?: "pending_nda" | "pending_wallet" | "pending_blockchain" | "active" | "pending" | "suspended" | "inactive"
  verifiedOnChain?: boolean
  ndaSigned?: boolean
  ndaSignedAt?: string | null
  walletSubmitted?: boolean
}

interface NewVerifierForm {
  name: string
  email: string
  phone: string
  department: string
  position: string
}

const initialFormState: NewVerifierForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  position: "",
}

const MAX_VERIFIERS = 3

function UniversityVerifiersContent() {
  const { universityUser } = useAuth()
  const { isConnected, isCorrectChain } = useWeb3()
  const { addVerifier, removeVerifier } = useContract()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [university, setUniversity] = useState<BlockchainUniversity | null>(null)
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [dbUniversityId, setDbUniversityId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newVerifierForm, setNewVerifierForm] = useState<NewVerifierForm>(initialFormState)
  const [removingAddress, setRemovingAddress] = useState("")
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [actionType, setActionType] = useState<"resend" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkingAddress, setCheckingAddress] = useState("")
  const [verifierCount, setVerifierCount] = useState(0)
  const [requiredApprovals, setRequiredApprovals] = useState(0)
  const [isMeLoading, setIsMeLoading] = useState(true)

  const searchFromUrl = searchParams.get("search") || ""
  const statusFromUrl = searchParams.get("status") || "all"
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10)
  const [searchQuery, setSearchQuery] = useState(searchFromUrl)
  const [selectedStatus, setSelectedStatus] = useState(statusFromUrl)
  const [currentPage, setCurrentPage] = useState(pageFromUrl)

  const buildQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      return params.toString()
    },
    [searchParams]
  )

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const query = buildQueryString(updates)
      router.push(`?${query}`, { scroll: false })
    },
    [buildQueryString, router]
  )

  useEffect(() => {
    loadUniversityData()
  }, [universityUser?.id])

  const loadUniversityData = async () => {
    setIsMeLoading(true)
    try {
      const res = await fetch("/api/university/me", { credentials: "include" })
      const me = await res.json().catch(() => null)
      if (!res.ok || !me?.id) {
        setIsAdmin(false)
        return
      }
      const dbId = Number(me.id)
      const blockchainId = me.blockchainId != null ? Number(me.blockchainId) : null
      setDbUniversityId(dbId)
      setUniversityId(blockchainId)
      setUniversity({
        id: blockchainId != null ? BigInt(blockchainId) : BigInt(0),
        nameEn: me.name ?? "",
        nameAr: me.nameAr ?? "",
        admin: "",
        exists: true,
        isActive: true,
      })
      setIsAdmin(true)
      const deferMs = getPageLoadRpcDeferMs()
      if (blockchainId != null) setTimeout(() => loadVerifierInfo(blockchainId), deferMs)
    } catch (error) {
      console.error("Error loading university data:", error)
      setIsAdmin(false)
    } finally {
      setIsMeLoading(false)
    }
  }

  const loadVerifierInfo = async (uniId: number) => {
    try {
      const [count, required] = await Promise.all([
        getVerifierCount(uniId),
        getRequiredApprovals(uniId)
      ])
      setVerifierCount(count)
      setRequiredApprovals(required)
    } catch (error) {
      console.error("Error loading verifier info:", error)
    }
  }

  const apiUrl = `/api/university/verifiers?page=${currentPage}&limit=20${
    searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
  }${selectedStatus !== "all" ? `&status=${selectedStatus}` : ""}`

  const { data: verifiersData, isLoading: isLoadingData, error: verifiersError, mutate: refreshVerifiers } = useSWR(
    universityUser ? apiUrl : null,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true, dedupingInterval: 2000 }
  )

  const verifiers: Verifier[] = (verifiersData?.verifiers || []).map((v: Record<string, unknown>) => ({
    id: v.id as number,
    address: (v.walletAddress ?? v.wallet_address ?? "") as string,
    name: v.name as string | undefined,
    email: v.email as string | undefined,
    phone: v.phone as string | undefined,
    department: v.department as string | undefined,
    position: v.position as string | undefined,
    isActive: (v.isActive ?? v.is_active ?? true) as boolean,
    addedAt: v.createdAt ? new Date(v.createdAt as string) : v.created_at ? new Date(v.created_at as string) : undefined,
    onboardingStatus: (v.onboardingStatus ?? v.status) as Verifier["onboardingStatus"],
    verifiedOnChain: (v.blockchainVerified ?? v.blockchain_verified) as boolean | undefined,
    ndaSigned: v.ndaSigned as boolean | undefined,
    ndaSignedAt: (v.ndaSignedAt ?? v.nda_signed_at) as string | null | undefined,
    walletSubmitted: v.walletSubmitted as boolean | undefined,
  }))

  const pagination = verifiersData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
  const stats = verifiersData?.stats || { total: 0, onBlockchain: 0, active: 0, pending: 0 }

  const handleRefresh = async () => {
    await refreshVerifiers()
    if (universityId != null) await loadVerifierInfo(universityId)
    toast.success("Verifiers list refreshed")
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
    updateFilters({ search: value || null, page: "1" })
  }

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value)
    setCurrentPage(1)
    updateFilters({ status: value === "all" ? null : value, page: "1" })
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    updateFilters({ page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleString()
  }

  const resetForm = () => {
    setNewVerifierForm(initialFormState)
  }

  const verifyVerifierOnChain = async (verifierAddress: string) => {
    if (!universityId) return
    setCheckingAddress(verifierAddress)
    try {
      const isOnChain = await checkIsVerifierOnChain(universityId, verifierAddress)
      if (isOnChain) {
        toast.success("Verifier verified on blockchain")
      } else {
        toast.warning("Verifier not found on blockchain - may need to be re-added")
      }
      await refreshVerifiers()
    } catch (error) {
      toast.error("Failed to verify verifier on blockchain")
    } finally {
      setCheckingAddress("")
    }
  }

  // Same flow as Super Admin "Add University": DB record + onboarding email; session identifies university
  const handleAddVerifier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVerifierForm.name || !newVerifierForm.email) {
      toast.error("Name and email are required")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/verifiers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newVerifierForm.name,
          email: newVerifierForm.email,
          phone: newVerifierForm.phone || undefined,
          department: newVerifierForm.department || undefined,
          position: newVerifierForm.position || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Verifier registered! Onboarding email sent. They will appear under Pending.")
        await refreshVerifiers(undefined, { revalidate: true })
        if (universityId != null) await loadVerifierInfo(universityId)
        resetForm()
        setIsDialogOpen(false)
      } else {
        if (response.status === 503) {
          toast.error("Database unavailable. Please try again later.")
        } else {
          toast.error(data.error || "Failed to register verifier")
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to register verifier")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveVerifier = async (verifierId: number, verifierAddress: string) => {
    if (!universityId || !verifierId) return

    setRemovingAddress(verifierAddress)
    try {
      toast.info("Removing verifier from blockchain...")
      const success = await removeVerifier(universityId, verifierAddress)

      if (!success) {
        toast.error("Failed to remove verifier from blockchain")
        setRemovingAddress("")
        return
      }

      const res = await fetch(`/api/university/verifiers/${verifierId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        toast.success("Verifier removed from blockchain and database.")
        await refreshVerifiers(undefined, { revalidate: true })
        if (universityId != null) await loadVerifierInfo(universityId)
        globalMutate(
          (key) => typeof key === "string" && (key.startsWith("/api/university/verifiers") || key.startsWith("/api/university/dashboard-stats")),
          undefined,
          { revalidate: true }
        )
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error ?? "Verifier removed on-chain; database update failed.")
        await refreshVerifiers(undefined, { revalidate: true })
        if (universityId != null) await loadVerifierInfo(universityId)
      }
    } catch (error: unknown) {
      console.error("Error removing verifier:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove verifier")
    } finally {
      setRemovingAddress("")
    }
  }

  const handleVerifierAction = async (verifierId: number, type: "resend") => {
    setActioningId(verifierId)
    setActionType(type)
    try {
      const res = await fetch(`/api/university/verifiers/${verifierId}/resend-onboarding`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(data.message ?? "Email sent.")
        await refreshVerifiers(undefined, { revalidate: true })
      } else {
        toast.error(data.error ?? "Failed to send email")
      }
    } catch (e) {
      toast.error("Failed to send email")
    } finally {
      setActioningId(null)
      setActionType(null)
    }
  }

  const canAddVerifier = isAdmin && verifierCount < MAX_VERIFIERS
  const canPerformActions = isConnected && isCorrectChain && isAdmin && university?.isActive
  const canAddMore = verifierCount < MAX_VERIFIERS
  const isLoading = isMeLoading

  if (isLoading && dbUniversityId == null) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Manage Verifiers" role="university" />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Manage Verifiers" role="university" />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {!canPerformActions && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {!isConnected ? "Connect your wallet to manage verifiers." : !isCorrectChain ? "Switch to Base Mainnet network." : !isAdmin ? "Only the university admin can manage verifiers." : "University is not active."}
            </AlertDescription>
          </Alert>
        )}

        {/* Header — same pattern as issuers/revokers */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Verifiers</h1>
            <p className="text-muted-foreground">Manage authorized verifiers for {university?.nameEn || "your university"} and their onboarding status</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoadingData}>
              <RefreshCw className={"h-4 w-4 mr-2" + (isLoadingData ? " animate-spin" : "")} />
              Refresh
            </Button>
            {canAddVerifier && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Verifier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Verifier</DialogTitle>
                    <DialogDescription>Creates a database record and sends an onboarding email. Maximum {MAX_VERIFIERS} verifiers allowed.</DialogDescription>
                  </DialogHeader>
                  <Alert className="border-primary/50 bg-primary/5">
                    <Mail className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm"><strong>Recommended:</strong> Creates database record and sends onboarding email.</AlertDescription>
                  </Alert>
                  <form onSubmit={handleAddVerifier} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="verifierName">Full Name <span className="text-destructive">*</span></Label>
                        <Input id="verifierName" placeholder="e.g., Dr. Jane Smith" value={newVerifierForm.name} onChange={(e) => setNewVerifierForm({ ...newVerifierForm, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="verifierEmail">Email Address <span className="text-destructive">*</span></Label>
                        <Input id="verifierEmail" type="email" placeholder="jane.smith@university.edu" value={newVerifierForm.email} onChange={(e) => setNewVerifierForm({ ...newVerifierForm, email: e.target.value })} required />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="verifierPhone">Phone Number</Label>
                        <Input id="verifierPhone" type="tel" placeholder="+1234567890" value={newVerifierForm.phone} onChange={(e) => setNewVerifierForm({ ...newVerifierForm, phone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="verifierDepartment">Department</Label>
                        <Input id="verifierDepartment" placeholder="e.g., Academic Affairs" value={newVerifierForm.department} onChange={(e) => setNewVerifierForm({ ...newVerifierForm, department: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verifierPosition">Position/Title</Label>
                      <Input id="verifierPosition" placeholder="e.g., Compliance Officer, Dean" value={newVerifierForm.position} onChange={(e) => setNewVerifierForm({ ...newVerifierForm, position: e.target.value })} />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...</> : <><Mail className="mr-2 h-4 w-4" /> Register & Send Email</>}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            {isAdmin && !canAddMore && (
              <Button disabled variant="outline"><AlertTriangle className="h-4 w-4 mr-2" /> Max {MAX_VERIFIERS} Verifiers</Button>
            )}
          </div>
        </div>

        {university && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Managing verifiers for</p>
                  <p className="text-lg font-semibold">{university.nameEn}</p>
                  <p className="text-sm text-muted-foreground" dir="rtl">{university.nameAr}</p>
                </div>
                <Badge variant="outline" className="text-primary border-primary">University ID: {universityId}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verifier Configuration — keep same */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Verifier Configuration</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div><p className="text-sm text-muted-foreground">Active Verifiers</p><p className="text-2xl font-bold">{verifierCount} / {MAX_VERIFIERS}</p></div>
                  <div><p className="text-sm text-muted-foreground">Required Approvals</p><p className="text-2xl font-bold">{requiredApprovals}</p></div>
                  <div><p className="text-sm text-muted-foreground">Approval Rule</p><p className="text-sm font-medium">{verifierCount === 2 ? "1 of 2" : verifierCount === 3 ? "2 of 3" : "N/A"}</p></div>
                  <div><p className="text-sm text-muted-foreground">Status</p><Badge variant={canAddMore ? "default" : "secondary"}>{canAddMore ? "Can Add More" : "Max Reached"}</Badge></div>
                </div>
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {verifierCount === 0 && "Add verifiers to enable approval workflow. With 2 verifiers, 1 approval is required. With 3 verifiers, 2 approvals are required."}
                    {verifierCount === 1 && "Add 1 more verifier to enable approval workflow (1 of 2 required)."}
                    {verifierCount === 2 && "Approval workflow active: 1 of 2 verifiers must approve requests."}
                    {verifierCount === 3 && "Approval workflow active: 2 of 3 verifiers must approve requests."}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name, email, wallet, or ID..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {!isLoadingData && verifiersData && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Verifiers</p><p className="text-2xl font-bold">{stats.total}</p></div><UserCheck className="h-8 w-8 text-muted-foreground opacity-50" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">On Blockchain</p><p className="text-2xl font-bold">{stats.onBlockchain}</p></div><CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{stats.active}</p></div><Activity className="h-8 w-8 text-primary opacity-50" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{stats.pending}</p></div><Clock className="h-8 w-8 text-amber-500 opacity-50" /></div></CardContent></Card>
          </div>
        )}

        {/* Verifiers Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" /> Authorized Verifiers</CardTitle>
              <CardDescription>
                {pagination.total > 0 ? "Showing " + (((pagination.page - 1) * pagination.limit) + 1) + " to " + Math.min(pagination.page * pagination.limit, pagination.total) + " of " + pagination.total + " verifiers" : "No verifiers found"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {verifiersError || verifiersData?.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {verifiersData?.error ?? "Failed to load verifiers. Please try again."}
                  {verifiersData?.details && <span className="block mt-2 text-sm opacity-90">{verifiersData.details}</span>}
                  {verifiersData?.hint && <span className="block mt-1 text-xs opacity-75">{verifiersData.hint}</span>}
                </AlertDescription>
              </Alert>
            ) : isLoadingData ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : verifiers.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No verifiers found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchQuery || selectedStatus !== "all" ? "Try adjusting your filters" : "No verifiers added yet. Add people who can approve requests on behalf of your university."}
                </p>
                {canPerformActions && canAddMore && !searchQuery && selectedStatus === "all" && (
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add First Verifier</Button>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Onboarding</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {verifiers.map((verifier, index) => (
                        <TableRow key={`verifier-${verifier.id ?? verifier.address ?? verifier.email ?? index}-${index}`}>
                          <TableCell className="font-mono text-sm">{verifier.id != null ? `#${verifier.id}` : "—"}</TableCell>
                          <TableCell>
                            <div><p className="font-medium">{verifier.name || "—"}</p>{verifier.email && <p className="text-xs text-muted-foreground">{verifier.email}</p>}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {verifier.address ? (
                              <div className="flex items-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-default select-all" title={verifier.address}>
                                      {verifier.address.slice(0, 6)}...{verifier.address.slice(-4)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs break-all font-mono text-xs">
                                    {verifier.address}
                                  </TooltipContent>
                                </Tooltip>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(verifier.address)
                                    toast.success("Wallet address copied to clipboard")
                                  }}
                                  title="Copy full address"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={verifier.ndaSigned ? "default" : "outline"} className="w-fit text-xs">{verifier.ndaSigned ? "✓ NDA" : "✗ NDA"}</Badge>
                              <Badge variant={verifier.walletSubmitted ? "default" : "outline"} className="w-fit text-xs">{verifier.walletSubmitted ? "✓ Wallet" : "✗ Wallet"}</Badge>
                              {verifier.verifiedOnChain && <Badge variant="outline" className="w-fit text-xs">✓ On-Chain</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                verifier.onboardingStatus === "suspended"
                                  ? "secondary"
                                  : verifier.onboardingStatus === "inactive"
                                    ? "outline"
                                    : verifier.verifiedOnChain
                                      ? "default"
                                      : verifier.onboardingStatus === "pending_blockchain"
                                        ? "secondary"
                                        : "outline"
                              }
                              className="gap-1"
                            >
                              {verifier.onboardingStatus === "suspended" ? (
                                <><Pause className="h-3 w-3" /> Suspended</>
                              ) : verifier.onboardingStatus === "inactive" ? (
                                <><XCircle className="h-3 w-3" /> Inactive</>
                              ) : verifier.verifiedOnChain ? (
                                <><CheckCircle2 className="h-3 w-3" /> Active</>
                              ) : verifier.onboardingStatus === "pending_blockchain" ? (
                                <><Clock className="h-3 w-3" /> Pending Blockchain</>
                              ) : verifier.onboardingStatus === "pending_wallet" ? (
                                <><Wallet className="h-3 w-3" /> Pending Wallet</>
                              ) : verifier.onboardingStatus === "pending_nda" ? (
                                <><Clock className="h-3 w-3" /> Pending NDA</>
                              ) : (
                                <><XCircle className="h-3 w-3" /> Pending</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell><span className="text-xs text-muted-foreground">{verifier.addedAt ? formatDate(verifier.addedAt) : "Never"}</span></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {verifier.address && (
                                <Button variant="ghost" size="sm" onClick={() => verifyVerifierOnChain(verifier.address)} disabled={checkingAddress === verifier.address}>
                                  {checkingAddress === verifier.address ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                  Verify
                                </Button>
                              )}
                              {!verifier.verifiedOnChain && verifier.onboardingStatus === "pending_blockchain" && verifier.address && verifier.ndaSigned && isAdmin && verifierCount < MAX_VERIFIERS && (
                                <Button variant="outline" size="sm" className="text-primary border-primary bg-transparent" onClick={async () => {
                                  if (!universityId || !verifier.address || !verifier.id) return
                                  try {
                                    toast.info("Adding to blockchain...")
                                    const success = await addVerifier(universityId, verifier.address)
                                    if (success) {
                                      await fetch(`/api/verifiers/${verifier.id}/activate`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: verifier.address }) })
                                      toast.success("Verifier added to blockchain!")
                                      await refreshVerifiers(undefined, { revalidate: true })
                                      if (universityId != null) await loadVerifierInfo(universityId)
                                      globalMutate(
                                        (key) => typeof key === "string" && (key.startsWith("/api/university/verifiers") || key.startsWith("/api/university/dashboard-stats")),
                                        undefined,
                                        { revalidate: true }
                                      )
                                    }
                                  } catch {
                                    toast.error("Failed to add to blockchain")
                                  }
                                }}>
                                  <Wallet className="h-4 w-4 mr-1" /> Add to Chain
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!verifier.verifiedOnChain && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => verifier.id != null && handleVerifierAction(verifier.id, "resend")}
                                        disabled={actioningId === verifier.id && actionType === "resend"}
                                        className="cursor-pointer"
                                      >
                                        {actioningId === verifier.id && actionType === "resend" ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Mail className="h-4 w-4 mr-2" />
                                        )}
                                        Resend onboarding email
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {verifier.verifiedOnChain && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => verifier.id != null && handleVerifierAction(verifier.id, "resend")}
                                        disabled={actioningId === verifier.id && actionType === "resend"}
                                        className="cursor-pointer"
                                      >
                                        {actioningId === verifier.id && actionType === "resend" ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Mail className="h-4 w-4 mr-2" />
                                        )}
                                        Resend email
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          const msg = verifier.ndaSignedAt
                                            ? `NDA signed on ${formatDate(verifier.ndaSignedAt)}`
                                            : "NDA not signed"
                                          toast.info(msg)
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <FileCheck className="h-4 w-4 mr-2" />
                                        View NDA
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => verifyVerifierOnChain(verifier.address)}
                                        disabled={checkingAddress === verifier.address}
                                        className="cursor-pointer"
                                      >
                                        Verify On-Chain
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          if (!verifier.id || !verifier.address || !canPerformActions) return
                                          try {
                                            toast.info("Removing verifier on-chain...")
                                            const success = await removeVerifier(universityId!, verifier.address)
                                            if (success) {
                                              const suspendRes = await fetch(`/api/university/verifiers/${verifier.id}/suspend`, {
                                                method: "POST",
                                                credentials: "include",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({}),
                                              })
                                              if (suspendRes.ok) {
                                                toast.success("Verifier paused (suspended)")
                                                await refreshVerifiers(undefined, { revalidate: true })
                                                if (universityId != null) await loadVerifierInfo(universityId)
                                                globalMutate(
                                                  (key) => typeof key === "string" && (key.startsWith("/api/university/verifiers") || key.startsWith("/api/university/dashboard-stats")),
                                                  undefined,
                                                  { revalidate: true }
                                                )
                                              } else {
                                                const err = await suspendRes.json().catch(() => ({}))
                                                toast.error(err?.error ?? "Failed to update verifier status")
                                              }
                                            } else {
                                              toast.error("Failed to remove on-chain")
                                            }
                                          } catch (e) {
                                            toast.error(e instanceof Error ? e.message : "Failed to pause verifier")
                                          }
                                        }}
                                        disabled={!canPerformActions}
                                        className="cursor-pointer"
                                      >
                                        Pause verifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => verifier.id != null && verifier.address && handleRemoveVerifier(verifier.id, verifier.address)}
                                        disabled={!canPerformActions || removingAddress === verifier.address}
                                        className="cursor-pointer text-destructive"
                                      >
                                        {removingAddress === verifier.address ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Delete verifier
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {verifier.address && !verifier.verifiedOnChain && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => verifyVerifierOnChain(verifier.address)}
                                        disabled={checkingAddress === verifier.address}
                                        className="cursor-pointer"
                                      >
                                        Verify On-Chain
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => verifier.id != null && verifier.address && handleRemoveVerifier(verifier.id, verifier.address)}
                                        disabled={!canPerformActions || removingAddress === verifier.address}
                                        className="cursor-pointer text-destructive"
                                      >
                                        {removingAddress === verifier.address ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Remove Verifier
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {verifier.email && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(verifier.email!)
                                    toast.success("Email copied to clipboard")
                                  }}
                                  title="Copy email"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function UniversityVerifiersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Manage Verifiers" role="university" />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    }>
      <UniversityVerifiersContent />
    </Suspense>
  )
}
