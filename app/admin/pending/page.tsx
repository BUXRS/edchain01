"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  GraduationCap,
  FileX,
  Eye,
  AlertTriangle,
  TrendingUp,
  Building2,
  User,
  Database,
} from "lucide-react"
import useSWR from "swr"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function PendingActionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get filters from URL
  const rangeFromUrl = searchParams.get("range") || "30d"
  const typeFromUrl = searchParams.get("type") || "all"
  const universityIdFromUrl = searchParams.get("universityId")
  const searchFromUrl = searchParams.get("search") || ""
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10)

  const [selectedRange, setSelectedRange] = useState(rangeFromUrl)
  const [selectedType, setSelectedType] = useState(typeFromUrl)
  const [selectedUniversityId, setSelectedUniversityId] = useState(universityIdFromUrl || "all")
  
  // Sync with URL on mount
  useEffect(() => {
    if (universityIdFromUrl) {
      setSelectedUniversityId(universityIdFromUrl)
    } else {
      setSelectedUniversityId("all")
    }
  }, [universityIdFromUrl])
  const [searchQuery, setSearchQuery] = useState(searchFromUrl)
  const [currentPage, setCurrentPage] = useState(pageFromUrl)
  const [activeTab, setActiveTab] = useState<"all" | "degree" | "revocation">(
    typeFromUrl === "degree" ? "degree" : typeFromUrl === "revocation" ? "revocation" : "all"
  )

  // Build query string
  const buildQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
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

  // Fetch universities for filter
  const { data: universitiesData } = useSWR("/api/admin/universities?limit=1000", fetcher)

  // Build API URL
  const apiUrl = `/api/admin/pending?range=${selectedRange}&type=${
    activeTab === "all" ? "" : activeTab
  }&status=pending&page=${currentPage}&pageSize=20&sort=created_at_desc${
    selectedUniversityId && selectedUniversityId !== "all" ? `&universityId=${selectedUniversityId}` : ""
  }${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`

  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: 30000, // Auto-refresh every 30 seconds
  })

  const items = data?.items || []
  const pagination = data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 }
  const counts = data?.counts || { degreeRequests: 0, revocationRequests: 0, total: 0 }
  const sync = data?.sync || {}

  // Handle tab change
  const handleTabChange = (value: string) => {
    const tabValue = value as "all" | "degree" | "revocation"
    setActiveTab(tabValue)
    setCurrentPage(1)
    updateFilters({
      type: tabValue === "all" ? null : tabValue,
      page: "1",
    })
  }

  // Handle filter changes
  const handleRangeChange = (value: string) => {
    setSelectedRange(value)
    setCurrentPage(1)
    updateFilters({ range: value, page: "1" })
  }

  const handleUniversityChange = (value: string) => {
    setSelectedUniversityId(value)
    setCurrentPage(1)
    updateFilters({ universityId: value === "all" ? null : value, page: "1" })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
    updateFilters({ search: value || null, page: "1" })
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    updateFilters({ page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Filter items by active tab
  const filteredItems =
    activeTab === "all"
      ? items
      : activeTab === "degree"
        ? items.filter((item: any) => item.itemType === "degree")
        : items.filter((item: any) => item.itemType === "revocation")

  // Get status badge
  const getStatusBadge = (item: any) => {
    if (item.approvalProgress >= 100) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </Badge>
      )
    } else if (item.approvalProgress > 0) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Pending
        </Badge>
      )
    }
  }

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString()
  }

  // Check if item is urgent (pending > 7 days)
  const isUrgent = (item: any) => {
    const daysSince = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > 7
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Pending Actions" showAuth />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pending Actions</h1>
            <p className="text-muted-foreground">
              Review and manage pending degree and revocation requests requiring approval
            </p>
          </div>
          <Button variant="outline" onClick={() => mutate()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Sync Status */}
        {sync.lastSyncedBlock && (
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Last synced: Block {sync.lastSyncedBlock?.toLocaleString()} •{" "}
              {sync.syncedAt ? formatDate(sync.syncedAt) : "Never"}
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-4">
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
                <label className="text-sm font-medium">University</label>
                <Select value={selectedUniversityId} onValueChange={handleUniversityChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All universities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All universities</SelectItem>
                    {(universitiesData?.universities || []).map((uni: any) => (
                      <SelectItem key={uni.id} value={uni.id.toString()}>
                        {uni.name_en || uni.name || `University #${uni.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by request ID, wallet, student name, token ID..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pending</p>
                  <p className="text-3xl font-bold">{counts.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Degree Requests</p>
                  <p className="text-3xl font-bold">{counts.degreeRequests}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <GraduationCap className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revocation Requests</p>
                  <p className="text-3xl font-bold">{counts.revocationRequests}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <FileX className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Items</CardTitle>
            <CardDescription>
              Review pending degree and revocation requests requiring action
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({counts.total})
                </TabsTrigger>
                <TabsTrigger value="degree">
                  Degree Requests ({counts.degreeRequests})
                </TabsTrigger>
                <TabsTrigger value="revocation">
                  Revocations ({counts.revocationRequests})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {error ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load pending items. Please try again.
                    </AlertDescription>
                  </Alert>
                ) : isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground font-medium">No pending items</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {searchQuery || (selectedUniversityId && selectedUniversityId !== "all")
                        ? "Try adjusting your filters"
                        : "All requests have been processed"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>University</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action Needed</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item: any) => (
                          <TableRow
                            key={`${item.itemType}-${item.id}`}
                            className={isUrgent(item) ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}
                          >
                            <TableCell>
                              {item.itemType === "degree" ? (
                                <Badge variant="outline" className="gap-1">
                                  <GraduationCap className="h-3 w-3" />
                                  Degree
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1">
                                  <FileX className="h-3 w-3" />
                                  Revocation
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              #{item.id}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.universityName}</p>
                                {item.universityBlockchainId && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    ID: {item.universityBlockchainId}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.itemType === "degree" ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">{item.studentName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {item.recipientAddress?.slice(0, 6)}...
                                    {item.recipientAddress?.slice(-4)}
                                  </p>
                                  {item.degreeNameEn && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.degreeNameEn}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">Token #{item.tokenId}</p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {item.requesterAddress?.slice(0, 6)}...
                                    {item.requesterAddress?.slice(-4)}
                                  </p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDate(item.createdAt)}
                              </div>
                              {isUrgent(item) && (
                                <Badge variant="destructive" className="mt-1 text-xs">
                                  Urgent
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 min-w-[120px]">
                                <div className="flex items-center justify-between text-xs">
                                  <span>
                                    {item.approvalsReceived}/{item.approvalsRequired}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {item.approvalProgress.toFixed(0)}%
                                  </span>
                                </div>
                                <Progress value={item.approvalProgress} className="h-2" />
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(item)}</TableCell>
                            <TableCell>
                              <p className="text-xs text-muted-foreground max-w-[150px]">
                                {item.actorsNeeded}
                              </p>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link
                                  href={
                                    item.itemType === "degree"
                                      ? `/admin/degree-requests/${item.id}`
                                      : `/admin/revocation-requests/${item.id}`
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-sm text-muted-foreground">
                          Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{" "}
                          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                          {pagination.total} items
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {pagination.page} of {pagination.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
