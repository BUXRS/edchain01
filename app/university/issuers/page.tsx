"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  FileCheck,
  Plus,
  Loader2,
  AlertTriangle,
  Trash2,
  UserCheck,
  RefreshCw,
  Mail,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  MoreHorizontal,
  Activity,
  ChevronLeft,
  ChevronRight,
  Pause,
} from "lucide-react"
import { checkIsIssuerOnChain, type BlockchainUniversity } from "@/lib/blockchain"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

interface IssuerInfo {
  id?: number
  address: string
  name?: string
  email?: string
  phone?: string
  department?: string
  position?: string
  addedAt: Date
  isActive: boolean
  onboardingStatus?: "pending_nda" | "pending_wallet" | "pending_blockchain" | "active" | "suspended" | "inactive"
  verifiedOnChain?: boolean
  ndaSigned?: boolean
  ndaSignedAt?: string | null
  walletSubmitted?: boolean
  walletSubmittedAt?: string | null
}

// Same concept as Super Admin "Add University": name + email + optional fields; onboarding email sent; no wallet in form
interface NewIssuerForm {
  name: string
  email: string
  phone: string
  department: string
  position: string
}

const initialFormState: NewIssuerForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  position: "",
}

export default function UniversityIssuersPage() {
  const { universityUser } = useAuth()
  const { isConnected, isCorrectChain, address } = useWeb3()
  const { grantIssuer, revokeIssuer, isLoading: contractLoading } = useContract()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [university, setUniversity] = useState<BlockchainUniversity | null>(null)
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [dbUniversityId, setDbUniversityId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newIssuerForm, setNewIssuerForm] = useState<NewIssuerForm>(initialFormState)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [reactivatingId, setReactivatingId] = useState<number | null>(null)
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [actionType, setActionType] = useState<"resend" | "nda" | "wallet" | null>(null)
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

  // Load university on mount and when auth updates (session cookie is source of truth for /api/university/me)
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

  // Session-based API: server uses logged-in university id. No need for dbUniversityId for the list.
  const apiUrl = `/api/university/issuers?page=${currentPage}&limit=20&sortOrder=desc${
    searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
  }${selectedStatus !== "all" ? `&status=${selectedStatus}` : ""}`

  const { data: issuersData, isLoading: isLoadingData, error: issuersError, mutate: refreshIssuers } = useSWR(
    apiUrl,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true, dedupingInterval: 2000 }
  )

  // Include all issuers (active and pending) so new issuers show immediately under Pending
  const issuers: IssuerInfo[] = (issuersData?.issuers || []).map((i: any) => ({
    id: i.id,
    address: i.walletAddress ?? i.wallet_address ?? "",
    name: i.name,
    email: i.email,
    phone: i.phone,
    department: i.department,
    position: i.position,
    isActive: i.isActive ?? i.is_active,
    addedAt: i.createdAt ? new Date(i.createdAt) : (i.created_at ? new Date(i.created_at) : new Date()),
    onboardingStatus: i.onboardingStatus ?? i.onboarding_status,
    verifiedOnChain: i.blockchainVerified ?? i.blockchain_verified ?? undefined,
    ndaSigned: i.ndaSigned ?? !!(i.ndaSignedAt ?? i.nda_signed_at),
    ndaSignedAt: i.ndaSignedAt ?? i.nda_signed_at ?? null,
    walletSubmitted: i.walletSubmitted ?? !!(i.walletSubmittedAt ?? (i.walletAddress && i.walletAddress.trim())),
    walletSubmittedAt: i.walletSubmittedAt ?? i.wallet_submitted_at ?? null,
  }))

  const pagination = issuersData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
  const stats = issuersData?.stats || { total: 0, onBlockchain: 0, active: 0, pending: 0 }

  const handleRefresh = async () => {
    await refreshIssuers()
    toast.success("Issuers list refreshed")
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
    setNewIssuerForm(initialFormState)
  }

  const checkAddressIsIssuer = async (addr: string): Promise<boolean> => {
    if (!universityId) return false
    return await checkIsIssuerOnChain(universityId, addr)
  }

  // Same flow as Super Admin "Register University": DB record + onboarding email; session identifies university (no universityId/addedBy in body)
  const handleAddIssuer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIssuerForm.name || !newIssuerForm.email) {
      toast.error("Name and email are required")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/issuers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newIssuerForm.name,
          email: newIssuerForm.email,
          phone: newIssuerForm.phone || undefined,
          department: newIssuerForm.department || undefined,
          position: newIssuerForm.position || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Issuer registered! Onboarding email sent. They will appear under Pending.")
        await refreshIssuers(undefined, { revalidate: true })
        resetForm()
        setIsDialogOpen(false)
      } else {
        if (response.status === 503) {
          toast.error("Database unavailable. Please try again later.")
        } else {
          toast.error(data.error || "Failed to register issuer")
        }
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to register issuer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveIssuer = async (issuerId: number, issuerAddress: string) => {
    if (!universityId || !issuerId) return
    setRemovingId(issuerId)
    try {
      toast.info("Removing issuer from blockchain...")
      const success = await revokeIssuer(universityId, issuerAddress)
      if (!success) {
        toast.error("Transaction failed - check your wallet")
        return
      }
      const res = await fetch(`/api/university/issuers/${issuerId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        toast.success("Issuer removed from blockchain and database.")
        await refreshIssuers(undefined, { revalidate: true })
        globalMutate(
          (key) => typeof key === "string" && (key.startsWith("/api/university/issuers") || key.startsWith("/api/university/dashboard-stats")),
          undefined,
          { revalidate: true }
        )
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error ?? "Issuer removed on-chain; database update failed.")
        await refreshIssuers(undefined, { revalidate: true })
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove issuer")
    } finally {
      setRemovingId(null)
    }
  }

  const handleIssuerAction = async (issuerId: number, type: "resend" | "nda" | "wallet") => {
    setActioningId(issuerId)
    setActionType(type)
    try {
      const path = type === "resend" ? "resend-onboarding" : type === "nda" ? "send-nda" : "request-wallet"
      const res = await fetch(`/api/university/issuers/${issuerId}/${path}`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(data.message ?? "Email sent.")
        await refreshIssuers(undefined, { revalidate: true })
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

  const handleVerifyIssuer = async (addr: string) => {
    if (!universityId) return
    setCheckingAddress(addr)
    try {
      const isIssuer = await checkIsIssuerOnChain(universityId, addr)
      if (isIssuer) {
        toast.success(`${addr.slice(0, 6)}...${addr.slice(-4)} is a verified issuer on-chain`)
      } else {
        toast.error(`${addr.slice(0, 6)}...${addr.slice(-4)} is NOT an issuer on-chain`)
        await refreshIssuers()
      }
    } catch (error) {
      toast.error("Failed to verify issuer status")
    } finally {
      setCheckingAddress("")
    }
  }

  // Add Issuer: same as Super Admin adding university — session only (DB + email). Revoke/on-chain need wallet.
  const canAddIssuer = isAdmin
  const canPerformActions = isConnected && isCorrectChain && isAdmin && university?.isActive
  const isLoading = isMeLoading

  if (isLoading && dbUniversityId == null) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Manage Issuers" />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Manage Issuers" />

      <div className="p-6 space-y-6">
        {!canPerformActions && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {!isConnected
                ? "Connect your wallet to manage issuers."
                : !isCorrectChain
                  ? "Switch to Base Mainnet network."
                  : !isAdmin
                    ? "Only the university admin can manage issuers. Your connected wallet is not the admin for any university."
                    : "University is not active."}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Issuers</h1>
            <p className="text-muted-foreground">
              Manage authorized issuers for {university?.nameEn || "your university"} and their onboarding status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoadingData}>
              <RefreshCw className={"h-4 w-4 mr-2" + (isLoadingData ? " animate-spin" : "")} />
              Refresh
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button disabled={!canAddIssuer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Issuer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Issuer</DialogTitle>
                  <DialogDescription>
                    Same flow as Super Admin adding a university: creates a database record and sends an onboarding email. The issuer will complete setup (NDA, wallet, blockchain) via the link in the email.
                  </DialogDescription>
                </DialogHeader>

                <Alert className="border-primary/50 bg-primary/5">
                  <Mail className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <strong>Recommended:</strong> Creates database record and sends onboarding email.
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleAddIssuer} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="issuerName">Full Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="issuerName"
                        placeholder="e.g., Dr. John Smith"
                        value={newIssuerForm.name}
                        onChange={(e) => setNewIssuerForm({ ...newIssuerForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issuerEmail">Email Address <span className="text-destructive">*</span></Label>
                      <Input
                        id="issuerEmail"
                        type="email"
                        placeholder="john.smith@university.edu"
                        value={newIssuerForm.email}
                        onChange={(e) => setNewIssuerForm({ ...newIssuerForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="issuerPhone">Phone Number</Label>
                      <Input
                        id="issuerPhone"
                        type="tel"
                        placeholder="+1234567890"
                        value={newIssuerForm.phone}
                        onChange={(e) => setNewIssuerForm({ ...newIssuerForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issuerDepartment">Department</Label>
                      <Input
                        id="issuerDepartment"
                        placeholder="e.g., Computer Science"
                        value={newIssuerForm.department}
                        onChange={(e) => setNewIssuerForm({ ...newIssuerForm, department: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issuerPosition">Position/Title</Label>
                    <Input
                      id="issuerPosition"
                      placeholder="e.g., Registrar, Dean, Professor"
                      value={newIssuerForm.position}
                      onChange={(e) => setNewIssuerForm({ ...newIssuerForm, position: e.target.value })}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Register & Send Email
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {university && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Managing issuers for</p>
                  <p className="text-lg font-semibold">{university.nameEn}</p>
                  <p className="text-sm text-muted-foreground" dir="rtl">
                    {university.nameAr}
                  </p>
                </div>
                <Badge variant="outline" className="text-primary border-primary">
                  University ID: {universityId}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Bar - same pattern as super admin universities */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, wallet, or ID..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
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

        {/* Stats Summary - same pattern as super admin universities */}
        {!isLoadingData && issuersData && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Issuers</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">On Blockchain</p>
                    <p className="text-2xl font-bold">{stats.onBlockchain}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{stats.active}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Issuers Table - same structure as super admin universities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Authorized Issuers
              </CardTitle>
              <CardDescription>
                {pagination.total > 0
                  ? "Showing " + (((pagination.page - 1) * pagination.limit) + 1) + " to " + Math.min(pagination.page * pagination.limit, pagination.total) + " of " + pagination.total + " issuers"
                  : "No issuers found"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {issuersError || issuersData?.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {issuersData?.error ?? "Failed to load issuers. Please try again."}
                  {issuersData?.details && (
                    <span className="block mt-2 text-sm opacity-90">{issuersData.details}</span>
                  )}
                  {issuersData?.hint && (
                    <span className="block mt-1 text-xs opacity-75">{issuersData.hint}</span>
                  )}
                </AlertDescription>
              </Alert>
            ) : isLoadingData ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : issuers.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No issuers found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchQuery || selectedStatus !== "all"
                    ? "Try adjusting your filters"
                    : "No issuers added yet. Add people who can issue degrees on behalf of your university."}
                </p>
                {canPerformActions && !searchQuery && selectedStatus === "all" && (
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Issuer
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
                      {issuers.map((issuer) => (
                        <TableRow key={issuer.id ?? issuer.address ?? issuer.email ?? Math.random()}>
                          <TableCell className="font-mono text-sm">
                            {issuer.id != null ? (
                              <span>#{issuer.id}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{issuer.name || "—"}</p>
                              {issuer.email && (
                                <p className="text-xs text-muted-foreground">{issuer.email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {issuer.address ? (
                              <span>
                                {issuer.address.slice(0, 6)}...{issuer.address.slice(-4)}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-xs">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={issuer.ndaSigned ? "default" : "outline"} className="w-fit text-xs">
                                {issuer.ndaSigned ? "✓ NDA" : "✗ NDA"}
                              </Badge>
                              <Badge variant={issuer.walletSubmitted ? "default" : "outline"} className="w-fit text-xs">
                                {issuer.walletSubmitted ? "✓ Wallet" : "✗ Wallet"}
                              </Badge>
                              {issuer.verifiedOnChain && (
                                <Badge variant="outline" className="w-fit text-xs">
                                  ✓ On-Chain
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                issuer.onboardingStatus === "suspended"
                                  ? "secondary"
                                  : issuer.onboardingStatus === "inactive"
                                    ? "outline"
                                    : issuer.verifiedOnChain
                                      ? "default"
                                      : issuer.onboardingStatus === "pending_blockchain"
                                        ? "secondary"
                                        : "outline"
                              }
                              className="gap-1"
                            >
                              {issuer.onboardingStatus === "suspended" ? (
                                <>
                                  <Pause className="h-3 w-3" />
                                  Suspended
                                </>
                              ) : issuer.onboardingStatus === "inactive" ? (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  Inactive
                                </>
                              ) : issuer.verifiedOnChain ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </>
                              ) : issuer.onboardingStatus === "pending_blockchain" ? (
                                <>
                                  <Clock className="h-3 w-3" />
                                  Pending Blockchain
                                </>
                              ) : issuer.onboardingStatus === "pending_wallet" ? (
                                <>
                                  <Wallet className="h-3 w-3" />
                                  Pending Wallet
                                </>
                              ) : issuer.onboardingStatus === "pending_nda" ? (
                                <>
                                  <Clock className="h-3 w-3" />
                                  Pending NDA
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  Pending
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {issuer.addedAt ? (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(issuer.addedAt)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {issuer.address && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerifyIssuer(issuer.address)}
                                  disabled={checkingAddress === issuer.address}
                                >
                                  {checkingAddress === issuer.address ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Verify"
                                  )}
                                </Button>
                              )}
                              {!issuer.verifiedOnChain && issuer.onboardingStatus === "pending_blockchain" && issuer.address && issuer.ndaSigned && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-primary border-primary bg-transparent"
                                  onClick={async () => {
                                    if (!universityId || !issuer.address) return
                                    try {
                                      toast.info("Adding to blockchain...")
                                      const success = await grantIssuer(universityId, issuer.address)
                                      if (success) {
                                        toast.success("Issuer added to blockchain!")
                                        await fetch("/api/issuers/" + issuer.id + "/activate", {
                                          method: "POST",
                                          credentials: "include",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ walletAddress: issuer.address }),
                                        })
                                        await refreshIssuers()
                                      }
                                    } catch (error) {
                                      toast.error("Failed to add to blockchain")
                                    }
                                  }}
                                  disabled={contractLoading}
                                >
                                  <Wallet className="h-4 w-4 mr-1" />
                                  Add to Chain
                                </Button>
                              )}
                              {((issuer.onboardingStatus === "suspended") || (issuer.onboardingStatus === "inactive")) && issuer.address && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-primary border-primary bg-transparent"
                                  onClick={async () => {
                                    if (!universityId || !issuer.id || !issuer.address || !canPerformActions) return
                                    setReactivatingId(issuer.id)
                                    try {
                                      toast.info("Reactivating issuer on blockchain...")
                                      const success = await grantIssuer(universityId, issuer.address)
                                      if (success) {
                                        const reactivateRes = await fetch(`/api/university/issuers/${issuer.id}/reactivate`, {
                                          method: "POST",
                                          credentials: "include",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({}),
                                        })
                                        if (reactivateRes.ok) {
                                          toast.success("Issuer reactivated")
                                          await refreshIssuers(undefined, { revalidate: true })
                                          globalMutate(
                                            (key) => typeof key === "string" && (key.startsWith("/api/university/issuers") || key.startsWith("/api/university/dashboard-stats")),
                                            undefined,
                                            { revalidate: true }
                                          )
                                        } else {
                                          const err = await reactivateRes.json().catch(() => ({}))
                                          toast.error(err?.error ?? "Failed to update issuer status")
                                        }
                                      } else {
                                        toast.error("Failed to reactivate on blockchain")
                                      }
                                    } catch (e) {
                                      toast.error(e instanceof Error ? e.message : "Failed to reactivate issuer")
                                    } finally {
                                      setReactivatingId(null)
                                    }
                                  }}
                                  disabled={contractLoading || reactivatingId === issuer.id}
                                >
                                  {reactivatingId === issuer.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <UserCheck className="h-4 w-4 mr-1" />
                                  )}
                                  Reactivate
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!issuer.verifiedOnChain && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => issuer.id != null && handleIssuerAction(issuer.id, "resend")}
                                        disabled={actioningId === issuer.id && actionType === "resend"}
                                        className="cursor-pointer"
                                      >
                                        {actioningId === issuer.id && actionType === "resend" ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Mail className="h-4 w-4 mr-2" />
                                        )}
                                        Resend onboarding email
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => issuer.id != null && handleIssuerAction(issuer.id, "nda")}
                                        disabled={actioningId === issuer.id && actionType === "nda"}
                                        className="cursor-pointer"
                                      >
                                        {actioningId === issuer.id && actionType === "nda" ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <FileCheck className="h-4 w-4 mr-2" />
                                        )}
                                        Send NDA / agreement
                                      </DropdownMenuItem>
                                      {!issuer.address && (
                                        <DropdownMenuItem
                                          onClick={() => issuer.id != null && handleIssuerAction(issuer.id, "wallet")}
                                          disabled={actioningId === issuer.id && actionType === "wallet"}
                                          className="cursor-pointer"
                                        >
                                          {actioningId === issuer.id && actionType === "wallet" ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          ) : (
                                            <Wallet className="h-4 w-4 mr-2" />
                                          )}
                                          Request wallet
                                        </DropdownMenuItem>
                                      )}
                                      {((issuer.onboardingStatus === "suspended") || (issuer.onboardingStatus === "inactive")) && issuer.address && (
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            if (!universityId || !issuer.id || !issuer.address || !canPerformActions) return
                                            setReactivatingId(issuer.id)
                                            try {
                                              toast.info("Reactivating issuer on blockchain...")
                                              const success = await grantIssuer(universityId, issuer.address)
                                              if (success) {
                                                const reactivateRes = await fetch(`/api/university/issuers/${issuer.id}/reactivate`, {
                                                  method: "POST",
                                                  credentials: "include",
                                                  headers: { "Content-Type": "application/json" },
                                                  body: JSON.stringify({}),
                                                })
                                                if (reactivateRes.ok) {
                                                  toast.success("Issuer reactivated")
                                                  await refreshIssuers(undefined, { revalidate: true })
                                                  globalMutate(
                                                    (key) => typeof key === "string" && (key.startsWith("/api/university/issuers") || key.startsWith("/api/university/dashboard-stats")),
                                                    undefined,
                                                    { revalidate: true }
                                                  )
                                                } else {
                                                  const err = await reactivateRes.json().catch(() => ({}))
                                                  toast.error(err?.error ?? "Failed to update issuer status")
                                                }
                                              } else {
                                                toast.error("Failed to reactivate on blockchain")
                                              }
                                            } catch (e) {
                                              toast.error(e instanceof Error ? e.message : "Failed to reactivate issuer")
                                            } finally {
                                              setReactivatingId(null)
                                            }
                                          }}
                                          disabled={contractLoading || reactivatingId === issuer.id}
                                          className="cursor-pointer"
                                        >
                                          {reactivatingId === issuer.id ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          ) : (
                                            <UserCheck className="h-4 w-4 mr-2" />
                                          )}
                                          Reactivate issuer
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                  {issuer.verifiedOnChain && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => issuer.id != null && handleIssuerAction(issuer.id, "resend")}
                                        disabled={actioningId === issuer.id && actionType === "resend"}
                                        className="cursor-pointer"
                                      >
                                        {actioningId === issuer.id && actionType === "resend" ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Mail className="h-4 w-4 mr-2" />
                                        )}
                                        Resend email
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          const msg = issuer.ndaSignedAt
                                            ? `NDA signed on ${formatDate(issuer.ndaSignedAt)}`
                                            : "NDA not signed"
                                          toast.info(msg)
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <FileCheck className="h-4 w-4 mr-2" />
                                        View NDA
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleVerifyIssuer(issuer.address)}
                                        disabled={checkingAddress === issuer.address}
                                        className="cursor-pointer"
                                      >
                                        Verify On-Chain
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          if (!issuer.id || !issuer.address || !canPerformActions) return
                                          try {
                                            toast.info("Revoking issuer on-chain...")
                                            const success = await revokeIssuer(universityId!, issuer.address)
                                            if (success) {
                                              const suspendRes = await fetch(`/api/university/issuers/${issuer.id}/suspend`, {
                                                method: "POST",
                                                credentials: "include",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({}),
                                              })
                                              if (suspendRes.ok) {
                                                toast.success("Issuer paused (suspended)")
                                                await refreshIssuers(undefined, { revalidate: true })
                                                globalMutate(
                                                  (key) => typeof key === "string" && (key.startsWith("/api/university/issuers") || key.startsWith("/api/university/dashboard-stats")),
                                                  undefined,
                                                  { revalidate: true }
                                                )
                                              } else {
                                                const err = await suspendRes.json().catch(() => ({}))
                                                toast.error(err?.error ?? "Failed to update issuer status")
                                              }
                                            } else {
                                              toast.error("Failed to revoke on-chain")
                                            }
                                          } catch (e) {
                                            toast.error(e instanceof Error ? e.message : "Failed to pause issuer")
                                          }
                                        }}
                                        disabled={!canPerformActions || contractLoading}
                                        className="cursor-pointer"
                                      >
                                        Pause issuer
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => issuer.id != null && issuer.address && handleRemoveIssuer(issuer.id, issuer.address)}
                                        disabled={!canPerformActions || contractLoading || removingId === issuer.id}
                                        className="cursor-pointer text-destructive"
                                      >
                                        {removingId === issuer.id ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Delete issuer
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {issuer.address && !issuer.verifiedOnChain && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleVerifyIssuer(issuer.address)}
                                        disabled={checkingAddress === issuer.address}
                                        className="cursor-pointer"
                                      >
                                        Verify On-Chain
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => issuer.id != null && issuer.address && handleRemoveIssuer(issuer.id, issuer.address)}
                                        disabled={!canPerformActions || contractLoading || removingId === issuer.id}
                                        className="cursor-pointer text-destructive"
                                      >
                                        {removingId === issuer.id ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Remove Issuer
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
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} issuers
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>On-Chain Verification:</strong> Issuer roles are stored directly on the Base Mainnet blockchain. Use
            the "Verify" button to confirm an address's issuer status on-chain. Adding or removing issuers requires a
            blockchain transaction signed by the university admin wallet.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
