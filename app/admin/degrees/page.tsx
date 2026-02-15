"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PROTOCOL_ADDRESS } from "@/lib/contracts/abi"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import useSWR from "swr"
import {
  GraduationCap,
  Search,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  Award,
  RefreshCw,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  FileJson,
  Building2,
  TrendingUp,
  FileX,
  ArrowUpDown,
  Copy,
  Database,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Degree {
  id: number
  tokenId: string
  studentName: string | null
  studentNameAr: string | null
  studentAddress: string
  universityName: string | null
  universityNameAr: string | null
  degreeType: string | null
  major: string | null
  majorAr: string | null
  graduationDate: string | null
  cgpa: number | null
  isRevoked: boolean
  status: "active" | "revoked"
  txHash: string | null
  createdAt: string
  revokedAt: string | null
}

export default function DegreesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get filters from URL
  const rangeFromUrl = searchParams.get("range") || "30d"
  const statusFromUrl = searchParams.get("status") || "all"
  const universityIdFromUrl = searchParams.get("universityId")
  const searchFromUrl = searchParams.get("q") || searchParams.get("search") || ""
  const sortFromUrl = searchParams.get("sort") || "newest"
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10)

  const [selectedRange, setSelectedRange] = useState(rangeFromUrl)
  const [selectedStatus, setSelectedStatus] = useState(statusFromUrl)
  const [selectedUniversityId, setSelectedUniversityId] = useState(universityIdFromUrl || "all")
  const [searchQuery, setSearchQuery] = useState(searchFromUrl)
  const [selectedSort, setSelectedSort] = useState(sortFromUrl)
  const [currentPage, setCurrentPage] = useState(pageFromUrl)
  const [selectedDegree, setSelectedDegree] = useState<Degree | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [nftMetadata, setNftMetadata] = useState<any>(null)
  const [isLoadingNft, setIsLoadingNft] = useState(false)
  const [isDownloading, setIsDownloading] = useState<{ type: string; tokenId: string } | null>(null)

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
  const apiUrl = `/api/admin/degrees?range=${selectedRange}&status=${selectedStatus}&sort=${selectedSort}&page=${currentPage}&pageSize=20${
    searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
  }${selectedUniversityId !== "all" ? `&universityId=${selectedUniversityId}` : ""}`

  // Fetch degrees from enhanced admin API
  const { data: degreesData, error, isLoading, mutate: refreshDegrees } = useSWR(
    apiUrl,
    fetcher,
    { refreshInterval: 30000 }
  )

  const degrees: Degree[] = degreesData?.degrees || []
  const pagination = degreesData?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 }
  const stats = degreesData?.stats || {
    totalMinted: 0,
    mintedInRange: 0,
    totalRevoked: 0,
    revokedInRange: 0,
    pendingRevocations: 0,
  }
  const charts = degreesData?.charts || {
    mintedOverTime: [],
    revokedOverTime: [],
    topUniversities: [],
  }

  // Fetch universities for filter
  const { data: universitiesData } = useSWR("/api/admin/universities?limit=1000", fetcher)
  const universities = universitiesData?.universities || []

  // Handle filter changes
  const handleRangeChange = (value: string) => {
    setSelectedRange(value)
    setCurrentPage(1)
    updateFilters({ range: value === "30d" ? null : value, page: "1" })
  }

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value)
    setCurrentPage(1)
    updateFilters({ status: value === "all" ? null : value, page: "1" })
  }

  const handleUniversityChange = (value: string) => {
    setSelectedUniversityId(value)
    setCurrentPage(1)
    updateFilters({ universityId: value === "all" ? null : value, page: "1" })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
    updateFilters({ q: value || null, search: null, page: "1" })
  }

  const handleSortChange = (value: string) => {
    setSelectedSort(value)
    setCurrentPage(1)
    updateFilters({ sort: value === "newest" ? null : value, page: "1" })
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    updateFilters({ page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Handle degree detail view
  const handleViewDegree = async (degree: Degree) => {
    setSelectedDegree(degree)
    setIsDetailOpen(true)
    setIsLoadingNft(true)
    setNftMetadata(null)

    // Fetch NFT metadata
    try {
      const response = await fetch(`/api/admin/degrees/${degree.tokenId}/nft`)
      if (response.ok) {
        const data = await response.json()
        setNftMetadata(data)
      }
    } catch (error) {
      console.error("Failed to fetch NFT metadata:", error)
    } finally {
      setIsLoadingNft(false)
    }
  }

  // Download handlers (using fetch with credentials to ensure cookies are sent)
  const handleDownloadPNG = async (tokenId: string) => {
    setIsDownloading({ type: "png", tokenId })
    try {
      const response = await fetch(`/api/admin/degrees/${tokenId}/download.png`, {
        credentials: "include",
        headers: {
          "Accept": "image/*",
        },
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to download" }))
        toast.error(error.error || "Failed to download PNG")
        setIsDownloading(null)
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `degree-${tokenId}-nft.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("PNG downloaded successfully")
    } catch (error: any) {
      console.error("Download error:", error)
      toast.error("Failed to download PNG: " + (error.message || "Unknown error"))
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDownloadJSON = async (tokenId: string) => {
    setIsDownloading({ type: "json", tokenId })
    try {
      const response = await fetch(`/api/admin/degrees/${tokenId}/metadata.json`, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to download" }))
        toast.error(error.error || "Failed to download metadata")
        setIsDownloading(null)
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `degree-${tokenId}-metadata.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Metadata downloaded successfully")
    } catch (error: any) {
      console.error("Download error:", error)
      toast.error("Failed to download metadata: " + (error.message || "Unknown error"))
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDownloadPDF = async (tokenId: string) => {
    setIsDownloading({ type: "pdf", tokenId })
    try {
      const response = await fetch(`/api/admin/degrees/${tokenId}/certificate.pdf`, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to download" }))
        toast.error(error.error || "Failed to download PDF")
        setIsDownloading(null)
        return
      }
      const data = await response.json()
      // For now, PDF generation returns JSON - redirect to verification page
      if (data.verificationUrl) {
        window.open(data.verificationUrl, "_blank")
        toast.info("PDF generation not yet implemented. Opening verification page for printing.")
      } else {
        toast.error("PDF generation not yet implemented")
      }
    } catch (error: any) {
      console.error("Download error:", error)
      toast.error("Failed to download PDF: " + (error.message || "Unknown error"))
    } finally {
      setIsDownloading(null)
    }
  }

  const handleExportCSV = () => {
    const filters = new URLSearchParams()
    if (selectedRange !== "30d") filters.set("range", selectedRange)
    if (selectedStatus !== "all") filters.set("status", selectedStatus)
    if (selectedUniversityId !== "all") filters.set("universityId", selectedUniversityId)
    if (searchQuery) filters.set("q", searchQuery)
    window.open(`/api/admin/degrees/export.csv?${filters.toString()}`, "_blank")
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return "N/A"
    }
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Degrees" showAuth />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Degree Certificates</h1>
            <p className="text-muted-foreground">
              Manage and monitor all blockchain-verified degree certificates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => refreshDegrees()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Minted</p>
                  <p className="text-2xl font-bold">{stats.totalMinted}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Minted in Range</p>
                  <p className="text-2xl font-bold">{stats.mintedInRange}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revoked</p>
                  <p className="text-2xl font-bold">{stats.totalRevoked}</p>
                </div>
                <FileX className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revoked in Range</p>
                  <p className="text-2xl font-bold">{stats.revokedInRange}</p>
                </div>
                <XCircle className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Revocations</p>
                  <p className="text-2xl font-bold">{stats.pendingRevocations}</p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Degrees Minted Over Time</CardTitle>
              <CardDescription>Daily count of degrees issued</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : charts.mintedOverTime.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={charts.mintedOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revocations Over Time</CardTitle>
              <CardDescription>Daily count of degrees revoked</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : charts.revokedOverTime.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={charts.revokedOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#ff7300" fill="#ff7300" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Universities Chart */}
        {charts.topUniversities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Universities by Minted Degrees</CardTitle>
              <CardDescription>Universities with most degrees issued in selected range</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.topUniversities}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="degreesCount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Token ID, student, wallet, tx hash..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Time Range</label>
                <Select value={selectedRange} onValueChange={handleRangeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">University</label>
                <Select value={selectedUniversityId} onValueChange={handleUniversityChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All universities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Universities</SelectItem>
                    {universities.map((u: any) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name_en || u.name || `University #${u.blockchain_id || u.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select value={selectedSort} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest Issued</SelectItem>
                    <SelectItem value="oldest">Oldest Issued</SelectItem>
                    <SelectItem value="newest_revoked">Newest Revoked</SelectItem>
                    <SelectItem value="tokenId_asc">Token ID (Asc)</SelectItem>
                    <SelectItem value="tokenId_desc">Token ID (Desc)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Degrees Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Registered Degrees</CardTitle>
              <CardDescription>
                {pagination.total > 0
                  ? `Showing ${((pagination.page - 1) * pagination.pageSize) + 1} to ${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} degrees`
                  : "No degrees found"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>Failed to load degrees. Please try again.</AlertDescription>
              </Alert>
            ) : isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : degrees.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No degrees found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchQuery || selectedStatus !== "all" || selectedUniversityId !== "all"
                    ? "Try adjusting your filters"
                    : "No degrees have been issued yet"}
                </p>
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
                            onClick={() => handleSortChange(selectedSort === "tokenId_asc" ? "tokenId_desc" : "tokenId_asc")}
                          >
                            Token ID
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>University</TableHead>
                        <TableHead>Major</TableHead>
                        <TableHead>Graduation</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -ml-3"
                            onClick={() => handleSortChange(selectedSort === "newest" ? "oldest" : "newest")}
                          >
                            Status
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {degrees.map((degree) => (
                        <TableRow key={degree.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDegree(degree)}>
                          <TableCell className="font-mono font-medium">#{degree.tokenId}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{degree.studentName || "N/A"}</div>
                              {degree.studentNameAr && (
                                <div className="text-sm text-muted-foreground" dir="rtl">
                                  {degree.studentNameAr}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">
                              {degree.universityName || "Unknown"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[150px] truncate">{degree.major || "N/A"}</div>
                          </TableCell>
                          <TableCell>
                            {degree.graduationDate
                              ? new Date(degree.graduationDate).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={degree.isRevoked ? "destructive" : "default"} className="gap-1">
                              {degree.isRevoked ? (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  Revoked
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDegree(degree)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`https://basescan.org/nft/${PROTOCOL_ADDRESS}/${degree.tokenId}`, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
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
                      Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{" "}
                      {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                      {pagination.total} degrees
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

        {/* Degree Detail Sheet */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            {selectedDegree && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Degree Certificate #{selectedDegree.tokenId}
                  </SheetTitle>
                  <SheetDescription>
                    {selectedDegree.universityName || "Unknown University"}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* NFT Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>NFT Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isLoadingNft ? (
                        <Skeleton className="h-[300px] w-full" />
                      ) : nftMetadata?.imageUrl ? (
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                          <img
                            src={nftMetadata.imageUrl}
                            alt={`Degree NFT #${selectedDegree.tokenId}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] border rounded-lg bg-muted/50">
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
                            <p className="text-sm text-muted-foreground">No image available</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPNG(selectedDegree.tokenId)}
                          disabled={!nftMetadata?.imageUrl || (isDownloading?.type === "png" && isDownloading?.tokenId === selectedDegree.tokenId)}
                        >
                          {isDownloading?.type === "png" && isDownloading?.tokenId === selectedDegree.tokenId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Download PNG
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadJSON(selectedDegree.tokenId)}
                          disabled={isDownloading?.type === "json" && isDownloading?.tokenId === selectedDegree.tokenId}
                        >
                          {isDownloading?.type === "json" && isDownloading?.tokenId === selectedDegree.tokenId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <FileJson className="h-4 w-4 mr-2" />
                              Download Metadata
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(selectedDegree.tokenId)}
                          disabled={isDownloading?.type === "pdf" && isDownloading?.tokenId === selectedDegree.tokenId}
                        >
                          {isDownloading?.type === "pdf" && isDownloading?.tokenId === selectedDegree.tokenId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Download PDF
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Degree Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Degree Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm text-muted-foreground">Student Name (English)</label>
                          <p className="font-medium">{selectedDegree.studentName || "N/A"}</p>
                        </div>
                        {selectedDegree.studentNameAr && (
                          <div>
                            <label className="text-sm text-muted-foreground">Student Name (Arabic)</label>
                            <p className="font-medium" dir="rtl">{selectedDegree.studentNameAr}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm text-muted-foreground">Student Address</label>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm">{selectedDegree.studentAddress}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopy(selectedDegree.studentAddress, "Address")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">University</label>
                          <p className="font-medium">{selectedDegree.universityName || "Unknown"}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Major</label>
                          <p className="font-medium">{selectedDegree.major || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Degree Type</label>
                          <p className="font-medium">{selectedDegree.degreeType || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Graduation Date</label>
                          <p className="font-medium">
                            {selectedDegree.graduationDate
                              ? new Date(selectedDegree.graduationDate).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        {selectedDegree.cgpa != null && (
                          <div>
                            <label className="text-sm text-muted-foreground">CGPA</label>
                            <p className="font-medium">
                              {typeof selectedDegree.cgpa === "number" 
                                ? selectedDegree.cgpa.toFixed(2) 
                                : String(selectedDegree.cgpa)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-sm text-muted-foreground">Status</label>
                          <Badge variant={selectedDegree.isRevoked ? "destructive" : "default"}>
                            {selectedDegree.isRevoked ? "Revoked" : "Active"}
                          </Badge>
                        </div>
                        {selectedDegree.txHash && (
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-muted-foreground">Transaction Hash</label>
                            <div className="flex items-center gap-1">
                              <p className="font-mono text-xs">{selectedDegree.txHash.slice(0, 10)}...</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopy(selectedDegree.txHash!, "Transaction Hash")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => window.open(`https://basescan.org/tx/${selectedDegree.txHash}`, "_blank")}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="mt-2">
                          <label className="text-sm text-muted-foreground">Issued At</label>
                          <p className="text-sm">{formatDate(selectedDegree.createdAt)}</p>
                        </div>
                        {selectedDegree.revokedAt && (
                          <div className="mt-2">
                            <label className="text-sm text-muted-foreground">Revoked At</label>
                            <p className="text-sm">{formatDate(selectedDegree.revokedAt)}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* NFT Metadata Attributes */}
                  {nftMetadata?.metadata?.attributes && nftMetadata.metadata.attributes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>NFT Attributes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2">
                          {nftMetadata.metadata.attributes.map((attr: any, idx: number) => (
                            <div key={idx} className="flex justify-between p-2 rounded border">
                              <span className="text-sm text-muted-foreground">{attr.trait_type || attr.name}:</span>
                              <span className="text-sm font-medium">{String(attr.value)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/verify?tokenId=${selectedDegree.tokenId}`, "_blank")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verify Page
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`https://basescan.org/nft/${PROTOCOL_ADDRESS}/${selectedDegree.tokenId}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on BaseScan
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
