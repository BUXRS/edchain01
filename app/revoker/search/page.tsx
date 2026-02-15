"use client"

import { Suspense, useState } from "react"
import { useAccount } from "wagmi"
import Link from "next/link"
import { useContract } from "@/hooks/use-contract"
import { CHAIN_ID } from "@/lib/contracts/abi"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, AlertTriangle, FileX, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

function RevokerSearchContent() {
  const { address } = useAccount()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState<"id" | "address">("id")
  const [searchedDegreeId, setSearchedDegreeId] = useState<bigint | null>(null)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [revocationReason, setRevocationReason] = useState("")

  // ✅ DB-FIRST: Use API endpoint instead of direct chain read
  const { data: verifyData, isLoading: isSearching, mutate: refetch } = useSWR(
    searchedDegreeId ? `/api/verify/degree/${searchedDegreeId}` : null,
    fetcher
  )

  const { revokeDegree: requestRevocation, isLoading: isRevoking } = useContract()
  const [submittedRevocationRequestId, setSubmittedRevocationRequestId] = useState<number | null>(null)

  const isMainnet = CHAIN_ID === 8453
  const basescanUrl = isMainnet ? "https://basescan.org" : "https://sepolia.basescan.org"

  const handleSearch = () => {
    if (!searchQuery.trim()) return

    if (searchType === "id") {
      try {
        const degreeId = BigInt(searchQuery)
        setSearchedDegreeId(degreeId)
      } catch {
        toast.error("Invalid degree ID format")
      }
    } else {
      toast.info("Address search would query contract events - using ID search for demo")
    }
  }

  const handleRevoke = () => {
    if (!searchedDegreeId || !revocationReason.trim()) return
    setShowRevokeDialog(false)
    setShowConfirmDialog(true)
  }

  const confirmRevoke = async () => {
    if (!searchedDegreeId) return

    try {
      const result = await requestRevocation(searchedDegreeId)
      setShowConfirmDialog(false)
      setRevocationReason("")
      refetch()

      const isRequest = typeof result === "object" && result !== null && "requestId" in result
      if (isRequest && typeof (result as { requestId?: unknown }).requestId === "number") {
        setSubmittedRevocationRequestId((result as { requestId: number }).requestId)
        toast.success("Revocation request submitted. Track status in My Revocation Requests.")
      } else if (result === true) {
        toast.success("Degree revoked successfully.")
      } else {
        toast.error("Failed to submit revocation request.")
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to submit revocation request"
      toast.error(msg)
      setShowConfirmDialog(false)
    }
  }

  // Map API response to expected format (use blockchain data if available, fallback to DB)
  const blockchainData = verifyData?.blockchain?.data
  const dbData = verifyData?.database?.data
  const degreeData = blockchainData || dbData
  
  const degree = degreeData ? {
    universityId: BigInt(degreeData.universityId || degreeData.university_id || 0),
    gpa: degreeData.gpa || degreeData.cgpa || 0,
    year: degreeData.year || (degreeData.graduation_date ? new Date(degreeData.graduation_date).getFullYear() : 0),
    level: degreeData.level || 0,
    isRevoked: degreeData.isRevoked !== undefined ? degreeData.isRevoked : (degreeData.is_revoked || false),
    issuedAt: degreeData.issuedAt || (degreeData.created_at ? Math.floor(new Date(degreeData.created_at).getTime() / 1000) : 0),
    revokedAt: degreeData.revokedAt || (degreeData.revoked_at ? Math.floor(new Date(degreeData.revoked_at).getTime() / 1000) : 0),
    nameAr: degreeData.nameAr || degreeData.student_name_ar || "",
    nameEn: degreeData.nameEn || degreeData.student_name || "",
    facultyAr: degreeData.facultyAr || "",
    facultyEn: degreeData.facultyEn || "",
    majorAr: degreeData.majorAr || degreeData.major_ar || "",
    majorEn: degreeData.majorEn || degreeData.major || "",
  } : undefined

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Search Degrees</h1>
        <p className="text-muted-foreground mt-1">Find and revoke degrees issued by your university</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Enter a degree ID or student wallet address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={searchType === "id" ? "default" : "outline"} size="sm" onClick={() => setSearchType("id")}>
              By Degree ID
            </Button>
            <Button
              variant={searchType === "address" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType("address")}
            >
              By Student Address
            </Button>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder={searchType === "id" ? "Enter degree ID (e.g., 1)" : "Enter student wallet address (0x...)"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchedDegreeId !== null && degree && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Degree Found</CardTitle>
                <Badge variant={degree.isRevoked ? "destructive" : "default"}>
                  {degree.isRevoked ? "Revoked" : "Active"}
                </Badge>
              </div>
              {!degree.isRevoked && (
                <Button variant="destructive" onClick={() => setShowRevokeDialog(true)} className="gap-2">
                  <FileX className="w-4 h-4" />
                  Revoke Degree
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Degree ID</p>
                  <p className="font-mono text-foreground">{searchedDegreeId.toString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student Name (English)</p>
                  <p className="font-medium text-foreground">{degree.nameEn}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student Name (Arabic)</p>
                  <p className="font-medium text-foreground" dir="rtl">
                    {degree.nameAr}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faculty</p>
                  <p className="font-medium text-foreground">{degree.facultyEn}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Major (English)</p>
                  <p className="font-medium text-foreground">{degree.majorEn}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Major (Arabic)</p>
                  <p className="font-medium text-foreground" dir="rtl">
                    {degree.majorAr}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GPA</p>
                  <p className="text-foreground">{(degree.gpa / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Graduation Year</p>
                  <p className="text-foreground">{degree.year}</p>
                </div>
              </div>
            </div>
            {degree.isRevoked && (
              <div className="mt-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">This degree has been revoked</p>
                  <p className="text-sm text-muted-foreground">The degree is no longer valid and cannot be verified</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {searchedDegreeId !== null && !degree && !isSearching && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No Degree Found</h3>
              <p className="text-muted-foreground mt-1">No degree exists with ID {searchedDegreeId.toString()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Revoke Degree
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for revoking this degree. This action is permanent and will be recorded on the
              blockchain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Revocation Reason</Label>
              <Textarea
                placeholder="Enter the reason for revocation (e.g., Academic misconduct, Fraudulent documentation, etc.)"
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Note: The reason will be stored off-chain for audit purposes. Only the revocation status is recorded
                on-chain.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={!revocationReason.trim()}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently revoke degree #{searchedDegreeId?.toString()}. This action cannot be undone
              and will be recorded on the blockchain forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Revocation Request"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {submittedRevocationRequestId !== null && (
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-medium text-foreground">Revocation Request Submitted</p>
                <p className="text-sm text-muted-foreground">
                  Request ID: {submittedRevocationRequestId}. Verifiers must approve before the degree is revoked.
                </p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/revoker/requests">My Revocation Requests</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function RevokerSearchPage() {
  return (
    <Suspense fallback={null}>
      <RevokerSearchContent />
    </Suspense>
  )
}
