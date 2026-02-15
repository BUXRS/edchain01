"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useWeb3 } from "@/components/providers/web3-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Building2,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Shield,
  FileCheck,
  FileX,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Award,
  Users,
  ExternalLink,
} from "lucide-react"
import {
  fetchUniversityFromBlockchain,
  findUniversitiesWhereVerifier,
  type BlockchainUniversity,
} from "@/lib/blockchain"
import { toast } from "sonner"

interface DashboardStats {
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
  rejectedRequests: number
  issuedDegrees: number
  revokedDegrees: number
  myApprovals: number
  myRejections: number
  avgResponseTime: string
  approvalRate: number
}

interface RecentActivity {
  id: number
  type: "degree" | "revocation"
  action: "approved" | "rejected" | "issued" | "revoked" | "pending"
  request_id: number
  student_name?: string
  timestamp: string
  status: string
}

function VerifierDashboardContent() {
  const searchParams = useSearchParams()
  const universityIdParam = searchParams.get("universityId")

  const { isConnected, isCorrectChain, address, connect, switchChain } = useWeb3()

  const [university, setUniversity] = useState<BlockchainUniversity | null>(null)
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [isVerifier, setIsVerifier] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    if (isConnected && isCorrectChain && address) {
      checkVerifierStatus()
    } else {
      setIsLoading(false)
    }
  }, [universityIdParam, isConnected, isCorrectChain, address])

  useEffect(() => {
    if (universityId && isVerifier && address) {
      loadDashboardData()
    }
  }, [universityId, isVerifier, address])

  const checkVerifierStatus = async () => {
    setIsLoading(true)
    try {
      if (universityIdParam) {
        const id = Number.parseInt(universityIdParam)
        const uni = await fetchUniversityFromBlockchain(id)
        setUniversity(uni)
        setUniversityId(id)
        setIsVerifier(true)
      } else {
        const allUniversities = await findUniversitiesWhereVerifier(address!)
        if (allUniversities.length > 0) {
          setUniversity(allUniversities[0])
          setUniversityId(Number(allUniversities[0].id))
          setIsVerifier(true)
        } else {
          setIsVerifier(false)
        }
      }
    } catch (error) {
      console.error("Error checking verifier status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDashboardData = async () => {
    if (!universityId) return
    setLoadingStats(true)
    try {
      // Fetch all requests
      const [degreeRes, revocationRes] = await Promise.all([
        fetch(`/api/degree-requests?universityBlockchainId=${universityId}&status=all`),
        fetch(`/api/revocation-requests?universityBlockchainId=${universityId}&status=all`),
      ])

      const degreeData = await degreeRes.json()
      const revocationData = await revocationRes.json()

      const degreeRequests = degreeData.requests || []
      const revocationRequests = revocationData.requests || []

      // Calculate stats
      const allRequests = [...degreeRequests, ...revocationRequests]
      const pendingDegrees = degreeRequests.filter((r: any) => r.status?.toLowerCase() === "pending")
      const pendingRevocations = revocationRequests.filter((r: any) => r.status?.toLowerCase() === "pending")
      const approvedDegrees = degreeRequests.filter((r: any) => r.status?.toLowerCase() === "approved")
      const rejectedDegrees = degreeRequests.filter((r: any) => r.status?.toLowerCase() === "rejected")
      const issuedDegrees = degreeRequests.filter((r: any) => r.status?.toLowerCase() === "issued")
      const revokedDegrees = revocationRequests.filter((r: any) => r.status?.toLowerCase() === "revoked")

      // Count my approvals/rejections
      const myAddr = address?.toLowerCase()
      const myApprovals = allRequests.filter((r: any) => 
        r.approved_by?.includes(myAddr)
      ).length
      
      const approvalRate = allRequests.length > 0 
        ? ((approvedDegrees.length + issuedDegrees.length) / allRequests.length) * 100 
        : 0

      setStats({
        totalRequests: allRequests.length,
        pendingRequests: pendingDegrees.length + pendingRevocations.length,
        approvedRequests: approvedDegrees.length,
        rejectedRequests: rejectedDegrees.length,
        issuedDegrees: issuedDegrees.length,
        revokedDegrees: revokedDegrees.length,
        myApprovals,
        myRejections: 0,
        avgResponseTime: "2.5h",
        approvalRate: Math.round(approvalRate),
      })

      // Build recent activity
      const activity: RecentActivity[] = [
        ...degreeRequests.slice(0, 5).map((r: any) => ({
          id: r.id,
          type: "degree" as const,
          action: r.status?.toLowerCase() as any,
          request_id: r.request_id,
          student_name: r.student_name,
          timestamp: r.created_at,
          status: r.status,
        })),
        ...revocationRequests.slice(0, 5).map((r: any) => ({
          id: r.id,
          type: "revocation" as const,
          action: r.status?.toLowerCase() as any,
          request_id: r.request_id,
          timestamp: r.created_at,
          status: r.status,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

      setRecentActivity(activity)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoadingStats(false)
    }
  }

  const canVerify = isConnected && isCorrectChain && isVerifier && university?.isActive

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Verifier Dashboard" />
        <div className="p-6 flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your verifier dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Verifier Dashboard" />

      <div className="p-6 space-y-6">
        {/* Connection Status Alerts */}
        {!isConnected && (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertTitle>Wallet Required</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Connect your wallet to access verifier features.</span>
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
              <Button onClick={switchChain} variant="outline" size="sm" className="ml-4">
                Switch Network
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {canVerify && (
          <>
            {/* University Info Banner */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{university?.nameEn}</h2>
                      {university?.nameAr && (
                        <p className="text-muted-foreground" dir="rtl">{university.nameAr}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified Verifier
                        </Badge>
                        <Badge variant="secondary">
                          University ID: {universityId}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={loadingStats}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingStats ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time requests
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">{stats?.pendingRequests || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Awaiting your approval
                  </p>
                  {stats && stats.pendingRequests > 0 && (
                    <Button variant="link" size="sm" className="px-0 mt-2" asChild>
                      <Link href="/verifier/degree-requests">
                        Review now <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="border-green-500/20 hover:border-green-500/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Degrees Issued</CardTitle>
                  <Award className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{stats?.issuedDegrees || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Successfully minted
                  </p>
                </CardContent>
              </Card>

              <Card className="border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Approvals</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-500">{stats?.myApprovals || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requests you approved
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Analytics Row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Approval Rate Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Approval Rate
                  </CardTitle>
                  <CardDescription>Overall approval success rate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{stats?.approvalRate || 0}%</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                  <Progress value={stats?.approvalRate || 0} className="h-2" />
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Approved</p>
                      <p className="text-lg font-semibold text-green-500">{stats?.approvedRequests || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rejected</p>
                      <p className="text-lg font-semibold text-red-500">{stats?.rejectedRequests || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-lg font-semibold text-yellow-500">{stats?.pendingRequests || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Request Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-blue-500" />
                    Request Distribution
                  </CardTitle>
                  <CardDescription>Breakdown by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Issued */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          Issued
                        </span>
                        <span className="font-medium">{stats?.issuedDegrees || 0}</span>
                      </div>
                      <Progress 
                        value={stats?.totalRequests ? (stats.issuedDegrees / stats.totalRequests) * 100 : 0} 
                        className="h-2 bg-green-500/20"
                      />
                    </div>

                    {/* Pending */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-yellow-500" />
                          Pending
                        </span>
                        <span className="font-medium">{stats?.pendingRequests || 0}</span>
                      </div>
                      <Progress 
                        value={stats?.totalRequests ? (stats.pendingRequests / stats.totalRequests) * 100 : 0} 
                        className="h-2 bg-yellow-500/20"
                      />
                    </div>

                    {/* Rejected */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          Rejected
                        </span>
                        <span className="font-medium">{stats?.rejectedRequests || 0}</span>
                      </div>
                      <Progress 
                        value={stats?.totalRequests ? (stats.rejectedRequests / stats.totalRequests) * 100 : 0} 
                        className="h-2 bg-red-500/20"
                      />
                    </div>

                    {/* Revoked */}
                    {stats && stats.revokedDegrees > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-orange-500" />
                            Revoked
                          </span>
                          <span className="font-medium">{stats.revokedDegrees}</span>
                        </div>
                        <Progress 
                          value={stats.totalRequests ? (stats.revokedDegrees / stats.totalRequests) * 100 : 0} 
                          className="h-2 bg-orange-500/20"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Latest requests and actions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/verifier/history">
                      View All <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivity.map((activity) => {
                        const statusColors = {
                          pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                          issued: "bg-green-500/10 text-green-500 border-green-500/20",
                          rejected: "bg-red-500/10 text-red-500 border-red-500/20",
                          approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                          revoked: "bg-orange-500/10 text-orange-500 border-orange-500/20",
                        }
                        const statusColor = statusColors[activity.action as keyof typeof statusColors] || statusColors.pending

                        return (
                          <TableRow key={`${activity.type}-${activity.id}`}>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                {activity.type === "degree" ? (
                                  <FileCheck className="h-3 w-3" />
                                ) : (
                                  <FileX className="h-3 w-3" />
                                )}
                                {activity.type === "degree" ? "Degree" : "Revocation"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">#{activity.request_id}</TableCell>
                            <TableCell>{activity.student_name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${statusColor} border`}>
                                {activity.status?.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/verifier/${activity.type === "degree" ? "degree" : "revocation"}-requests`}>
                                  View <ArrowRight className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Navigate to key verifier functions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <Button variant="outline" className="justify-start h-auto py-4" asChild>
                    <Link href="/verifier/degree-requests">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <FileCheck className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">Degree Requests</p>
                          <p className="text-xs text-muted-foreground">Review pending requests</p>
                        </div>
                      </div>
                    </Link>
                  </Button>

                  <Button variant="outline" className="justify-start h-auto py-4" asChild>
                    <Link href="/verifier/revocation-requests">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          <FileX className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">Revocation Requests</p>
                          <p className="text-xs text-muted-foreground">Review revocations</p>
                        </div>
                      </div>
                    </Link>
                  </Button>

                  <Button variant="outline" className="justify-start h-auto py-4" asChild>
                    <Link href="/verifier/history">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <Calendar className="h-5 w-5 text-purple-500" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">Approval History</p>
                          <p className="text-xs text-muted-foreground">View past actions</p>
                        </div>
                      </div>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!canVerify && isConnected && isCorrectChain && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Not Authorized</AlertTitle>
            <AlertDescription>
              You are not registered as a verifier for any university. Please contact your university administrator.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

export default function VerifierDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <DashboardHeader title="Verifier Dashboard" />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    }>
      <VerifierDashboardContent />
    </Suspense>
  )
}
