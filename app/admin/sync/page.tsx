"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import useSWR from "swr"
import {
  RefreshCw,
  Database,
  Blocks,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  Zap,
  Server,
  Activity,
  TrendingUp,
  Copy,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Search,
  Filter,
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

export default function AdminSyncPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get active tab from URL
  const activeTabFromUrl = searchParams.get("tab") || "overview"
  const [activeTab, setActiveTab] = useState(activeTabFromUrl)

  // Events tab filters
  const [eventNameFilter, setEventNameFilter] = useState("")
  const [txHashFilter, setTxHashFilter] = useState("")
  const [eventsPage, setEventsPage] = useState(1)
  const eventsPageSize = 50

  // Metrics tab range
  const [metricsRange, setMetricsRange] = useState("24h")

  // Admin actions
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [actionConfirmText, setActionConfirmText] = useState("")

  // Build query strings
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

  const updateTab = (tab: string) => {
    setActiveTab(tab)
    const query = buildQueryString({ tab: tab === "overview" ? null : tab })
    router.push(`?${query}`, { scroll: false })
  }

  // Fetch sync status (auto-refresh every 10s)
  const { data: syncStatus, error: syncError, mutate: refreshSync } = useSWR(
    "/api/admin/sync/status",
    fetcher,
    { refreshInterval: 10000 }
  )

  // Fetch events (auto-refresh every 15s)
  const eventsUrl = `/api/admin/sync/events?limit=${eventsPageSize}&offset=${(eventsPage - 1) * eventsPageSize}${
    eventNameFilter ? `&eventName=${encodeURIComponent(eventNameFilter)}` : ""
  }${txHashFilter ? `&txHash=${encodeURIComponent(txHashFilter)}` : ""}`
  
  const { data: eventsData, error: eventsError, mutate: refreshEvents } = useSWR(
    activeTab === "events" ? eventsUrl : null,
    fetcher,
    { refreshInterval: 15000 }
  )

  // Fetch metrics
  const { data: metricsData, error: metricsError } = useSWR(
    activeTab === "metrics" ? `/api/admin/sync/metrics?range=${metricsRange}` : null,
    fetcher,
    { refreshInterval: 30000 }
  )

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

  const formatBlockNumber = (block: number | null) => {
    if (!block) return "N/A"
    return block.toLocaleString()
  }

  const handleAdminAction = async (action: string) => {
    if (actionConfirmText !== "CONFIRM") {
      toast.error("Please type 'CONFIRM' to proceed")
      return
    }

    try {
      let response: Response
      
      // Use existing indexer endpoint for start/stop/restart
      if (action === "start" || action === "stop" || action === "restart") {
        response = await fetch("/api/admin/indexer/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action }),
        })
      } else {
        // Use sync endpoint for reindex
        response = await fetch(`/api/admin/sync/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })
      }

      const result = await response.json()
      if (response.ok) {
        toast.success(result.message || "Action completed successfully")
        setIsActionDialogOpen(false)
        setActionConfirmText("")
        setSelectedAction(null)
        // Refresh status after action
        setTimeout(() => {
          refreshSync()
        }, 2000)
      } else {
        toast.error(result.error || "Action failed")
      }
    } catch (error: any) {
      toast.error(`Failed to execute action: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Sync & Indexer Health" showAuth />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Sync & Indexer Health</h1>
            <p className="text-muted-foreground">
              Monitor blockchain indexer status, sync health, and event processing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refreshSync()} disabled={!syncStatus}>
              <RefreshCw className={`h-4 w-4 mr-2 ${!syncStatus ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {syncError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load sync status. Please try again.</AlertDescription>
          </Alert>
        ) : !syncStatus ? (
          <div className="grid gap-4 md:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Head Block</p>
                    <p className="text-2xl font-bold font-mono">{formatBlockNumber(syncStatus.headBlock)}</p>
                  </div>
                  <Blocks className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Synced</p>
                    <p className="text-2xl font-bold font-mono">{formatBlockNumber(syncStatus.lastSyncedBlock)}</p>
                  </div>
                  <Database className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Finalized Block</p>
                    <p className="text-2xl font-bold font-mono">{formatBlockNumber(syncStatus.finalizedBlock)}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sync Mode</p>
                    <Badge variant={syncStatus.syncMode === "websocket" ? "default" : "secondary"} className="mt-1">
                      {syncStatus.syncMode === "websocket" ? "WebSocket" : syncStatus.syncMode === "polling" ? "Polling" : "Unknown"}
                    </Badge>
                  </div>
                  <Server className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">WS Status</p>
                    <Badge 
                      variant={syncStatus.wsConnected ? "default" : syncStatus.wsHealth === "not_used" ? "secondary" : "destructive"}
                      className="mt-1"
                    >
                      {syncStatus.wsConnected ? "Connected" : syncStatus.wsHealth === "not_used" ? "N/A" : "Disconnected"}
                    </Badge>
                  </div>
                  <Activity className="h-8 w-8 text-cyan-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Panel */}
        {syncStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Status Details</CardTitle>
              <CardDescription>Current indexer state and health metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Chain ID</p>
                  <p className="font-mono font-bold">{syncStatus.chainId || 8453}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Confirmations</p>
                  <p className="font-mono font-bold">{syncStatus.confirmations || 10}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Lag (Blocks)</p>
                  <p className="font-mono font-bold text-orange-500">{syncStatus.lag?.blocks || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Lag (Time)</p>
                  <p className="font-mono font-bold">{syncStatus.lag?.time || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Synced At</p>
                  <p className="text-sm">{formatDate(syncStatus.syncedAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Event At</p>
                  <p className="text-sm">{formatDate(syncStatus.lastEventAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">RPC Health</p>
                  <Badge variant={syncStatus.rpcHealth === "healthy" ? "default" : "destructive"}>
                    {syncStatus.rpcHealth === "healthy" ? "Healthy" : "Unhealthy"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Indexer Status</p>
                  <Badge variant={syncStatus.indexerRunning ? "default" : "destructive"}>
                    {syncStatus.indexerRunning ? "Running" : "Stopped"}
                  </Badge>
                </div>
              </div>

              {/* Events Summary */}
              {syncStatus.events && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-semibold mb-3">Events Summary</h3>
                  <div className="grid gap-4 md:grid-cols-5">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Events</p>
                      <p className="text-xl font-bold">{syncStatus.events.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Processed</p>
                      <p className="text-xl font-bold text-green-500">{syncStatus.events.processed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="text-xl font-bold text-red-500">{syncStatus.events.failed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last 1 Hour</p>
                      <p className="text-xl font-bold">{syncStatus.events.last1h.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                      <p className="text-xl font-bold">{syncStatus.events.last24h.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reorg Info */}
              {syncStatus.reorg?.detected && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Reorg Detected</AlertTitle>
                  <AlertDescription>
                    A blockchain reorganization was detected at {formatDate(syncStatus.reorg.lastReorgAt)}.
                    The indexer has automatically handled this.
                  </AlertDescription>
                </Alert>
              )}

              {/* Indexer Error */}
              {syncStatus.indexerError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Indexer Error</AlertTitle>
                  <AlertDescription>
                    <p className="font-medium mb-1">{syncStatus.indexerError}</p>
                    {syncStatus.indexerErrorAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(syncStatus.indexerErrorAt)}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={updateTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="admin">Admin Tools</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Flow Architecture</CardTitle>
                <CardDescription>How data flows between blockchain and database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-8 py-8">
                  <div className="text-center">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 mb-2">
                      <Blocks className="h-10 w-10 text-blue-500 mx-auto" />
                    </div>
                    <p className="font-semibold">Blockchain</p>
                    <p className="text-xs text-muted-foreground">Source of Truth</p>
                    <p className="text-xs text-blue-500 mt-1">Base Mainnet (8453)</p>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight className="h-8 w-8 text-green-500" />
                    <span className="text-xs text-muted-foreground">Indexer</span>
                  </div>

                  <div className="text-center">
                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 mb-2">
                      <Database className="h-10 w-10 text-purple-500 mx-auto" />
                    </div>
                    <p className="font-semibold">Database</p>
                    <p className="text-xs text-muted-foreground">Projection</p>
                    <p className="text-xs text-purple-500 mt-1">PostgreSQL</p>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Serve</span>
                  </div>

                  <div className="text-center">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 mb-2">
                      <Activity className="h-10 w-10 text-green-500 mx-auto" />
                    </div>
                    <p className="font-semibold">UI/API</p>
                    <p className="text-xs text-muted-foreground">User Interface</p>
                    <p className="text-xs text-green-500 mt-1">Fast Reads</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Blocks className="h-4 w-4" />
              <AlertTitle>Blockchain is the Source of Truth</AlertTitle>
              <AlertDescription>
                All critical operations read from the blockchain. The database serves as a projection layer for faster queries.
                If any mismatch is detected, the blockchain data takes precedence. The indexer continuously syncs events
                from the blockchain to the database.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Blockchain Events</CardTitle>
                <CardDescription>Latest events ingested from the blockchain</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="mb-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Event Name</label>
                    <Input
                      placeholder="Filter by event name..."
                      value={eventNameFilter}
                      onChange={(e) => {
                        setEventNameFilter(e.target.value)
                        setEventsPage(1)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Transaction Hash</label>
                    <Input
                      placeholder="Filter by tx hash..."
                      value={txHashFilter}
                      onChange={(e) => {
                        setTxHashFilter(e.target.value)
                        setEventsPage(1)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Actions</label>
                    <Button variant="outline" onClick={() => refreshEvents()} className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Events
                    </Button>
                  </div>
                </div>

                {eventsError ? (
                  <Alert variant="destructive">
                    <AlertDescription>Failed to load events. Please try again.</AlertDescription>
                  </Alert>
                ) : !eventsData ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : eventsData.events.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground font-medium">No events found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {eventNameFilter || txHashFilter ? "Try adjusting your filters" : "No events have been indexed yet"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Block</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Transaction</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eventsData.events.map((event: any) => (
                            <TableRow key={event.id}>
                              <TableCell className="font-mono text-sm">
                                #{formatBlockNumber(event.blockNumber)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{event.eventName}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                <div className="flex items-center gap-1">
                                  <span>{event.txHash.slice(0, 10)}...</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleCopy(event.txHash, "Transaction Hash")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant={event.processed ? "default" : "secondary"} className="w-fit text-xs">
                                    {event.processed ? "Processed" : "Pending"}
                                  </Badge>
                                  {event.isFinalized && (
                                    <Badge variant="outline" className="w-fit text-xs">
                                      Finalized
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(event.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(`https://basescan.org/tx/${event.txHash}`, "_blank")}
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
                    {eventsData.pagination && eventsData.pagination.total > eventsPageSize && (
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-sm text-muted-foreground">
                          Showing {eventsData.pagination.offset + 1} to{" "}
                          {Math.min(eventsData.pagination.offset + eventsPageSize, eventsData.pagination.total)} of{" "}
                          {eventsData.pagination.total} events
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                            disabled={eventsPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground px-2">
                            Page {eventsPage}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEventsPage((p) => p + 1)}
                            disabled={!eventsData.pagination.hasMore}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Event Throughput</CardTitle>
                  <CardDescription>Events processed over time</CardDescription>
                </div>
                <Select value={metricsRange} onValueChange={setMetricsRange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last 1 hour</SelectItem>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {metricsError ? (
                  <Alert variant="destructive">
                    <AlertDescription>Failed to load metrics. Please try again.</AlertDescription>
                  </Alert>
                ) : !metricsData ? (
                  <Skeleton className="h-[400px]" />
                ) : (metricsData.eventsOverTime?.length ?? 0) === 0 ? (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    No metrics data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={metricsData.eventsOverTime ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.6}
                        name="Total Events"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="processed" 
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        fillOpacity={0.6}
                        name="Processed"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="failed" 
                        stroke="#ff7300" 
                        fill="#ff7300" 
                        fillOpacity={0.6}
                        name="Failed"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Events by Type */}
            {metricsData && metricsData.eventsByType && metricsData.eventsByType.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Events by Type</CardTitle>
                  <CardDescription>Event distribution by event name</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metricsData.eventsByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="eventName" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Processing Stats */}
            {metricsData && metricsData.processingStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Events</p>
                      <p className="text-2xl font-bold">{metricsData.processingStats.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Processed</p>
                      <p className="text-2xl font-bold text-green-500">
                        {metricsData.processingStats.processed.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="text-2xl font-bold text-red-500">
                        {metricsData.processingStats.failed.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Finalized</p>
                      <p className="text-2xl font-bold text-purple-500">
                        {metricsData.processingStats.finalized.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {metricsData.processingStats.avgProcessingTimeSeconds && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Average Processing Time</p>
                      <p className="text-xl font-bold">
                        {metricsData.processingStats.avgProcessingTimeSeconds.toFixed(2)}s
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Admin Tools Tab */}
          <TabsContent value="admin" className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Danger Zone</AlertTitle>
              <AlertDescription>
                These actions can affect indexer operation. Use with caution and only when necessary.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Indexer Control</CardTitle>
                <CardDescription>Manual indexer management actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAction("start")
                      setIsActionDialogOpen(true)
                    }}
                    disabled={syncStatus?.indexerRunning}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Indexer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAction("stop")
                      setIsActionDialogOpen(true)
                    }}
                    disabled={!syncStatus?.indexerRunning}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Indexer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAction("restart")
                      setIsActionDialogOpen(true)
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restart Indexer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAction("reindex")
                      setIsActionDialogOpen(true)
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Reindex (Rebuild Projections)
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Reindex:</strong> Rebuilds all database projections from chain_events. This may take time
                    depending on the number of events. The indexer will continue running during this operation.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Admin Action Confirmation Dialog */}
        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Admin Action</DialogTitle>
              <DialogDescription>
                {selectedAction === "start" && "Start the blockchain indexer?"}
                {selectedAction === "stop" && "Stop the blockchain indexer? This will pause event ingestion."}
                {selectedAction === "restart" && "Restart the blockchain indexer? This will temporarily pause and then resume."}
                {selectedAction === "reindex" && "Rebuild all database projections from chain_events? This may take time."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This action requires confirmation. Type <strong>CONFIRM</strong> to proceed.
                </AlertDescription>
              </Alert>
              <Input
                placeholder="Type CONFIRM to proceed"
                value={actionConfirmText}
                onChange={(e) => setActionConfirmText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsActionDialogOpen(false)
                setActionConfirmText("")
                setSelectedAction(null)
              }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedAction && handleAdminAction(selectedAction)}
                disabled={actionConfirmText !== "CONFIRM"}
              >
                Execute Action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
