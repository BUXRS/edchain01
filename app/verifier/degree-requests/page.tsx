"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useContract } from "@/hooks/use-contract"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileCheck,
  Loader2,
  RefreshCw,
  Check,
  X,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ExternalLink,
  Filter,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  User,
  GraduationCap,
  Calendar,
  Award,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useSWR from "swr"
import {
  fetchUniversityFromBlockchain,
  checkIsVerifierOnChain,
  findUniversitiesWhereVerifier,
  type BlockchainUniversity,
} from "@/lib/blockchain"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const BASESCAN_URL = "https://basescan.org"

interface DegreeRequest {
  id: number
  request_id: number
  university_id: number
  recipient_address: string
  requester_address: string
  student_name?: string
  student_name_ar?: string
  faculty_en?: string
  faculty_ar?: string
  major_en?: string
  major_ar?: string
  degree_name_en?: string
  degree_name_ar?: string
  gpa?: number
  year?: number
  approval_count: number
  required_approvals: number
  status: string
  created_at: string
  created_tx_hash?: string
  executed_at?: string
  token_id?: number
  blockchainData?: any
  approvalProgress?: string
}

function DegreeRequestsContent() {
  const searchParams = useSearchParams()
  const universityIdParam = searchParams.get("universityId")

  const { isConnected, isCorrectChain, address, connect, switchChain } = useWeb3()
  const {
    approveDegreeRequest,
    rejectDegreeRequest,
    withdrawDegreeApproval,
    isLoading: contractLoading,
  } = useContract()

  const [university, setUniversity] = useState<BlockchainUniversity | null>(null)
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [isVerifier, setIsVerifier] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [degreeRequests, setDegreeRequests] = useState<DegreeRequest[]>([])
  const [processingRequest, setProcessingRequest] = useState<number | null>(null)
  const [approvedRequests, setApprovedRequests] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isConnected && isCorrectChain && address) {
      checkVerifierStatus()
    } else {
      setIsLoading(false)
    }
  }, [universityIdParam, isConnected, isCorrectChain, address])

  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("all")
  
  const apiUrl = universityId && isVerifier && address
    ? `/api/degree-requests?universityBlockchainId=${universityId}&status=${statusFilter}`
    : null
  
  console.log("[Verifier Degree Requests] API URL:", apiUrl, { universityId, isVerifier, address, statusFilter })
  
  const { data: degreeData, mutate: mutateRequests } = useSWR(
    apiUrl,
    fetcher,
    { refreshInterval: 10000 }
  )

  useEffect(() => {
    if (degreeData?.requests) {
      setDegreeRequests(degreeData.requests)
      const approved = new Set<number>()
      const addr = address?.toLowerCase()
      for (const request of degreeData.requests as { request_id: number; approved_by?: string[] }[]) {
        if (addr && request.approved_by?.includes(addr)) approved.add(request.request_id)
      }
      setApprovedRequests(approved)
    }
  }, [degreeData, address])

  const checkVerifierStatus = async () => {
    setIsLoading(true)
    try {
      if (universityIdParam) {
        const id = Number.parseInt(universityIdParam)
        console.log("[Verifier Degree Requests] Checking status for universityId from URL:", id)
        const uni = await fetchUniversityFromBlockchain(id)
        const verifierStatus = await checkIsVerifierOnChain(id, address!)
        console.log("[Verifier Degree Requests] University from blockchain:", uni, "isVerifier:", verifierStatus)
        setUniversity(uni)
        setUniversityId(id)
        setIsVerifier(verifierStatus)
      } else {
        console.log("[Verifier Degree Requests] No universityId param, finding all universities for verifier:", address)
        const allUniversities = await findUniversitiesWhereVerifier(address!)
        console.log("[Verifier Degree Requests] Found universities:", allUniversities)
        if (allUniversities.length > 0) {
          const selectedUni = allUniversities[0]
          const blockchainId = Number(selectedUni.id)
          console.log("[Verifier Degree Requests] Selected university blockchain_id:", blockchainId, selectedUni)
          setUniversity(selectedUni)
          setUniversityId(blockchainId)
          setIsVerifier(true)
        } else {
          console.log("[Verifier Degree Requests] No universities found for verifier")
          setIsVerifier(false)
        }
      }
    } catch (error) {
      console.error("[Verifier Degree Requests] Error checking verifier status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (requestId: number) => {
    if (!address) return
    setProcessingRequest(requestId)
    try {
      toast.info("Approving degree request on blockchain...")
      const result = await approveDegreeRequest(requestId)
      if (result.success) {
        if (result.issued) {
          toast.success("Degree request approved and degree issued!")
        } else {
          toast.success("Approval recorded. Waiting for more approvals...")
        }
        setApprovedRequests(prev => new Set([...prev, requestId]))
        mutateRequests()
      } else {
        toast.error("Failed to approve degree request")
      }
    } catch (error: any) {
      console.error("Error approving degree request:", error)
      toast.error(error.message || "Failed to approve degree request")
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleReject = async (requestId: number) => {
    if (!address) return
    setProcessingRequest(requestId)
    try {
      toast.info("Rejecting degree request on blockchain...")
      const success = await rejectDegreeRequest(requestId)
      
      if (success) {
        toast.success("Degree request rejected")
        mutateRequests()
      } else {
        toast.error("Failed to reject degree request")
      }
    } catch (error: any) {
      console.error("Error rejecting degree request:", error)
      toast.error(error.message || "Failed to reject degree request")
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleWithdraw = async (requestId: number) => {
    if (!address) return
    setProcessingRequest(requestId)
    try {
      toast.info("Withdrawing approval on blockchain...")
      const success = await withdrawDegreeApproval(requestId)
      if (success) {
        toast.success("Approval withdrawn")
        setApprovedRequests((prev) => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
        mutateRequests()
      } else {
        toast.error("Failed to withdraw approval")
      }
    } catch (error: any) {
      console.error("Error withdrawing approval:", error)
      toast.error(error.message || "Failed to withdraw approval")
    } finally {
      setProcessingRequest(null)
    }
  }

  const canVerify = isConnected && isCorrectChain && isVerifier && university?.isActive

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Degree Requests" />
        <div className="p-6 flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Degree Requests" />

      <div className="p-6 space-y-6">
        {!isConnected && (
          <Alert>
            <Wallet className="h-4 w-4" />
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
            <AlertDescription className="flex items-center justify-between">
              <span>Please switch to Base Mainnet network.</span>
              <Button onClick={switchChain} variant="outline" size="sm" className="ml-4 bg-transparent">
                Switch Network
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {canVerify && (
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-primary" />
                    Degree Requests
                  </CardTitle>
                  <CardDescription>
                    Review and approve/reject degree issuance requests. Approve signs on-chain; when enough verifiers approve, the degree is minted automatically.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={(val: "pending" | "all") => setStatusFilter(val)}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Requests</SelectItem>
                      <SelectItem value="pending">Pending Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => mutateRequests()} disabled={!degreeData}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${!degreeData ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {universityId && isVerifier && address && degreeData === undefined ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : degreeRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {statusFilter === "pending" ? "No pending degree requests" : "No degree requests found"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {degreeRequests.map((request) => {
                    const canApprove = request.status?.toLowerCase() === "pending"
                    const approvalProgress = `${request.approval_count} / ${request.required_approvals}`
                    const isProcessing = processingRequest === request.request_id
                    const hasApproved = approvedRequests.has(request.request_id)

                    const statusColors = {
                      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                      issued: "bg-green-500/10 text-green-500 border-green-500/20",
                      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
                      approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                    }
                    const statusColor = statusColors[request.status?.toLowerCase() as keyof typeof statusColors] || statusColors.pending

                    const copyToClipboard = (text: string, label: string) => {
                      navigator.clipboard.writeText(text)
                      toast.success(`${label} copied to clipboard`)
                    }

                    return (
                      <Card key={request.id} className="border-border/50 hover:border-border transition-colors">
                        <CardContent className="p-6">
                          {/* Header Section */}
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${statusColor}`}>
                                <FileCheck className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold">Request #{request.request_id}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className={`${statusColor} border`}>
                                    {request.status === "issued" && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {request.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                                    {request.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                    {request.status?.toUpperCase()}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {request.approval_count}/{request.required_approvals} approvals
                                  </span>
                                </div>
                              </div>
                            </div>
                            {request.token_id && (
                              <Badge variant="secondary" className="text-xs">
                                Token #{request.token_id}
                              </Badge>
                            )}
                          </div>

                          {/* Student Information Section */}
                          {(request.student_name || request.student_name_ar) && (
                            <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Student Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {request.student_name && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Name</p>
                                    <p className="font-medium">{request.student_name}</p>
                                    {request.student_name_ar && (
                                      <p className="text-sm text-muted-foreground mt-1" dir="rtl">{request.student_name_ar}</p>
                                    )}
                                  </div>
                                )}
                                {request.gpa !== undefined && request.gpa !== null && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">GPA</p>
                                    <p className="font-medium">{(request.gpa / 100).toFixed(2)} / 5.00</p>
                                  </div>
                                )}
                                {request.year && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Graduation Year
                                    </p>
                                    <p className="font-medium">{request.year}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Academic Details Section */}
                          {(request.degree_name_en || request.major_en || request.faculty_en) && (
                            <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" />
                                Academic Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {request.degree_name_en && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                      <Award className="h-3 w-3" />
                                      Degree
                                    </p>
                                    <p className="font-medium">{request.degree_name_en}</p>
                                    {request.degree_name_ar && (
                                      <p className="text-sm text-muted-foreground mt-1" dir="rtl">{request.degree_name_ar}</p>
                                    )}
                                  </div>
                                )}
                                {request.major_en && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Major</p>
                                    <p className="font-medium">{request.major_en}</p>
                                    {request.major_ar && (
                                      <p className="text-sm text-muted-foreground mt-1" dir="rtl">{request.major_ar}</p>
                                    )}
                                  </div>
                                )}
                                {request.faculty_en && (
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-muted-foreground mb-1">Faculty</p>
                                    <p className="font-medium">{request.faculty_en}</p>
                                    {request.faculty_ar && (
                                      <p className="text-sm text-muted-foreground mt-1" dir="rtl">{request.faculty_ar}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Blockchain Addresses Section */}
                          <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Blockchain Addresses</h4>
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Recipient</p>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-background px-2 py-1 rounded border flex-1 truncate">
                                    {request.recipient_address}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => copyToClipboard(request.recipient_address, "Recipient address")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Requester</p>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-background px-2 py-1 rounded border flex-1 truncate">
                                    {request.requester_address}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => copyToClipboard(request.requester_address, "Requester address")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Timeline Section */}
                          <div className="mb-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Created: {new Date(request.created_at).toLocaleString()}</span>
                            </div>
                            {request.executed_at && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                <span>Executed: {new Date(request.executed_at).toLocaleString()}</span>
                              </div>
                            )}
                          </div>

                          {/* Approval Status Alert */}
                          {hasApproved && (
                            <Alert className="mb-6 bg-green-500/10 border-green-500/20">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <AlertDescription className="text-green-500">
                                You have approved this request. {canApprove && "You can withdraw your approval below."}
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Actions Section */}
                          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/50">
                            {request.created_tx_hash && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="text-xs"
                              >
                                <a
                                  href={`${BASESCAN_URL}/tx/${request.created_tx_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3 mr-2" />
                                  View on BaseScan
                                </a>
                              </Button>
                            )}
                            
                            {canApprove && !hasApproved && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(request.request_id)}
                                  disabled={isProcessing || contractLoading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                  )}
                                  Approve on Chain
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(request.request_id)}
                                  disabled={isProcessing || contractLoading}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <X className="h-4 w-4 mr-2" />
                                  )}
                                  Reject
                                </Button>
                              </>
                            )}
                            
                            {canApprove && hasApproved && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleWithdraw(request.request_id)}
                                disabled={isProcessing || contractLoading}
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <X className="h-4 w-4 mr-2" />
                                )}
                                Withdraw Approval
                              </Button>
                            )}
                            
                            {!canApprove && (
                              <span className="text-xs text-muted-foreground italic">
                                No actions available - request has been {request.status?.toLowerCase()}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function DegreeRequestsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <DashboardHeader title="Degree Requests" />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    }>
      <DegreeRequestsContent />
    </Suspense>
  )
}