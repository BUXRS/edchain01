"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useWeb3 } from "@/components/providers/web3-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FileCheck,
  FileX,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import {
  fetchUniversityFromBlockchain,
  checkIsVerifierOnChain,
  findUniversitiesWhereVerifier,
  type BlockchainUniversity,
} from "@/lib/blockchain"
import { toast } from "sonner"

interface ApprovalHistory {
  id: number
  request_id: number
  request_type: "degree" | "revocation"
  token_id?: number
  recipient_address?: string
  requester_address: string
  status: "approved" | "rejected" | "pending"
  approval_count: number
  required_approvals: number
  created_at: string
  updated_at: string
}

function ApprovalHistoryContent() {
  const searchParams = useSearchParams()
  const universityIdParam = searchParams.get("universityId")

  const { isConnected, isCorrectChain, address } = useWeb3()

  const [university, setUniversity] = useState<BlockchainUniversity | null>(null)
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [isVerifier, setIsVerifier] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [history, setHistory] = useState<ApprovalHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "degree" | "revocation">("all")

  useEffect(() => {
    if (isConnected && isCorrectChain && address) {
      checkVerifierStatus()
    } else {
      setIsLoading(false)
    }
  }, [universityIdParam, isConnected, isCorrectChain, address])

  useEffect(() => {
    if (universityId && isVerifier) {
      loadHistory()
    }
  }, [universityId, isVerifier])

  const checkVerifierStatus = async () => {
    setIsLoading(true)
    try {
      if (universityIdParam) {
        const id = Number.parseInt(universityIdParam)
        const uni = await fetchUniversityFromBlockchain(id)
        const verifierStatus = await checkIsVerifierOnChain(id, address!)
        setUniversity(uni)
        setUniversityId(id)
        setIsVerifier(verifierStatus)
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

  const loadHistory = async () => {
    if (!universityId) return
    setLoadingHistory(true)
    try {
      console.log("[Verifier History] Loading history for universityBlockchainId:", universityId)
      // Fetch both degree and revocation requests (all statuses)
      // Use universityBlockchainId since universityId is the blockchain ID
      // IMPORTANT: Pass status=all to get all requests (not just pending)
      const [degreeRes, revocationRes] = await Promise.all([
        fetch(`/api/degree-requests?universityBlockchainId=${universityId}&status=all`),
        fetch(`/api/revocation-requests?universityBlockchainId=${universityId}&status=all`),
      ])

      const degreeData = await degreeRes.json()
      const revocationData = await revocationRes.json()

      const degreeHistory: ApprovalHistory[] = (degreeData.requests || []).map((req: any) => ({
        id: req.id,
        request_id: req.request_id,
        request_type: "degree" as const,
        recipient_address: req.recipient_address,
        requester_address: req.requester_address,
        status: req.status,
        approval_count: req.approval_count || 0,
        required_approvals: req.required_approvals || 0,
        created_at: req.created_at,
        updated_at: req.updated_at || req.created_at,
      }))

      const revocationHistory: ApprovalHistory[] = (revocationData.requests || []).map((req: any) => ({
        id: req.id,
        request_id: req.request_id,
        request_type: "revocation" as const,
        token_id: req.token_id,
        requester_address: req.requester_address,
        status: req.status,
        approval_count: req.approval_count || 0,
        required_approvals: req.required_approvals || 0,
        created_at: req.created_at,
        updated_at: req.updated_at || req.created_at,
      }))

      // Combine and sort by date (newest first)
      const combined = [...degreeHistory, ...revocationHistory].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )

      setHistory(combined)
    } catch (error) {
      console.error("Error loading history:", error)
      toast.error("Failed to load approval history")
    } finally {
      setLoadingHistory(false)
    }
  }

  const filteredHistory = history.filter((item) => {
    if (activeTab === "all") return true
    return item.request_type === activeTab
  })

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Approval History" />
        <div className="p-6 flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Approval History" />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Approval History</CardTitle>
              <CardDescription>
                View all degree and revocation requests you have reviewed
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadHistory} disabled={loadingHistory}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Requests</TabsTrigger>
                <TabsTrigger value="degree">Degree Requests</TabsTrigger>
                <TabsTrigger value="revocation">Revocation Requests</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No approval history found</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistory.map((item) => (
                          <TableRow key={`${item.request_type}-${item.request_id}`}>
                            <TableCell className="font-mono">#{item.request_id}</TableCell>
                            <TableCell>
                              <Badge variant={item.request_type === "degree" ? "default" : "destructive"}>
                                {item.request_type === "degree" ? (
                                  <FileCheck className="h-3 w-3 mr-1" />
                                ) : (
                                  <FileX className="h-3 w-3 mr-1" />
                                )}
                                {item.request_type === "degree" ? "Degree" : "Revocation"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.request_type === "degree" ? (
                                <div className="text-sm">
                                  <p className="font-mono text-xs">
                                    {item.recipient_address?.slice(0, 10)}...{item.recipient_address?.slice(-8)}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-sm">
                                  <p className="font-mono">Token #{item.token_id}</p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.status === "approved"
                                    ? "default"
                                    : item.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {item.status === "approved" ? (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                ) : item.status === "rejected" ? (
                                  <XCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <Clock className="h-3 w-3 mr-1" />
                                )}
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {item.approval_count} / {item.required_approvals}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {new Date(item.updated_at).toLocaleDateString()}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

export default function ApprovalHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <DashboardHeader title="Approval History" />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    }>
      <ApprovalHistoryContent />
    </Suspense>
  )
}
