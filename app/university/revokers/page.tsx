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
import { toast } from "sonner"
import { 
  FileX, 
  Plus, 
  Loader2, 
  AlertTriangle, 
  Trash2, 
  UserX, 
  CheckCircle2, 
  RefreshCw,
  Mail,
  Wallet,
  Clock,
  Search,
  Activity,
  ChevronLeft,
  ChevronRight,
  XCircle,
  MoreHorizontal,
  FileCheck,
  Pause,
} from "lucide-react"
import { checkIsRevokerOnChain, type BlockchainUniversity } from "@/lib/blockchain"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

interface Revoker {
  id?: number
  address: string
  name?: string
  email?: string
  phone?: string
  department?: string
  position?: string
  isActive: boolean
  addedAt?: Date
  onboardingStatus?: "pending_nda" | "pending_wallet" | "pending_blockchain" | "active" | "suspended" | "inactive"
  verifiedOnChain?: boolean
  ndaSigned?: boolean
  ndaSignedAt?: string | null
  walletSubmitted?: boolean
}

interface NewRevokerForm {
  name: string
  email: string
  phone: string
  department: string
  position: string
}

const initialFormState: NewRevokerForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  position: "",
}

function UniversityRevokersContent() {
  const { universityUser } = useAuth()
  const { isConnected, isCorrectChain } = useWeb3()
  const { grantRevoker, revokeRevoker } = useContract()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [university, setUniversity] = useState<BlockchainUniversity | null>(null)
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [dbUniversityId, setDbUniversityId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newRevokerForm, setNewRevokerForm] = useState<NewRevokerForm>(initialFormState)
  const [removingAddress, setRemovingAddress] = useState("")
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [actionType, setActionType] = useState<"resend" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkingAddress, setCheckingAddress] = useState("")
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
    } catch (error) {
      console.error("Error loading university data:", error)
      setIsAdmin(false)
    } finally {
      setIsMeLoading(false)
    }
  }

  const apiUrl = `/api/university/revokers?page=${currentPage}&limit=20${
    searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
  }${selectedStatus !== "all" ? `&status=${selectedStatus}` : ""}`

  const { data: revokersData, isLoading: isLoadingData, error: revokersError, mutate: refreshRevokers } = useSWR(
    universityUser ? apiUrl : null,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true, dedupingInterval: 2000 }
  )

  const revokers: Revoker[] = (revokersData?.revokers || []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    address: (r.walletAddress ?? r.wallet_address ?? "") as string,
    name: r.name as string | undefined,
    email: r.email as string | undefined,
    phone: r.phone as string | undefined,
    department: r.department as string | undefined,
    position: r.position as string | undefined,
    isActive: (r.isActive ?? r.is_active ?? true) as boolean,
    addedAt: r.createdAt ? new Date(r.createdAt as string) : r.created_at ? new Date(r.created_at as string) : undefined,
    onboardingStatus: (r.onboardingStatus ?? r.status) as Revoker["onboardingStatus"],
    verifiedOnChain: (r.blockchainVerified ?? r.blockchain_verified) as boolean | undefined,
    ndaSigned: r.ndaSigned as boolean | undefined,
    ndaSignedAt: (r.ndaSignedAt ?? r.nda_signed_at) as string | null | undefined,
    walletSubmitted: r.walletSubmitted as boolean | undefined,
  }))

  const pagination = revokersData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
  const stats = revokersData?.stats || { total: 0, onBlockchain: 0, active: 0, pending: 0 }

  const handleRefresh = async () => {
    await refreshRevokers()
    toast.success("Revokers list refreshed")
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
    setNewRevokerForm(initialFormState)
  }

  const verifyRevokerOnChain = async (revokerAddress: string) => {
    if (!universityId) return
    setCheckingAddress(revokerAddress)
    try {
      const isOnChain = await checkIsRevokerOnChain(universityId, revokerAddress)
      if (isOnChain) {
        toast.success("Revoker verified on blockchain")
      } else {
        toast.warning("Revoker not found on blockchain - may need to be re-added")
      }
      await refreshRevokers()
    } catch (error) {
      toast.error("Failed to verify revoker on blockchain")
    } finally {
      setCheckingAddress("")
    }
  }

  // Same flow as Super Admin "Add University": DB record + onboarding email; session identifies university
  const handleAddRevoker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRevokerForm.name || !newRevokerForm.email) {
      toast.error("Name and email are required")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/revokers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newRevokerForm.name,
          email: newRevokerForm.email,
          phone: newRevokerForm.phone || undefined,
          department: newRevokerForm.department || undefined,
          position: newRevokerForm.position || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Revoker registered! Onboarding email sent. They will appear under Pending.")
        await refreshRevokers(undefined, { revalidate: true })
        resetForm()
        setIsDialogOpen(false)
      } else {
        if (response.status === 503) {
          toast.error("Database unavailable. Please try again later.")
        } else {
          toast.error(data.error || "Failed to register revoker")
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to register revoker")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveRevoker = async (revokerId: number, revokerAddress: string) => {
    if (!universityId || !revokerId) return

    setRemovingAddress(revokerAddress)
    try {
      toast.info("Removing revoker from blockchain...")
      const success = await revokeRevoker(universityId, revokerAddress)

      if (!success) {
        toast.error("Failed to remove revoker from blockchain")
        setRemovingAddress("")
        return
      }

      const res = await fetch(`/api/university/revokers/${revokerId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        toast.success("Revoker removed from blockchain and database.")
        await refreshRevokers(undefined, { revalidate: true })
        globalMutate(
          (key) => typeof key === "string" && (key.startsWith("/api/university/revokers") || key.startsWith("/api/university/dashboard-stats")),
          undefined,
          { revalidate: true }
        )
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error ?? "Revoker removed on-chain; database update failed.")
        await refreshRevokers(undefined, { revalidate: true })
      }
    } catch (error: unknown) {
      console.error("Error removing revoker:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove revoker")
    } finally {
      setRemovingAddress("")
    }
  }

  const handleRevokerAction = async (revokerId: number, type: "resend") => {
    setActioningId(revokerId)
    setActionType(type)
    try {
      const res = await fetch(`/api/university/revokers/${revokerId}/resend-onboarding`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(data.message ?? "Email sent.")
        await refreshRevokers(undefined, { revalidate: true })
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

  const canAddRevoker = isAdmin
  const canPerformActions = isConnected && isCorrectChain && isAdmin && university?.isActive
  const isLoading = isMeLoading

  if (isLoading && dbUniversityId == null) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Manage Revokers" role="university" />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Manage Revokers" role="university" />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {!canPerformActions && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {!isConnected
                ? "Connect your wallet to manage revokers."
                : !isCorrectChain
                  ? "Switch to Base Mainnet network."
                  : !isAdmin
                    ? "Only the university admin can manage revokers."
                    : "University is not active."}
            </AlertDescription>
          </Alert>
        )}

        {/* Header — same pattern as issuers */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Revokers</h1>
            <p className="text-muted-foreground">
              Manage authorized revokers for {university?.nameEn || "your university"} and their onboarding status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoadingData}>
              <RefreshCw className={"h-4 w-4 mr-2" + (isLoadingData ? " animate-spin" : "")} />
              Refresh
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button disabled={!canAddRevoker} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Revoker
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Revoker</DialogTitle>
                  <DialogDescription>
                    Creates a database record and sends an onboarding email. The revoker will complete setup (NDA, wallet, blockchain) via the link in the email.
                  </DialogDescription>
                </DialogHeader>
                <Alert className="border-orange-500/50 bg-orange-500/5">
                  <Mail className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="text-sm">
                    <strong>Recommended:</strong> Creates database record and sends onboarding email.
                  </AlertDescription>
                </Alert>
                <form onSubmit={handleAddRevoker} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="revokerName">Full Name <span className="text-destructive">*</span></Label>
                      <Input id="revokerName" placeholder="Dr. Jane Doe" value={newRevokerForm.name} onChange={(e) => setNewRevokerForm({ ...newRevokerForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="revokerEmail">Email Address <span className="text-destructive">*</span></Label>
                      <Input id="revokerEmail" type="email" placeholder="jane.doe@university.edu" value={newRevokerForm.email} onChange={(e) => setNewRevokerForm({ ...newRevokerForm, email: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="revokerPhone">Phone Number</Label>
                      <Input id="revokerPhone" type="tel" placeholder="+1234567890" value={newRevokerForm.phone} onChange={(e) => setNewRevokerForm({ ...newRevokerForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="revokerDepartment">Department</Label>
                      <Input id="revokerDepartment" placeholder="e.g., Academic Affairs" value={newRevokerForm.department} onChange={(e) => setNewRevokerForm({ ...newRevokerForm, department: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revokerPosition">Position/Title</Label>
                    <Input id="revokerPosition" placeholder="e.g., Compliance Officer, Dean" value={newRevokerForm.position} onChange={(e) => setNewRevokerForm({ ...newRevokerForm, position: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
                      {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...</> : <><Mail className="mr-2 h-4 w-4" /> Register & Send Email</>}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {university && (
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Managing revokers for</p>
                  <p className="text-lg font-semibold">{university.nameEn}</p>
                  <p className="text-sm text-muted-foreground" dir="rtl">{university.nameAr}</p>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-600">University ID: {universityId}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Bar — same pattern as issuers */}
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

        {/* Stats Summary — same pattern as issuers */}
        {!isLoadingData && revokersData && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Revokers</p><p className="text-2xl font-bold">{stats.total}</p></div><FileX className="h-8 w-8 text-muted-foreground opacity-50" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">On Blockchain</p><p className="text-2xl font-bold">{stats.onBlockchain}</p></div><CheckCircle2 className="h-8 w-8 text-orange-500 opacity-50" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{stats.active}</p></div><Activity className="h-8 w-8 text-orange-500 opacity-50" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{stats.pending}</p></div><Clock className="h-8 w-8 text-amber-500 opacity-50" /></div></CardContent></Card>
          </div>
        )}

        {/* Revokers Table — same structure as issuers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><FileX className="h-5 w-5" /> Authorized Revokers</CardTitle>
              <CardDescription>
                {pagination.total > 0 ? "Showing " + (((pagination.page - 1) * pagination.limit) + 1) + " to " + Math.min(pagination.page * pagination.limit, pagination.total) + " of " + pagination.total + " revokers" : "No revokers found"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {revokersError || revokersData?.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {revokersData?.error ?? "Failed to load revokers. Please try again."}
                  {revokersData?.details && <span className="block mt-2 text-sm opacity-90">{revokersData.details}</span>}
                  {revokersData?.hint && <span className="block mt-1 text-xs opacity-75">{revokersData.hint}</span>}
                </AlertDescription>
              </Alert>
            ) : isLoadingData ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : revokers.length === 0 ? (
              <div className="text-center py-12">
                <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No revokers found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchQuery || selectedStatus !== "all" ? "Try adjusting your filters" : "No revokers added yet. Add people who can revoke degrees on behalf of your university."}
                </p>
                {canPerformActions && !searchQuery && selectedStatus === "all" && (
                  <Button className="mt-4 bg-orange-600 hover:bg-orange-700" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add First Revoker
                  </Button>
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
                      {revokers.map((revoker, index) => (
                        <TableRow key={`revoker-${revoker.id ?? revoker.address ?? revoker.email ?? index}-${index}`}>
                          <TableCell className="font-mono text-sm">{revoker.id != null ? `#${revoker.id}` : "—"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{revoker.name || "—"}</p>
                              {revoker.email && <p className="text-xs text-muted-foreground">{revoker.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {revoker.address ? <span>{revoker.address.slice(0, 6)}...{revoker.address.slice(-4)}</span> : <Badge variant="outline" className="text-xs">Pending</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={revoker.ndaSigned ? "default" : "outline"} className="w-fit text-xs">{revoker.ndaSigned ? "✓ NDA" : "✗ NDA"}</Badge>
                              <Badge variant={revoker.walletSubmitted ? "default" : "outline"} className="w-fit text-xs">{revoker.walletSubmitted ? "✓ Wallet" : "✗ Wallet"}</Badge>
                              {revoker.verifiedOnChain && <Badge variant="outline" className="w-fit text-xs">✓ On-Chain</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                revoker.onboardingStatus === "suspended"
                                  ? "secondary"
                                  : revoker.onboardingStatus === "inactive"
                                    ? "outline"
                                    : revoker.verifiedOnChain
                                      ? "default"
                                      : revoker.onboardingStatus === "pending_blockchain"
                                        ? "secondary"
                                        : "outline"
                              }
                              className="gap-1"
                            >
                              {revoker.onboardingStatus === "suspended" ? (
                                <><Pause className="h-3 w-3" /> Suspended</>
                              ) : revoker.onboardingStatus === "inactive" ? (
                                <><XCircle className="h-3 w-3" /> Inactive</>
                              ) : revoker.verifiedOnChain ? (
                                <><CheckCircle2 className="h-3 w-3" /> Active</>
                              ) : revoker.onboardingStatus === "pending_blockchain" ? (
                                <><Clock className="h-3 w-3" /> Pending Blockchain</>
                              ) : revoker.onboardingStatus === "pending_wallet" ? (
                                <><Wallet className="h-3 w-3" /> Pending Wallet</>
                              ) : revoker.onboardingStatus === "pending_nda" ? (
                                <><Clock className="h-3 w-3" /> Pending NDA</>
                              ) : (
                                <><XCircle className="h-3 w-3" /> Pending</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{revoker.addedAt ? formatDate(revoker.addedAt) : "Never"}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {revoker.address && (
                                <Button variant="ghost" size="sm" onClick={() => verifyRevokerOnChain(revoker.address)} disabled={checkingAddress === revoker.address}>
                                  {checkingAddress === revoker.address ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                  Verify
                                </Button>
                              )}
                              {!revoker.verifiedOnChain && revoker.onboardingStatus === "pending_blockchain" && revoker.address && isAdmin && (
                                <Button variant="outline" size="sm" className="text-orange-500 border-orange-500 bg-transparent" onClick={async () => {
                                  if (!universityId || !revoker.address) return
                                  try {
                                    toast.info("Adding to blockchain...")
                                    const success = await grantRevoker(universityId, revoker.address)
                                    if (success) {
                                      await fetch(`/api/revokers/${revoker.id}/activate`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: revoker.address }) })
                                      toast.success("Revoker added to blockchain!")
                                      await refreshRevokers()
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
                                  {!revoker.verifiedOnChain && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => revoker.id != null && handleRevokerAction(revoker.id, "resend")}
                                        disabled={actioningId === revoker.id && actionType === "resend"}
                                        className="cursor-pointer"
                                      >
                                        {actioningId === revoker.id && actionType === "resend" ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Mail className="h-4 w-4 mr-2" />
                                        )}
                                        Resend onboarding email
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {revoker.verifiedOnChain && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => revoker.id != null && handleRevokerAction(revoker.id, "resend")}
                                        disabled={actioningId === revoker.id && actionType === "resend"}
                                        className="cursor-pointer"
                                      >
                                        {actioningId === revoker.id && actionType === "resend" ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Mail className="h-4 w-4 mr-2" />
                                        )}
                                        Resend email
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          const msg = revoker.ndaSignedAt
                                            ? `NDA signed on ${formatDate(revoker.ndaSignedAt)}`
                                            : "NDA not signed"
                                          toast.info(msg)
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <FileCheck className="h-4 w-4 mr-2" />
                                        View NDA
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => verifyRevokerOnChain(revoker.address)}
                                        disabled={checkingAddress === revoker.address}
                                        className="cursor-pointer"
                                      >
                                        Verify On-Chain
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          if (!revoker.id || !revoker.address || !canPerformActions) return
                                          try {
                                            toast.info("Revoking revoker on-chain...")
                                            const success = await revokeRevoker(universityId!, revoker.address)
                                            if (success) {
                                              const suspendRes = await fetch(`/api/university/revokers/${revoker.id}/suspend`, {
                                                method: "POST",
                                                credentials: "include",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({}),
                                              })
                                              if (suspendRes.ok) {
                                                toast.success("Revoker paused (suspended)")
                                                await refreshRevokers(undefined, { revalidate: true })
                                                globalMutate(
                                                  (key) => typeof key === "string" && (key.startsWith("/api/university/revokers") || key.startsWith("/api/university/dashboard-stats")),
                                                  undefined,
                                                  { revalidate: true }
                                                )
                                              } else {
                                                const err = await suspendRes.json().catch(() => ({}))
                                                toast.error(err?.error ?? "Failed to update revoker status")
                                              }
                                            } else {
                                              toast.error("Failed to revoke on-chain")
                                            }
                                          } catch (e) {
                                            toast.error(e instanceof Error ? e.message : "Failed to pause revoker")
                                          }
                                        }}
                                        disabled={!canPerformActions}
                                        className="cursor-pointer"
                                      >
                                        Pause revoker
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => revoker.id != null && revoker.address && handleRemoveRevoker(revoker.id, revoker.address)}
                                        disabled={!canPerformActions || removingAddress === revoker.address}
                                        className="cursor-pointer text-destructive"
                                      >
                                        {removingAddress === revoker.address ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Delete revoker
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {revoker.address && !revoker.verifiedOnChain && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => verifyRevokerOnChain(revoker.address)}
                                        disabled={checkingAddress === revoker.address}
                                        className="cursor-pointer"
                                      >
                                        Verify On-Chain
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => revoker.id != null && revoker.address && handleRemoveRevoker(revoker.id, revoker.address)}
                                        disabled={!canPerformActions || removingAddress === revoker.address}
                                        className="cursor-pointer text-destructive"
                                      >
                                        {removingAddress === revoker.address ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Remove Revoker
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-semibold">On-Chain Verification:</h3>
                <p className="text-sm text-muted-foreground">
                  Revoker roles are stored directly on the Base Mainnet blockchain and synced to our database. Use the
                  "Verify" button to confirm an address's revoker status on-chain. Adding or removing revokers requires
                  a blockchain transaction signed by the university admin wallet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function UniversityRevokersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <UniversityRevokersContent />
    </Suspense>
  )
}
