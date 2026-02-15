"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { useWeb3 } from "@/components/providers/web3-provider"
import useSWR from "swr"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
  Building2,
  GraduationCap,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  RefreshCw,
  Shield,
  TrendingUp,
  Database,
  Link2,
  FileCheck,
  FileX,
  Clock,
  Settings,
  Plus,
  Eye,
  MoreHorizontal,
  Blocks,
  Server,
  Zap,
  Loader2,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { isConnected, isCorrectChain, connect, switchChain, address } = useWeb3()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get time range from URL or default to 30d
  const rangeFromUrl = searchParams.get("range") || "30d"
  const [selectedPeriod, setSelectedPeriod] = useState(rangeFromUrl)
  const [isStartingIndexer, setIsStartingIndexer] = useState(false)

  // Update URL when period changes
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", value)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleStartIndexer = async () => {
    setIsStartingIndexer(true)
    try {
      const response = await fetch("/api/admin/indexer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      })
      const result = await response.json()
      if (result.success) {
        // Refresh sync status after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        alert(`Failed to start indexer: ${result.error || "Unknown error"}`)
        setIsStartingIndexer(false)
      }
    } catch (error: any) {
      alert(`Error starting indexer: ${error.message}`)
      setIsStartingIndexer(false)
    }
  }

  // Fetch data from new admin endpoints (DB-backed only)
  const { data: syncStatusData, error: syncError } = useSWR(
    "/api/admin/sync-status",
    fetcher,
    { refreshInterval: 15000 } // Auto-refresh every 15 seconds
  )

  const { data: metricsData, error: metricsError, mutate: refreshMetrics } = useSWR(
    `/api/admin/metrics?range=${selectedPeriod}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: activityData } = useSWR(
    "/api/admin/activity?limit=20",
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: topUniversitiesData } = useSWR(
    `/api/admin/universities/top?limit=10&range=${selectedPeriod}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: pendingRequestsData } = useSWR(
    "/api/admin/pending-requests",
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: universitiesData, isLoading: isLoadingUniversities, mutate: refreshUniversities } = useSWR(
    "/api/universities",
    fetcher,
    { refreshInterval: 30000 }
  )

  const universities = universitiesData?.universities || []
  const metrics = metricsData || {}
  const syncStatus = syncStatusData || {}
  const activity = activityData?.events || []
  const topUniversities = topUniversitiesData?.universities || []
  const pendingRequests = pendingRequestsData?.grouped || []

  const isLoading = !metricsData && !metricsError

  const handleRefresh = async () => {
    await Promise.all([
      refreshMetrics(),
      refreshUniversities(),
    ])
  }

  // Format sync status
  const syncStatusDisplay = syncStatus.indexerRunning
    ? syncStatus.syncMode === "websocket"
      ? "synced"
      : "synced"
    : "error"

  // Calculate date range display
  const getDateRangeDisplay = () => {
    switch (selectedPeriod) {
      case "7d":
        return "Last 7 days"
      case "30d":
        return "Last 30 days"
      case "90d":
        return "Last 90 days"
      case "all":
        return "All time"
      default:
        return "Last 30 days"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Super Admin Dashboard" showAuth />

      <div className="p-6 space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Protocol Overview</h1>
            <p className="text-muted-foreground">
              Monitor and manage EdChain from blockchain source of truth
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} className="bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Wallet Connection Status */}
        {!isConnected && (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertTitle>Wallet Not Connected</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Connect your wallet to perform on-chain admin actions.</span>
              <Button onClick={connect} size="sm" className="ml-4">
                Connect Wallet
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isConnected && !isCorrectChain && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Wrong Network</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Please switch to Base Mainnet network.</span>
              <Button onClick={switchChain} variant="outline" size="sm" className="ml-4 bg-transparent">
                Switch Network
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Sync Status Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sync Status
            </CardTitle>
            <CardDescription>Blockchain indexer and database synchronization status</CardDescription>
          </CardHeader>
          <CardContent>
            {syncError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Failed to load sync status</AlertDescription>
              </Alert>
            ) : !syncStatusData ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Synced Block</p>
                  <p className="text-2xl font-bold font-mono">
                    {syncStatus.lastSyncedBlock?.toLocaleString() || "0"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Finalized Block</p>
                  <p className="text-2xl font-bold font-mono">
                    {syncStatus.finalizedBlock?.toLocaleString() || "0"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sync Mode</p>
                  <Badge variant={syncStatus.syncMode === "websocket" ? "default" : "secondary"}>
                    {syncStatus.syncMode === "websocket" ? "WebSocket" : "Polling"}
                  </Badge>
                  {syncStatus.syncedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(syncStatus.syncedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Health Status</p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        syncStatus.indexerRunning && syncStatus.rpcHealth === "healthy"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm">
                      {syncStatus.indexerRunning && syncStatus.rpcHealth === "healthy"
                        ? "Healthy"
                        : "Unhealthy"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    RPC: {syncStatus.rpcHealth || "unknown"} | WS: {syncStatus.wsHealth || "unknown"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Universities</p>
                    <p className="text-3xl font-bold">{metrics.totalUniversities || 0}</p>
                    <div className="flex items-center gap-1 mt-1 text-sm">
                      <Badge variant="outline" className="text-green-500 border-green-500/50">
                        {metrics.activeUniversities || 0} Active
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Building2 className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Degrees</p>
                    <p className="text-3xl font-bold">{metrics.totalDegrees || 0}</p>
                    <div className="flex items-center gap-1 mt-1 text-sm text-green-500">
                      <TrendingUp className="h-4 w-4" />
                      <span>On-chain verified</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <GraduationCap className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Issuers</p>
                    <p className="text-3xl font-bold">{metrics.totalRoles?.issuers || 0}</p>
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Authorized wallets</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <FileCheck className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Revokers</p>
                    <p className="text-3xl font-bold">{metrics.totalRoles?.revokers || 0}</p>
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>With revoke rights</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <FileX className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Verifiers</p>
                    <p className="text-3xl font-bold">{metrics.totalRoles?.verifiers || 0}</p>
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>With verify rights</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-cyan-500/10">
                    <FileCheck className="h-6 w-6 text-cyan-500" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Range-Filtered Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Degrees Issued ({getDateRangeDisplay()})</p>
                  <p className="text-2xl font-bold">{metrics.degreesIssuedInRange || 0}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Degrees Revoked ({getDateRangeDisplay()})</p>
                  <p className="text-2xl font-bold">{metrics.degreesRevokedInRange || 0}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Events Observed ({getDateRangeDisplay()})</p>
                  <p className="text-2xl font-bold">{metrics.eventsInRange || 0}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold">
                    {(pendingRequestsData?.totalPending?.total || 0) > 0 ? (
                      <Badge variant="destructive" className="text-lg px-3 py-1">
                        {pendingRequestsData.totalPending.total}
                      </Badge>
                    ) : (
                      "0"
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts and Additional Widgets Row */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* University Status Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                University Status
              </CardTitle>
              <CardDescription>Active vs Inactive institutions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  {metrics.totalUniversities > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Active", value: metrics.activeUniversities || 0, fill: "#22c55e" },
                            { name: "Inactive", value: (metrics.totalUniversities || 0) - (metrics.activeUniversities || 0), fill: "#ef4444" },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No universities registered</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Request Status ({getDateRangeDisplay()})
              </CardTitle>
              <CardDescription>Degree and revocation requests</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Degree Requests</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending:</span>
                        <Badge variant="outline">{metrics.degreeRequests?.pending || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Approved:</span>
                        <Badge variant="default">{metrics.degreeRequests?.approved || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Executed:</span>
                        <Badge variant="default">{metrics.degreeRequests?.executed || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rejected:</span>
                        <Badge variant="destructive">{metrics.degreeRequests?.rejected || 0}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Revocation Requests</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending:</span>
                        <Badge variant="outline">{metrics.revocationRequests?.pending || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Approved:</span>
                        <Badge variant="default">{metrics.revocationRequests?.approved || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Executed:</span>
                        <Badge variant="default">{metrics.revocationRequests?.executed || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rejected:</span>
                        <Badge variant="destructive">{metrics.revocationRequests?.rejected || 0}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Indexer Health Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Indexer Health
              </CardTitle>
              <CardDescription>Real-time indexer status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-[200px]" />
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Status</span>
                    </div>
                    <Badge variant={syncStatus.indexerRunning ? "default" : "destructive"}>
                      {syncStatus.indexerRunning ? "Running" : "Stopped"}
                    </Badge>
                  </div>
                  {!syncStatus.indexerRunning && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span>Indexer is stopped. Click to restart.</span>
                            <Button
                              size="sm"
                              onClick={handleStartIndexer}
                              disabled={isStartingIndexer}
                            >
                              {isStartingIndexer ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <Zap className="h-3 w-3 mr-1" />
                                  Start Indexer
                                </>
                              )}
                            </Button>
                          </div>
                          {syncStatus.indexerError && (
                            <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                              <p className="text-xs font-medium text-destructive mb-1">Last Error:</p>
                              <p className="text-xs text-muted-foreground">{syncStatus.indexerError}</p>
                              {syncStatus.indexerErrorAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(syncStatus.indexerErrorAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Last Event</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {syncStatus.syncedAt
                        ? new Date(syncStatus.syncedAt).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Blocks className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Total Events</span>
                    </div>
                    <span className="font-mono font-bold">{metrics.totalEvents || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Network</span>
                    </div>
                    <Badge>Base Mainnet</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Universities and Recent Activity Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Universities by Degrees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Universities ({getDateRangeDisplay()})
              </CardTitle>
              <CardDescription>Ranked by degrees issued</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : topUniversities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No universities with degrees in this period</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead className="text-right">Degrees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUniversities.map((uni: any, index: number) => (
                      <TableRow key={uni.id}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{uni.name}</p>
                            {uni.blockchainId && (
                              <p className="text-xs text-muted-foreground font-mono">
                                ID: {uni.blockchainId}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-lg">
                            {uni.degreeCount}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest blockchain events</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {activity.slice(0, 10).map((event: any) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {event.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Block #{event.blockNumber?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {event.txHash && (
                          <a
                            href={`https://basescan.org/tx/${event.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests Requiring Action */}
        {pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Requests Requiring Action
              </CardTitle>
              <CardDescription>
                Pending degree and revocation requests grouped by university
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingRequests.map((group: any) => (
                  <div key={group.universityId} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{group.universityName}</p>
                        {group.blockchainId && (
                          <p className="text-xs text-muted-foreground font-mono">
                            University ID: {group.blockchainId}
                          </p>
                        )}
                      </div>
                      <Badge variant="destructive">
                        {group.degreeRequests.length + group.revocationRequests.length} Pending
                      </Badge>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {group.degreeRequests.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Degree Requests ({group.degreeRequests.length})</p>
                          <div className="space-y-1">
                            {group.degreeRequests.slice(0, 3).map((req: any) => (
                              <div key={req.requestId} className="text-xs p-2 rounded bg-muted">
                                Request #{req.requestId} - {req.approvalCount}/{req.requiredApprovals} approvals
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {group.revocationRequests.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Revocation Requests ({group.revocationRequests.length})
                          </p>
                          <div className="space-y-1">
                            {group.revocationRequests.slice(0, 3).map((req: any) => (
                              <div key={req.requestId} className="text-xs p-2 rounded bg-muted">
                                Request #{req.requestId} - Token #{req.tokenId} - {req.approvalCount}/{req.requiredApprovals} approvals
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Link href={`/admin/pending?universityId=${group.universityId}`}>
                      <Button variant="outline" size="sm" className="mt-3 w-full">
                        View All Requests
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Universities Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Registered Universities</CardTitle>
              <CardDescription>Institutions registered on blockchain</CardDescription>
            </div>
            <Link href="/admin/universities">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Register University
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingUniversities ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : universities.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No universities registered yet</p>
                <Link href="/admin/universities">
                  <Button>Register First University</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Arabic Name</TableHead>
                    <TableHead>Admin Wallet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {universities.map((uni: any) => (
                    <TableRow key={uni.id || uni.blockchain_id}>
                      <TableCell className="font-mono">{uni.blockchain_id || uni.id}</TableCell>
                      <TableCell className="font-medium">{uni.name_en || uni.name}</TableCell>
                      <TableCell dir="rtl">{uni.name_ar}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {(uni.wallet_address || uni.admin_wallet || "").slice(0, 6)}...{(uni.wallet_address || uni.admin_wallet || "").slice(-4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={uni.is_active ? "default" : "destructive"}>
                          {uni.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="bg-transparent">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
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
                              onClick={() => router.push(`/admin/universities/${uni.id}/admin`)}
                              className="cursor-pointer"
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Change Admin
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/universities">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Building2 className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Manage Universities</h3>
                    <p className="text-sm text-muted-foreground">Register & manage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/degrees">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <GraduationCap className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Search Degrees</h3>
                    <p className="text-sm text-muted-foreground">Browse & verify</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/pending">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <Clock className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Pending Approvals</h3>
                    <p className="text-sm text-muted-foreground">
                      {pendingRequestsData?.totalPending?.total || 0} requests
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/sync">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <RefreshCw className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Sync Status</h3>
                    <p className="text-sm text-muted-foreground">DB & Blockchain</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
