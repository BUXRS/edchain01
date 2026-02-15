"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useContract, type University } from "@/hooks/use-contract"
import useSWR from "swr"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Building2,
  Plus,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserCog,
  Mail,
  Eye,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  Users,
  GraduationCap,
  FileCheck,
  FileX,
  Activity,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function UniversitiesPage() {
  const { isConnected, isCorrectChain, isContractOwner, address, checkIsContractOwner } = useWeb3()
  const {
    registerUniversity,
    setUniversityStatus,
    updateUniversityAdmin,
    isLoading: contractLoading,
    error: contractError,
  } = useContract()
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [isCheckingOwner, setIsCheckingOwner] = useState(false)

  // Get filters from URL
  const searchFromUrl = searchParams.get("search") || ""
  const statusFromUrl = searchParams.get("status") || "all"
  const hasAdminFromUrl = searchParams.get("hasAdmin") || "all"
  const sortByFromUrl = searchParams.get("sortBy") || "created_at"
  const sortOrderFromUrl = searchParams.get("sortOrder") || "desc"
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10)

  const [searchQuery, setSearchQuery] = useState(searchFromUrl)
  const [selectedStatus, setSelectedStatus] = useState(statusFromUrl)
  const [selectedHasAdmin, setSelectedHasAdmin] = useState(hasAdminFromUrl)
  const [selectedSortBy, setSelectedSortBy] = useState(sortByFromUrl)
  const [selectedSortOrder, setSelectedSortOrder] = useState(sortOrderFromUrl)
  const [currentPage, setCurrentPage] = useState(pageFromUrl)

  // Build query string
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

  // Update URL when filters change
  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const query = buildQueryString(updates)
      router.push(`?${query}`, { scroll: false })
    },
    [buildQueryString, router]
  )

  // Build API URL
  const apiUrl = `/api/admin/universities?page=${currentPage}&limit=20&sortBy=${selectedSortBy}&sortOrder=${selectedSortOrder}${
    searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
  }${selectedStatus !== "all" ? `&status=${selectedStatus}` : ""}${
    selectedHasAdmin !== "all" ? `&hasAdmin=${selectedHasAdmin}` : ""
  }&includeRegistration=true`

  // ✅ DB-FIRST ARCHITECTURE: Fetch from enhanced admin API
  const { data: universitiesData, isLoading: isLoadingData, error: universitiesError, mutate: refreshUniversities } = useSWR(
    apiUrl,
    fetcher,
    { refreshInterval: 30000 }
  )

  const universities = universitiesData?.universities || []
  const pagination = universitiesData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false)
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [registrationType, setRegistrationType] = useState<"trial" | "blockchain_only">("trial")
  const [newUniversity, setNewUniversity] = useState({
    admin: "",
    nameAr: "",
    nameEn: "",
    adminName: "",
    adminEmail: "",
    phone: "",
    city: "",
    address: "",
    trialDays: "30",
  })
  const [newAdmin, setNewAdmin] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRefresh = async () => {
    await refreshUniversities()
    toast.success("Universities list refreshed")
  }

  const handleRecheckOwner = async () => {
    setIsCheckingOwner(true)
    try {
      const isOwner = await checkIsContractOwner()
      if (isOwner) {
        toast.success("Contract owner verified! You can now manage universities.")
      } else {
        toast.error("You are not the contract owner. Please connect with the owner wallet.")
      }
    } catch (error) {
      toast.error("Failed to verify contract owner status")
    } finally {
      setIsCheckingOwner(false)
    }
  }

  const handleRegisterUniversity = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (registrationType === "blockchain_only") {
      if (!newUniversity.admin || !newUniversity.nameAr || !newUniversity.nameEn) {
        toast.error("Please fill in all required fields")
        return
      }

      try {
        const id = await registerUniversity(newUniversity.admin, newUniversity.nameAr, newUniversity.nameEn)
        if (id !== null) {
          toast.success(`University registered with ID: ${id}`)
          resetForm()
          setIsDialogOpen(false)
          await refreshUniversities()
        } else {
          toast.error("Failed to register university")
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to register university")
      }
    } else {
      if (!newUniversity.nameEn || !newUniversity.nameAr || !newUniversity.adminName || !newUniversity.adminEmail) {
        toast.error("Please fill in all required fields")
        return
      }

      setIsSubmitting(true)
      try {
        const response = await fetch("/api/admin/universities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newUniversity.nameEn,
            nameAr: newUniversity.nameAr,
            adminName: newUniversity.adminName,
            adminEmail: newUniversity.adminEmail,
            phone: newUniversity.phone,
            city: newUniversity.city,
            address: newUniversity.address,
            isTrial: true,
            trialDays: parseInt(newUniversity.trialDays),
          }),
        })

        const data = await response.json()
        if (response.ok) {
          toast.success("University registered! Onboarding email sent to admin.")
          resetForm()
          setIsDialogOpen(false)
          await refreshUniversities()
        } else {
          if (response.status === 503) {
            toast.error("Database unavailable. Try 'Blockchain Only' registration instead.")
            setRegistrationType("blockchain_only")
          } else {
            toast.error(data.error || "Failed to register university")
          }
        }
      } catch (error: any) {
        toast.error("Network error. Please check your connection and try again.")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const resetForm = () => {
    setNewUniversity({
      admin: "",
      nameAr: "",
      nameEn: "",
      adminName: "",
      adminEmail: "",
      phone: "",
      city: "",
      address: "",
      trialDays: "30",
    })
    setRegistrationType("trial")
  }

  const handleToggleStatus = async (university: any) => {
    if (!university.blockchainId) {
      toast.error("University must be registered on blockchain first")
      return
    }
    try {
      const success = await setUniversityStatus(Number(university.blockchainId), !university.isActive)
      if (success) {
        toast.success(`University ${university.isActive ? "deactivated" : "activated"} successfully`)
        await refreshUniversities()
      } else {
        toast.error("Failed to update university status")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update status")
    }
  }

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUniversity || !newAdmin) return

    if (!selectedUniversity.blockchainId) {
      toast.error("University must be registered on blockchain first")
      return
    }

    try {
      const success = await updateUniversityAdmin(Number(selectedUniversity.blockchainId), newAdmin)
      if (success) {
        toast.success("University admin updated successfully")
        setNewAdmin("")
        setIsAdminDialogOpen(false)
        setSelectedUniversity(null)
        await refreshUniversities()
      } else {
        toast.error("Failed to update admin")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update admin")
    }
  }

  // Handle filter changes
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

  const handleHasAdminChange = (value: string) => {
    setSelectedHasAdmin(value)
    setCurrentPage(1)
    updateFilters({ hasAdmin: value === "all" ? null : value, page: "1" })
  }

  const handleSortChange = (field: string) => {
    if (selectedSortBy === field) {
      // Toggle order
      const newOrder = selectedSortOrder === "asc" ? "desc" : "asc"
      setSelectedSortOrder(newOrder)
      updateFilters({ sortOrder: newOrder })
    } else {
      setSelectedSortBy(field)
      setSelectedSortOrder("desc")
      updateFilters({ sortBy: field, sortOrder: "desc" })
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    updateFilters({ page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const canPerformActions = isConnected && isCorrectChain && isContractOwner

  // Format date
  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleString()
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Universities" showAuth />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Universities Management</h1>
            <p className="text-muted-foreground">
              Manage all registered universities and their blockchain status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoadingData}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button disabled={!canPerformActions}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register University
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Register New University</DialogTitle>
                  <DialogDescription>
                    Add a new university to the platform. Choose the registration method below.
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs value={registrationType} onValueChange={(v) => setRegistrationType(v as "trial" | "blockchain_only")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="trial">Standard Registration</TabsTrigger>
                    <TabsTrigger value="blockchain_only">Direct Blockchain</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="trial" className="space-y-4 mt-4">
                    <Alert className="border-primary/50 bg-primary/5">
                      <Mail className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-sm">
                        <strong>Recommended:</strong> Creates database record and sends onboarding email.
                      </AlertDescription>
                    </Alert>
                    
                    <form onSubmit={handleRegisterUniversity} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="nameEn">University Name (English) <span className="text-destructive">*</span></Label>
                          <Input
                            id="nameEn"
                            placeholder="e.g., Oxford University"
                            value={newUniversity.nameEn}
                            onChange={(e) => setNewUniversity({ ...newUniversity, nameEn: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nameAr">University Name (Arabic) <span className="text-destructive">*</span></Label>
                          <Input
                            id="nameAr"
                            placeholder="e.g., جامعة أكسفورد"
                            value={newUniversity.nameAr}
                            onChange={(e) => setNewUniversity({ ...newUniversity, nameAr: e.target.value })}
                            dir="rtl"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="adminName">Admin Full Name <span className="text-destructive">*</span></Label>
                          <Input
                            id="adminName"
                            placeholder="e.g., Dr. John Smith"
                            value={newUniversity.adminName}
                            onChange={(e) => setNewUniversity({ ...newUniversity, adminName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="adminEmail">Admin Email <span className="text-destructive">*</span></Label>
                          <Input
                            id="adminEmail"
                            type="email"
                            placeholder="admin@university.edu"
                            value={newUniversity.adminEmail}
                            onChange={(e) => setNewUniversity({ ...newUniversity, adminEmail: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            placeholder="+1 234 567 8900"
                            value={newUniversity.phone}
                            onChange={(e) => setNewUniversity({ ...newUniversity, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            placeholder="e.g., Cambridge"
                            value={newUniversity.city}
                            onChange={(e) => setNewUniversity({ ...newUniversity, city: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          placeholder="Full university address..."
                          value={newUniversity.address}
                          onChange={(e) => setNewUniversity({ ...newUniversity, address: e.target.value })}
                          rows={2}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="trialDays">Trial Period</Label>
                        <Select
                          value={newUniversity.trialDays}
                          onValueChange={(v) => setNewUniversity({ ...newUniversity, trialDays: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="14">14 Days</SelectItem>
                            <SelectItem value="30">30 Days</SelectItem>
                            <SelectItem value="60">60 Days</SelectItem>
                            <SelectItem value="90">90 Days</SelectItem>
                          </SelectContent>
                        </Select>
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
                  </TabsContent>
                  
                  <TabsContent value="blockchain_only" className="space-y-4 mt-4">
                    <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Advanced:</strong> Direct blockchain registration bypasses onboarding flow.
                      </AlertDescription>
                    </Alert>
                    
                    <form onSubmit={handleRegisterUniversity} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nameEnBc">University Name (English) <span className="text-destructive">*</span></Label>
                        <Input
                          id="nameEnBc"
                          placeholder="e.g., Oxford University"
                          value={newUniversity.nameEn}
                          onChange={(e) => setNewUniversity({ ...newUniversity, nameEn: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nameArBc">University Name (Arabic) <span className="text-destructive">*</span></Label>
                        <Input
                          id="nameArBc"
                          placeholder="e.g., جامعة أكسفورد"
                          value={newUniversity.nameAr}
                          onChange={(e) => setNewUniversity({ ...newUniversity, nameAr: e.target.value })}
                          dir="rtl"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adminBc">Admin Wallet Address <span className="text-destructive">*</span></Label>
                        <Input
                          id="adminBc"
                          placeholder="0x..."
                          value={newUniversity.admin}
                          onChange={(e) => setNewUniversity({ ...newUniversity, admin: e.target.value })}
                          className="font-mono"
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={contractLoading} variant="destructive">
                          {contractLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Registering...
                            </>
                          ) : (
                            "Register Directly on Blockchain"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Wallet Connection Alert */}
        {!canPerformActions && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {!isConnected
                  ? "Please connect your wallet to manage universities."
                  : !isCorrectChain
                    ? "Please switch to the Base network to manage universities."
                    : "Only the contract owner can manage universities."}
              </span>
              {isConnected && isCorrectChain && !isContractOwner && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRecheckOwner}
                  disabled={isCheckingOwner}
                  className="ml-4 bg-transparent"
                >
                  {isCheckingOwner ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Verify Owner
                    </>
                  )}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Bar */}
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
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Wallet</label>
                <Select value={selectedHasAdmin} onValueChange={handleHasAdminChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Has Admin</SelectItem>
                    <SelectItem value="false">Missing Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {!isLoadingData && universitiesData && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Universities</p>
                    <p className="text-2xl font-bold">{pagination.total}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">On Blockchain</p>
                    <p className="text-2xl font-bold">
                      {universities.filter((u: any) => u.blockchain_id).length}
                    </p>
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
                    <p className="text-2xl font-bold">
                      {universities.filter((u: any) => u.is_active).length}
                    </p>
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
                    <p className="text-2xl font-bold">
                      {universities.filter((u: any) => u.status === "pending").length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Universities Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Registered Universities</CardTitle>
              <CardDescription>
                {pagination.total > 0 
                  ? `Showing ${((pagination.page - 1) * pagination.limit) + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} universities`
                  : "No universities found"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {universitiesError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load universities. Please try again.
                </AlertDescription>
              </Alert>
            ) : isLoadingData ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : universities.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No universities found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchQuery || selectedStatus !== "all" || selectedHasAdmin !== "all"
                    ? "Try adjusting your filters"
                    : "No universities registered yet"}
                </p>
                {canPerformActions && !searchQuery && selectedStatus === "all" && selectedHasAdmin === "all" && (
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Register First University
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -ml-3"
                            onClick={() => handleSortChange("blockchain_id")}
                          >
                            ID
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -ml-3"
                            onClick={() => handleSortChange("name_en")}
                          >
                            Name
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Metrics</TableHead>
                        <TableHead>Onboarding</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -ml-3"
                            onClick={() => handleSortChange("is_active")}
                          >
                            Status
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {universities.map((uni: any) => (
                        <TableRow key={uni.id || uni.blockchain_id}>
                          <TableCell className="font-mono text-sm">
                            {uni.blockchain_id ? (
                              <div>
                                <p className="font-medium">#{uni.blockchain_id}</p>
                                <p className="text-xs text-muted-foreground">DB: {uni.id}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">DB-{uni.id}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{uni.name_en || uni.name}</p>
                              {uni.name_ar && (
                                <p className="text-sm text-muted-foreground" dir="rtl">
                                  {uni.name_ar}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {uni.admin_wallet || uni.wallet_address ? (
                              <div>
                                <p className="text-xs">
                                  {(uni.admin_wallet || uni.wallet_address).slice(0, 6)}...
                                  {(uni.admin_wallet || uni.wallet_address).slice(-4)}
                                </p>
                                {uni.admin_email && (
                                  <p className="text-xs text-muted-foreground mt-1">{uni.admin_email}</p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Not set
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {uni.issuers_count || 0} Issuers
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileX className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {uni.revokers_count || 0} Revokers
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileCheck className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {uni.verifiers_count || 0} Verifiers
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <GraduationCap className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {uni.degrees_issued || 0} Degrees
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={uni.nda_signed ? "default" : "outline"} className="w-fit text-xs">
                                {uni.nda_signed ? "✓ NDA" : "✗ NDA"}
                              </Badge>
                              <Badge variant={uni.wallet_submitted ? "default" : "outline"} className="w-fit text-xs">
                                {uni.wallet_submitted ? "✓ Wallet" : "✗ Wallet"}
                              </Badge>
                              {uni.blockchain_id && (
                                <Badge variant="outline" className="w-fit text-xs">
                                  ✓ On-Chain
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={uni.is_active ? "default" : uni.status === "pending" ? "secondary" : "destructive"} 
                              className="gap-1"
                            >
                              {uni.is_active ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </>
                              ) : uni.status === "pending" ? (
                                <>
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  Inactive
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {uni.last_event_at ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Activity className="h-3 w-3" />
                                {formatDate(uni.last_event_at)}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/universities/${uni.id}/view`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </Link>
                              {uni.blockchain_id && canPerformActions && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link href={`/admin/universities/${uni.id}/view`} className="flex items-center cursor-pointer">
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/admin/universities/${uni.id}/status`)}
                                      className="cursor-pointer"
                                    >
                                      <Settings className="h-4 w-4 mr-2" />
                                      Change Status
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUniversity({
                                          id: BigInt(uni.blockchain_id),
                                          dbId: uni.id,
                                          admin: uni.admin_wallet || uni.wallet_address || "",
                                          nameEn: uni.name_en || uni.name || "",
                                          nameAr: uni.name_ar || "",
                                          exists: true,
                                          isActive: uni.is_active || false,
                                          status: uni.status || "pending",
                                          blockchainId: uni.blockchain_id,
                                        } as University)
                                        setNewAdmin(uni.admin_wallet || uni.wallet_address || "")
                                        setIsAdminDialogOpen(true)
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <UserCog className="h-4 w-4 mr-2" />
                                      Change Admin
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                      {pagination.total} universities
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

        {/* Change Admin Dialog */}
        <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change University Admin</DialogTitle>
              <DialogDescription>
                Update the admin wallet for {selectedUniversity?.nameEn}. The new admin will have full control over
                issuers and revokers.
              </DialogDescription>
            </DialogHeader>
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
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAdminDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={contractLoading}>
                  {contractLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Admin"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
