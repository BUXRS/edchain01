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
  FileX,
  Loader2,
  RefreshCw,
  Check,
  X,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ExternalLink,
} from "lucide-react"
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

interface RevocationRequest {
  id: number
  request_id: number
  token_id: number
  university_id: number
  requester_address: string
  approval_count: number
  required_approvals: number
  status: string
  created_at: string
  created_tx_hash?: string
  executed_at?: string
  blockchainData?: any
  approvalProgress?: string
}

function RevocationRequestsContent() {
  const searchParams = useSearchParams()
  const universityIdParam = searchParams.get("universityId")

  const { isConnected, isCorrectChain, address, connect, switchChain } = useWeb3()
  const {
    approveRevocationRequest,
    rejectRevocationRequest,
    withdrawRevocationApproval,
    isLoading: contractLoading,
  } = useContract()

  const [university, setUniversity] = useState<BlockchainUniversity | null>(null)
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [isVerifier, setIsVerifier] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [revocationRequests, setRevocationRequests] = useState<RevocationRequest[]>([])
  const [processingRequest, setProcessingRequest] = useState<number | null>(null)
  const [approvedRequests, setApprovedRequests] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isConnected && isCorrectChain && address) {
      checkVerifierStatus()
    } else {
      setIsLoading(false)
    }
  }, [universityIdParam, isConnected, isCorrectChain, address])

  const { data: revocationData, mutate: mutateRequests } = useSWR(
    universityId && isVerifier && address
      ? `/api/revocation-requests?universityBlockchainId=${universityId}&status=pending`
      : null,
    fetcher,
    { refreshInterval: 10000 }
  )

  useEffect(() => {
    if (revocationData?.requests) {
      setRevocationRequests(revocationData.requests)
      const approved = new Set<number>()
      const addr = address?.toLowerCase()
      for (const request of revocationData.requests as { request_id: number; approved_by?: string[] }[]) {
        if (addr && request.approved_by?.includes(addr)) approved.add(request.request_id)
      }
      setApprovedRequests(approved)
    }
  }, [revocationData, address])

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

  const handleApprove = async (requestId: number) => {
    if (!address) return
    setProcessingRequest(requestId)
    try {
      toast.info("Approving revocation request on blockchain...")
      const result = await approveRevocationRequest(requestId)
      
      if (result.success) {
        if (result.revoked) {
          toast.success("Revocation request approved and degree revoked!")
        } else {
          toast.success("Approval recorded. Waiting for more approvals...")
        }
        setApprovedRequests(prev => new Set([...prev, requestId]))
        mutateRequests()
      } else {
        toast.error("Failed to approve revocation request")
      }
    } catch (error: any) {
      console.error("Error approving revocation request:", error)
      toast.error(error.message || "Failed to approve revocation request")
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleWithdraw = async (requestId: number) => {
    if (!address) return
    setProcessingRequest(requestId)
    try {
      toast.info("Withdrawing approval on blockchain...")
      const success = await withdrawRevocationApproval(requestId)
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

  const handleReject = async (requestId: number) => {
    if (!address) return
    setProcessingRequest(requestId)
    try {
      toast.info("Rejecting revocation request on blockchain...")
      const success = await rejectRevocationRequest(requestId)
      
      if (success) {
        toast.success("Revocation request rejected")
        mutateRequests()
      } else {
        toast.error("Failed to reject revocation request")
      }
    } catch (error: any) {
      console.error("Error rejecting revocation request:", error)
      toast.error(error.message || "Failed to reject revocation request")
    } finally {
      setProcessingRequest(null)
    }
  }

  const canVerify = isConnected && isCorrectChain && isVerifier && university?.isActive

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Revocation Requests" />
        <div className="p-6 flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Revocation Requests" />

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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileX className="h-5 w-5 text-destructive" />
                  Pending Revocation Requests
                </CardTitle>
                <CardDescription>
                  Review and approve/reject degree revocation requests. Approve signs on-chain; when enough verifiers approve, the degree is revoked automatically.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => mutateRequests()} disabled={!revocationData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {universityId && isVerifier && address && revocationData === undefined ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : revocationRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending revocation requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {revocationRequests.map((request) => {
                    const canApprove = request.status?.toLowerCase() === "pending"
                    const approvalProgress = `${request.approval_count} / ${request.required_approvals}`
                    const isProcessing = processingRequest === request.request_id
                    const hasApproved = approvedRequests.has(request.request_id)

                    return (
                      <Card key={request.id} className="border-border/50">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <FileX className="h-5 w-5 text-destructive shrink-0" />
                              <div>
                                <h3 className="font-semibold">Revocation Request #{request.request_id}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Requested by: {request.requester_address.slice(0, 10)}...{request.requester_address.slice(-8)}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Token ID</p>
                                  <p className="text-sm font-mono font-semibold">{request.token_id}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Requester Address</p>
                                  <p className="text-sm font-mono break-all">{request.requester_address}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Approval Progress</p>
                                  <p className="text-sm font-semibold">{approvalProgress}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Status</p>
                                  <Badge variant={request.status === "pending" ? "default" : request.status === "approved" ? "default" : "destructive"}>
                                    {request.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
                                <div>
                                  <p className="text-xs text-muted-foreground">Created At</p>
                                  <p className="text-sm">{new Date(request.created_at).toLocaleString()}</p>
                                </div>
                                {request.executed_at && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Executed At</p>
                                    <p className="text-sm">{new Date(request.executed_at).toLocaleString()}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-muted-foreground">University ID</p>
                                  <p className="text-sm">{request.university_id}</p>
                                </div>
                              </div>
                            </div>
                            {hasApproved && (
                              <Alert className="bg-green-500/10 border-green-500/20">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <AlertDescription className="text-green-500">
                                  You have already approved this request. You can withdraw your approval below.
                                </AlertDescription>
                              </Alert>
                            )}
                            {/* Action bar: always visible at bottom of card */}
                            <div className="flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-border/50">
                              {request.created_tx_hash && (
                                <a
                                  href={`${BASESCAN_URL}/tx/${request.created_tx_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  View creation tx on BaseScan <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <span className="text-xs text-muted-foreground mr-2">Actions (on-chain):</span>
                              {canApprove && !hasApproved && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(request.request_id)}
                                    disabled={isProcessing || contractLoading}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Approve and sign on chain
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(request.request_id)}
                                    disabled={isProcessing || contractLoading}
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <X className="h-4 w-4 mr-2" />
                                        Reject
                                      </>
                                    )}
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
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Withdraw approval"
                                  )}
                                </Button>
                              )}
                              {!canApprove && (
                                <span className="text-xs text-muted-foreground">No actions available for this request.</span>
                              )}
                            </div>
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

export default function RevocationRequestsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <DashboardHeader title="Revocation Requests" />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    }>
      <RevocationRequestsContent />
    </Suspense>
  )
}
