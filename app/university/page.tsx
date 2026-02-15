"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useContract } from "@/hooks/use-contract"
import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  GraduationCap,
  FileCheck,
  FileX,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Lock,
  Shield,
  RefreshCw,
  Clock,
  Activity,
  ExternalLink,
  Plus,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { getActiveContractAddress } from "@/lib/contracts/abi"

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? `Failed to load (${res.status})`)
  return data
}

export default function UniversityDashboardPage() {
  const { universityUser } = useAuth()
  const { isConnected, isCorrectChain, connect, switchChain } = useWeb3()
  const router = useRouter()
  const searchParams = useSearchParams()

  const rangeFromUrl = searchParams.get("range") || "30d"
  const [selectedPeriod, setSelectedPeriod] = useState(rangeFromUrl)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", value)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const { data: stats, error: statsError, mutate: mutateStats } = useSWR(
    universityUser ? "/api/university/dashboard-stats" : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: metricsData, error: metricsError, mutate: refreshMetrics } = useSWR(
    universityUser ? `/api/university/metrics?range=${selectedPeriod}` : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: activityData } = useSWR(
    universityUser ? "/api/university/activity?limit=20" : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: pendingData } = useSWR(
    universityUser ? "/api/university/pending-requests" : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: pendingOnboardingData, mutate: mutatePendingOnboarding } = useSWR(
    universityUser ? "/api/university/pending-onboarding" : null,
    fetcher,
    { refreshInterval: 15000 }
  )

  const { data: issuersListData, mutate: mutateIssuersList } = useSWR(
    universityUser ? "/api/university/issuers?limit=5&page=1" : null,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  )

  const { data: revokersListData, mutate: mutateRevokersList } = useSWR(
    universityUser ? "/api/university/revokers?limit=5&page=1" : null,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  )

  const { data: verifiersListData, mutate: mutateVerifiersList } = useSWR(
    universityUser ? "/api/university/verifiers?limit=5&page=1" : null,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  )

  const { data: meData } = useSWR(
    universityUser ? "/api/university/me" : null,
    fetcher
  )
  const universityBlockchainId = meData?.blockchainId != null ? Number(meData.blockchainId) : null
  const { grantIssuer, grantRevoker, addVerifier, isLoading: contractLoading } = useContract()

  const metrics = metricsData || {}
  const activity = activityData?.events || []
  const pendingDegree = pendingData?.degreeRequests || []
  const pendingRevocation = pendingData?.revocationRequests || []
  const totalPending = pendingData?.totalPending ?? 0
  const pendingOnboarding = pendingOnboardingData?.all ?? []
  const totalPendingOnboarding = pendingOnboardingData?.totalPending ?? 0

  const issuersList = issuersListData?.issuers ?? []
  const issuersStats = issuersListData?.stats ?? { total: 0, pending: 0, active: 0, onBlockchain: 0 }
  const revokersList = revokersListData?.revokers ?? []
  const revokersStats = revokersListData?.stats ?? { total: 0, pending: 0, active: 0, onBlockchain: 0 }
  const verifiersList = verifiersListData?.verifiers ?? []
  const verifiersStats = verifiersListData?.stats ?? { total: 0, pending: 0, active: 0, onBlockchain: 0 }

  const issuersCount = metrics.totalRoles?.issuers ?? stats?.issuers_count ?? 0
  const revokersCount = metrics.totalRoles?.revokers ?? stats?.revokers_count ?? 0
  const verifiersCount = metrics.totalRoles?.verifiers ?? stats?.verifiers_count ?? 0
  const degreesCount = metrics.totalDegrees ?? stats?.degrees_count ?? 0

  const isLoading = universityUser && stats == null && !statsError
  const isLoadingMetrics = universityUser && !metricsData && !metricsError

  const walletConnected = isConnected && isCorrectChain
  const canPerformActions = walletConnected

  const handleRefresh = async () => {
    await Promise.all([mutateStats(), refreshMetrics(), mutateIssuersList(), mutateRevokersList(), mutateVerifiersList()])
  }

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

  const pieData = [
    { name: "Issuers", value: issuersCount, fill: "#22c55e" },
    { name: "Revokers", value: revokersCount, fill: "#f97316" },
    { name: "Verifiers", value: verifiersCount, fill: "#8b5cf6" },
  ].filter((d) => d.value > 0)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 18) return "Good afternoon"
    return "Good evening"
  })()

  const hasAlerts = totalPendingOnboarding > 0 || totalPending > 0

  return (
    <div className="space-y-6">
      {/* Header with period and refresh — same as super admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">University Dashboard</h1>
          <p className="text-muted-foreground">
            {greeting}, {universityUser?.name || "your institution"}. {getDateRangeDisplay().toLowerCase()}: {metrics.degreesIssuedInRange ?? 0} degrees issued, {metrics.degreesRevokedInRange ?? 0} revoked.
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

      {statsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load dashboard stats</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>{statsError instanceof Error ? statsError.message : "Please try again."}</span>
            <Button onClick={() => mutateStats()} variant="outline" size="sm" className="shrink-0">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isConnected && (
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <Wallet className="h-4 w-4 text-amber-500" />
          <AlertTitle>Connect wallet for on-chain actions</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              Connect the wallet registered as your university admin to add/remove issuers and revokers.
            </span>
            <Button onClick={connect} size="sm" className="shrink-0">
              Connect Wallet
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isConnected && !isCorrectChain && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wrong network</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>Switch to Base Mainnet to perform transactions.</span>
            <Button onClick={switchChain} variant="outline" size="sm" className="shrink-0">
              Switch Network
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {walletConnected && (
        <Alert className="border-green-500/30 bg-green-500/5">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            Wallet connected. You can add/remove issuers and revokers on-chain.
          </AlertDescription>
        </Alert>
      )}

      {/* Notifications / Alerts strip */}
      {hasAlerts && (
        <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/5 to-transparent shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-foreground">Attention:</span>
              {totalPendingOnboarding > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                    {totalPendingOnboarding} pending activation{totalPendingOnboarding !== 1 ? "s" : ""}
                  </Badge>
                  <span className="text-muted-foreground">— Scroll down to activate on-chain</span>
                </span>
              )}
              {totalPending > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
                    {totalPending} pending request{totalPending !== 1 ? "s" : ""}
                  </Badge>
                  <span className="text-muted-foreground">— Degree or revocation approvals</span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key metrics grid — same structure as super admin */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Degrees</p>
                <div className="text-3xl font-bold">
                  {isLoading ? <Skeleton className="h-9 w-12 inline-block" /> : degreesCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Issued by your institution</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <GraduationCap className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Issuers</p>
                <div className="text-3xl font-bold">
                  {isLoading ? <Skeleton className="h-9 w-12 inline-block" /> : issuersCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Authorized wallets</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <FileCheck className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Revokers</p>
                <div className="text-3xl font-bold">
                  {isLoading ? <Skeleton className="h-9 w-12 inline-block" /> : revokersCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">With revoke rights</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10">
                <FileX className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Verifiers</p>
                <div className="text-3xl font-bold">
                  {isLoading ? <Skeleton className="h-9 w-12 inline-block" /> : verifiersCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">With verify rights</p>
              </div>
              <div className="p-3 rounded-lg bg-violet-500/10">
                <CheckCircle2 className="h-6 w-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subscription</p>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 inline-block" />
                  ) : (
                    stats?.subscriptionStatus ?? universityUser?.subscriptionStatus ?? "—"
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.subscriptionPlan ?? universityUser?.subscriptionPlan ?? "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <CreditCard className="h-6 w-6 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Range-filtered metrics row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            {isLoadingMetrics ? (
              <Skeleton className="h-16" />
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Degrees Issued ({getDateRangeDisplay()})</p>
                <p className="text-2xl font-bold">{metrics.degreesIssuedInRange ?? 0}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            {isLoadingMetrics ? (
              <Skeleton className="h-16" />
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Degrees Revoked ({getDateRangeDisplay()})</p>
                <p className="text-2xl font-bold">{metrics.degreesRevokedInRange ?? 0}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            {isLoadingMetrics ? (
              <Skeleton className="h-16" />
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">
                  {totalPending > 0 ? (
                    <Badge variant="destructive" className="text-lg px-3 py-1">
                      {totalPending}
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

      {/* Issuers section — data from DB, link to manage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Issuers
            </CardTitle>
            <CardDescription>Authorized issuers from database (source of truth)</CardDescription>
          </div>
          <Link href="/university/issuers">
            <Button variant="outline" size="sm">
              Manage issuers
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {issuersListData == null && universityUser ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <Badge variant="secondary">{issuersStats.total ?? 0}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pending:</span>
                  <Badge variant="outline">{issuersStats.pending ?? 0}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Active (on-chain):</span>
                  <Badge variant="default">{issuersStats.active ?? 0}</Badge>
                </div>
              </div>
              {issuersList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No issuers yet. Add issuers from the Manage issuers page.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issuersList.slice(0, 5).map((issuer: { id: number; name?: string; email?: string; blockchainVerified?: boolean; onboardingStatus?: string }) => (
                      <TableRow key={issuer.id}>
                        <TableCell className="font-medium">{issuer.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{issuer.email ?? "—"}</TableCell>
                        <TableCell>
                          {issuer.blockchainVerified ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="outline">{issuer.onboardingStatus ?? "Pending"}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {issuersList.length > 0 && (
                <Link href="/university/issuers" className="text-sm text-primary hover:underline">
                  View all {issuersStats.total} issuers →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revokers section — data from DB, link to manage (same pattern as Issuers) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileX className="h-5 w-5" />
              Revokers
            </CardTitle>
            <CardDescription>Authorized revokers from database (source of truth)</CardDescription>
          </div>
          <Link href="/university/revokers">
            <Button variant="outline" size="sm">
              Manage revokers
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {revokersListData == null && universityUser ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <Badge variant="secondary">{revokersStats.total ?? 0}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pending:</span>
                  <Badge variant="outline">{revokersStats.pending ?? 0}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Active (on-chain):</span>
                  <Badge variant="default">{revokersStats.active ?? 0}</Badge>
                </div>
              </div>
              {revokersList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No revokers yet. Add revokers from the Manage revokers page.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revokersList.slice(0, 5).map((revoker: { id: number; name?: string; email?: string; blockchainVerified?: boolean; onboardingStatus?: string }, index: number) => (
                      <TableRow key={`revoker-${revoker.id ?? index}-${index}`}>
                        <TableCell className="font-medium">{revoker.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{revoker.email ?? "—"}</TableCell>
                        <TableCell>
                          {revoker.blockchainVerified ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="outline">{revoker.onboardingStatus ?? "Pending"}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {revokersList.length > 0 && (
                <Link href="/university/revokers" className="text-sm text-primary hover:underline">
                  View all {revokersStats.total} revokers →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verifiers section — data from DB, link to manage (same pattern as Issuers/Revokers) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verifiers
            </CardTitle>
            <CardDescription>Authorized verifiers from database (source of truth)</CardDescription>
          </div>
          <Link href="/university/verifiers">
            <Button variant="outline" size="sm">
              Manage verifiers
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {verifiersListData == null && universityUser ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <Badge variant="secondary">{verifiersStats.total ?? 0}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pending:</span>
                  <Badge variant="outline">{verifiersStats.pending ?? 0}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Active (on-chain):</span>
                  <Badge variant="default">{verifiersStats.active ?? 0}</Badge>
                </div>
              </div>
              {verifiersList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No verifiers yet. Add verifiers from the Manage verifiers page.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifiersList.slice(0, 5).map((verifier: { id: number; name?: string; email?: string; blockchainVerified?: boolean; onboardingStatus?: string }, index: number) => (
                      <TableRow key={`verifier-${verifier.id ?? index}-${index}`}>
                        <TableCell className="font-medium">{verifier.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{verifier.email ?? "—"}</TableCell>
                        <TableCell>
                          {verifier.blockchainVerified ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="outline">{verifier.onboardingStatus ?? "Pending"}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {verifiersList.length > 0 && (
                <Link href="/university/verifiers" className="text-sm text-primary hover:underline">
                  View all {verifiersStats.total} verifiers →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts and activity row — diagrams like super admin */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Roles Overview
            </CardTitle>
            <CardDescription>Issuers, revokers, and verifiers</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No roles yet. Add issuers, revokers, or verifiers.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Request Status ({getDateRangeDisplay()})
            </CardTitle>
            <CardDescription>Degree and revocation requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Degree Requests</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending:</span>
                      <Badge variant="outline">{metrics.degreeRequests?.pending ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approved:</span>
                      <Badge variant="default">{metrics.degreeRequests?.approved ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Executed:</span>
                      <Badge variant="default">{metrics.degreeRequests?.executed ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rejected:</span>
                      <Badge variant="destructive">{metrics.degreeRequests?.rejected ?? 0}</Badge>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Revocation Requests</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending:</span>
                      <Badge variant="outline">{metrics.revocationRequests?.pending ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approved:</span>
                      <Badge variant="default">{metrics.revocationRequests?.approved ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Executed:</span>
                      <Badge variant="default">{metrics.revocationRequests?.executed ?? 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rejected:</span>
                      <Badge variant="destructive">{metrics.revocationRequests?.rejected ?? 0}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest blockchain events for your institution</CardDescription>
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
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {activity.slice(0, 10).map((event: { id: unknown; description: string; type: string; blockNumber?: number; txHash?: string; timestamp: string }) => (
                  <div
                    key={String(event.id)}
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

      {/* Pending onboarding: issuers/revokers/verifiers awaiting on-chain activation */}
      {totalPendingOnboarding > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-500" />
                Pending activation
              </CardTitle>
              <CardDescription>
                {totalPendingOnboarding} role{totalPendingOnboarding !== 1 ? "s" : ""} have submitted their wallet and are awaiting you to add them on-chain via MetaMask.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => mutatePendingOnboarding()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOnboarding.map((item: { id: number; name?: string; email?: string; walletAddress?: string; role: string; submittedAt?: string }) => {
                  const key = `${item.role}-${item.id}`
                  const isActivating = activatingId === key
                  const roleLabel = item.role === "issuer" ? "Issuer" : item.role === "revoker" ? "Revoker" : "Verifier"
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{item.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          item.role === "issuer" ? "border-green-500" : item.role === "revoker" ? "border-orange-500" : "border-violet-500"
                        }>
                          {roleLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.walletAddress
                          ? `${item.walletAddress.slice(0, 6)}...${item.walletAddress.slice(-4)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={!walletConnected || !universityBlockchainId || isActivating || contractLoading}
                          onClick={async () => {
                            if (!item.walletAddress || !universityBlockchainId) return
                            setActivatingId(key)
                            try {
                              let success = false
                              if (item.role === "issuer") {
                                success = await grantIssuer(universityBlockchainId, item.walletAddress)
                              } else if (item.role === "revoker") {
                                success = await grantRevoker(universityBlockchainId, item.walletAddress)
                              } else if (item.role === "verifier") {
                                success = await addVerifier(universityBlockchainId, item.walletAddress)
                              }
                              if (success) {
                                const activateUrl = item.role === "issuer"
                                  ? `/api/issuers/${item.id}/activate`
                                  : item.role === "revoker"
                                    ? `/api/revokers/${item.id}/activate`
                                    : `/api/verifiers/${item.id}/activate`
                                const res = await fetch(activateUrl, {
                                  method: "POST",
                                  credentials: "include",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ walletAddress: item.walletAddress }),
                                })
                                if (res.ok) {
                                  toast.success(`${roleLabel} activated. Congratulation email sent.`)
                                  await mutatePendingOnboarding()
                                  await mutateStats()
                                  await refreshMetrics()
                                } else {
                                  const err = await res.json().catch(() => ({}))
                                  toast.error(err?.error ?? "Activation saved on-chain but DB update failed.")
                                }
                              } else {
                                toast.error("Transaction failed. Check your wallet and try again.")
                              }
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Activation failed.")
                            } finally {
                              setActivatingId(null)
                            }
                          }}
                        >
                          {isActivating || contractLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            "Activate on-chain"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-4">
              Connect your university admin wallet and click &quot;Activate on-chain&quot; to add each wallet to the smart contract. They will receive a congratulation email and can sign in.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pending requests — audit trail + BaseScan/OpenSea links */}
      {(pendingDegree.length > 0 || pendingRevocation.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Requests Requiring Action
            </CardTitle>
            <CardDescription>
              Degree and revocation requests. Requester, approval progress, and tx links (BaseScan). Verifiers approve from the verifier dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {pendingDegree.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Degree Requests ({pendingDegree.length})</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request #</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead className="text-right">Approvals</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Links</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDegree.slice(0, 10).map((req: {
                        request_id: number
                        student_name?: string
                        requester_address?: string
                        approval_count: number
                        required_approvals: number
                        status?: string
                        created_tx_hash?: string
                        token_id?: number
                      }) => (
                        <TableRow key={req.request_id}>
                          <TableCell className="font-mono">{req.request_id}</TableCell>
                          <TableCell>{req.student_name ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {req.requester_address
                              ? `${req.requester_address.slice(0, 6)}...${req.requester_address.slice(-4)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {req.approval_count}/{req.required_approvals}
                          </TableCell>
                          <TableCell>
                            <Badge variant={req.status === "issued" ? "default" : req.status === "rejected" ? "destructive" : "secondary"}>
                              {req.status ?? "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {req.created_tx_hash && (
                              <a
                                href={`https://basescan.org/tx/${req.created_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:underline inline-flex items-center"
                              >
                                Tx <ExternalLink className="h-3 w-3 ml-0.5" />
                              </a>
                            )}
                            {req.token_id != null && (
                              <>
                                <a
                                  href={`https://basescan.org/nft/${getActiveContractAddress()}/${req.token_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:underline inline-flex items-center"
                                >
                                  NFT <ExternalLink className="h-3 w-3 ml-0.5" />
                                </a>
                                <a
                                  href={`https://opensea.io/assets/base/${getActiveContractAddress()}/${req.token_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:underline inline-flex items-center"
                                >
                                  OpenSea <ExternalLink className="h-3 w-3 ml-0.5" />
                                </a>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {pendingRevocation.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Revocation Requests ({pendingRevocation.length})</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request #</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead className="text-right">Approvals</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Tx</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRevocation.slice(0, 10).map((req: {
                        request_id: number
                        token_id: number
                        requester_address?: string
                        approval_count: number
                        required_approvals: number
                        status?: string
                        created_tx_hash?: string
                      }) => (
                        <TableRow key={req.request_id}>
                          <TableCell className="font-mono">{req.request_id}</TableCell>
                          <TableCell className="font-mono">{req.token_id}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {req.requester_address
                              ? `${req.requester_address.slice(0, 6)}...${req.requester_address.slice(-4)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {req.approval_count}/{req.required_approvals}
                          </TableCell>
                          <TableCell>
                            <Badge variant={req.status === "executed" ? "default" : req.status === "rejected" ? "destructive" : "secondary"}>
                              {req.status ?? "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {req.created_tx_hash && (
                              <a
                                href={`https://basescan.org/tx/${req.created_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:underline inline-flex items-center"
                              >
                                Tx <ExternalLink className="h-3 w-3 ml-0.5" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Verifiers approve or reject from <Link href="/verifier/degree-requests" className="underline">Degree Requests</Link> and <Link href="/verifier/revocation-requests" className="underline">Revocation Requests</Link>. Tx = creation transaction on BaseScan; NFT/OpenSea for issued degrees.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick actions — same as before */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Link href={canPerformActions ? "/university/issuers" : "#"}>
          <Card
            className={
              canPerformActions
                ? "cursor-pointer hover:border-primary/50 transition-colors h-full"
                : "opacity-70 cursor-not-allowed h-full relative"
            }
          >
            {!canPerformActions && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Connect wallet
                </Badge>
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <FileCheck className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Issuers</h3>
                  <p className="text-sm text-muted-foreground">Add or remove degree issuers</p>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={canPerformActions ? "/university/revokers" : "#"}>
          <Card
            className={
              canPerformActions
                ? "cursor-pointer hover:border-primary/50 transition-colors h-full"
                : "opacity-70 cursor-not-allowed h-full relative"
            }
          >
            {!canPerformActions && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Connect wallet
                </Badge>
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <FileX className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Revokers</h3>
                  <p className="text-sm text-muted-foreground">Add or remove degree revokers</p>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={canPerformActions ? "/university/verifiers" : "#"}>
          <Card
            className={
              canPerformActions
                ? "cursor-pointer hover:border-primary/50 transition-colors h-full"
                : "opacity-70 cursor-not-allowed h-full relative"
            }
          >
            {!canPerformActions && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Connect wallet
                </Badge>
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-violet-500/10">
                  <CheckCircle2 className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Verifiers</h3>
                  <p className="text-sm text-muted-foreground">Add or remove degree verifiers</p>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/university/degrees">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <GraduationCap className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">View Degrees</h3>
                  <p className="text-sm text-muted-foreground">Browse issued certificates</p>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/university/subscription">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-cyan-500/10">
                  <CreditCard className="h-6 w-6 text-cyan-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Subscription</h3>
                  <p className="text-sm text-muted-foreground">Plan and billing</p>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {!walletConnected && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Wallet setup
            </CardTitle>
            <CardDescription>
              Connect the wallet that is registered as your university admin on the blockchain to manage issuers and revokers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/university/connect">
              <Button variant="outline" className="gap-2">
                Wallet setup guide
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
