"use client"

import { Suspense, useEffect, useState } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  GraduationCap,
  Wallet,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  ExternalLink,
  QrCode,
  FileText,
  Building2,
  Award,
  Calendar,
  Copy,
  Check,
  Eye,
} from "lucide-react"
import type { BlockchainDegree } from "@/lib/blockchain"
import { PROTOCOL_ADDRESS } from "@/lib/contracts/abi"
import Link from "next/link"
import { Input } from "@/components/ui/input"

const DEGREE_LEVELS = ["Bachelor", "Master", "PhD"]

type DegreeWithMeta = BlockchainDegree & { tokenId: number; owner: string }

function GraduateDashboardContent() {
  const { isConnected, isCorrectChain, address, connect, switchChain } = useWeb3()

  const [degrees, setDegrees] = useState<DegreeWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDegree, setSelectedDegree] = useState<DegreeWithMeta | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected && isCorrectChain && address) {
      loadDegrees()
    } else {
      setIsLoading(false)
    }
  }, [isConnected, isCorrectChain, address])

  const loadDegrees = async () => {
    if (!address) return
    setIsLoading(true)
    setError(null)

    try {
      // ✅ ARCHITECTURE COMPLIANCE: Fetch from DB-backed API, not blockchain directly
      const res = await fetch(`/api/degrees?studentAddress=${address}`)
      const data = await res.json()
      
      if (data.degrees && Array.isArray(data.degrees)) {
        // Map DB format to component format
        const mappedDegrees: DegreeWithMeta[] = data.degrees.map((d: any) => ({
          tokenId: Number(d.token_id),
          universityId: Number(d.university_id),
          nameEn: d.student_name || "",
          nameAr: d.student_name_ar || "",
          majorEn: d.major || "",
          majorAr: d.major_ar || "",
          facultyEn: d.faculty || "",
          facultyAr: d.faculty_ar || "",
          year: d.graduation_year || 0,
          gpa: d.gpa ? Number(d.gpa) : 0,
          level: d.degree_level || 0,
          isRevoked: d.is_revoked || false,
          issuedAt: d.created_at ? Math.floor(new Date(d.created_at).getTime() / 1000) : 0,
          revokedAt: d.revoked_at ? Math.floor(new Date(d.revoked_at).getTime() / 1000) : 0,
          owner: d.recipient_wallet || address,
        }))
        setDegrees(mappedDegrees)
      } else {
        setDegrees([])
      }
    } catch (err: any) {
      console.error("Failed to load degrees:", err)
      setError(err?.message || "Failed to load degrees")
      setDegrees([])
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getVerificationUrl = (tokenId: number) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/verify?id=${tokenId}`
    }
    return `/verify?id=${tokenId}`
  }

  const getQrCodeUrl = (tokenId: number) => {
    const verificationUrl = getVerificationUrl(tokenId)
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verificationUrl)}`
  }

  const handleDownloadCertificate = async (degree: DegreeWithMeta) => {
    try {
      // Fetch certificate image from API
      const response = await fetch(`/api/degrees/${degree.tokenId}/certificate`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `degree-certificate-${degree.tokenId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // Fallback: Open verification page in new tab for printing
        window.open(getVerificationUrl(degree.tokenId), "_blank")
      }
    } catch (err) {
      console.error("Error downloading certificate:", err)
      // Fallback: Open verification page
      window.open(getVerificationUrl(degree.tokenId), "_blank")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Graduate Dashboard" />
        <div className="p-6 flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your degrees from blockchain...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Graduate Dashboard" />

      <div className="p-6 space-y-6">
        {/* Connection Status */}
        {!isConnected && (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertTitle>Wallet Required</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Connect your wallet to view your degrees.</span>
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

        {isConnected && isCorrectChain && (
          <>
            {/* Account Info */}
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Your Account</CardTitle>
                    <CardDescription>Blockchain-verified degree holder</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">Your Wallet</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-mono text-sm text-foreground">{address}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(address || "", "wallet")}
                      >
                        {copiedField === "wallet" ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">Total Degrees</p>
                    <p className="font-semibold text-2xl mt-1 text-foreground">{degrees.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Success Alert */}
            {degrees.length > 0 && (
              <Alert className="border-success bg-success/5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertTitle className="text-success">Degrees Verified On-Chain</AlertTitle>
                <AlertDescription>
                  You have {degrees.length} blockchain-verified degree{degrees.length !== 1 ? "s" : ""} in your wallet.
                  All credentials are permanently recorded on Base Mainnet.
                </AlertDescription>
              </Alert>
            )}

            {/* No Degrees */}
            {degrees.length === 0 && !error && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Degrees Found</AlertTitle>
                <AlertDescription>
                  No degree NFTs were found for this wallet address. Make sure you're connecting the wallet that
                  received your degree certificate.
                </AlertDescription>
              </Alert>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Degrees List */}
            {degrees.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">My Degrees</h2>
                  <Button onClick={loadDegrees} variant="outline" size="sm">
                    <Loader2 className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {degrees.map((degree) => (
                    <Card key={degree.tokenId} className="hover:border-primary/50 transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                              <GraduationCap className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {degree.nameEn || "Degree Certificate"}
                              </CardTitle>
                              <CardDescription>
                                {DEGREE_LEVELS[degree.level] || "Degree"} • Token #{degree.tokenId}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant={degree.isRevoked ? "destructive" : "default"} className="gap-1">
                            {degree.isRevoked ? (
                              <>
                                <XCircle className="h-3 w-3" />
                                Revoked
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Valid
                              </>
                            )}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">University:</span>
                            <span className="font-medium">ID {degree.universityId}</span>
                          </div>
                          {degree.majorEn && (
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Major:</span>
                              <span className="font-medium">{degree.majorEn}</span>
                            </div>
                          )}
                          {degree.year && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Year:</span>
                              <span className="font-medium">{degree.year}</span>
                            </div>
                          )}
                          {degree.gpa && (
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">GPA:</span>
                              <span className="font-medium">{(degree.gpa / 100).toFixed(2)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedDegree(degree)
                              setIsViewDialogOpen(true)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDownloadCertificate(degree)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/graduate/share?tokenId=${degree.tokenId}`}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Share
                            </Link>
                          </Button>
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            asChild
                          >
                            <a
                              href={`https://basescan.org/nft/${PROTOCOL_ADDRESS}/${degree.tokenId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on BaseScan"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            asChild
                          >
                            <a
                              href={`https://opensea.io/assets/base/${PROTOCOL_ADDRESS}/${degree.tokenId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on OpenSea"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Certificate Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Degree Certificate - Token #{selectedDegree?.tokenId}</DialogTitle>
            <DialogDescription>View and verify your blockchain-verified degree</DialogDescription>
          </DialogHeader>
          {selectedDegree && (
            <div className="space-y-6">
              {/* Certificate Image */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <img
                  src={`/api/degrees/${selectedDegree.tokenId}/certificate-image`}
                  alt={`Degree Certificate ${selectedDegree.tokenId}`}
                  className="w-full h-auto rounded"
                  onError={(e) => {
                    // Fallback if image doesn't exist
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    const fallback = document.createElement("div")
                    fallback.className = "p-8 text-center text-muted-foreground"
                    fallback.textContent = "Certificate image not available"
                    target.parentElement?.appendChild(fallback)
                  }}
                />
              </div>

              {/* Degree Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Degree Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Student Name</p>
                      <p className="font-medium">{selectedDegree.nameEn || "N/A"}</p>
                      {selectedDegree.nameAr && (
                        <p className="text-sm text-muted-foreground" dir="rtl">{selectedDegree.nameAr}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Degree Level</p>
                      <p className="font-medium">{DEGREE_LEVELS[selectedDegree.level] || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Major</p>
                      <p className="font-medium">{selectedDegree.majorEn || "N/A"}</p>
                      {selectedDegree.majorAr && (
                        <p className="text-sm text-muted-foreground" dir="rtl">{selectedDegree.majorAr}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Faculty</p>
                      <p className="font-medium">{selectedDegree.facultyEn || "N/A"}</p>
                      {selectedDegree.facultyAr && (
                        <p className="text-sm text-muted-foreground" dir="rtl">{selectedDegree.facultyAr}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p className="font-medium">{selectedDegree.year || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">GPA</p>
                      <p className="font-medium">
                        {selectedDegree.gpa ? (selectedDegree.gpa / 100).toFixed(2) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Token ID</p>
                      <p className="font-medium">#{selectedDegree.tokenId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={selectedDegree.isRevoked ? "destructive" : "default"}>
                        {selectedDegree.isRevoked ? "Revoked" : "Valid"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Links */}
              <Card>
                <CardHeader>
                  <CardTitle>Verification & Sharing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Verification URL</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={getVerificationUrl(selectedDegree.tokenId)}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(getVerificationUrl(selectedDegree.tokenId), "verify-url")}
                      >
                        {copiedField === "verify-url" ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">QR Code</p>
                    <div className="flex items-center gap-4">
                      <img
                        src={getQrCodeUrl(selectedDegree.tokenId)}
                        alt="QR Code"
                        className="w-32 h-32 border rounded"
                      />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Scan this QR code to verify the degree instantly. Share it with employers or institutions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDownloadCertificate(selectedDegree)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      asChild
                    >
                      <Link href={getVerificationUrl(selectedDegree.tokenId)} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View on Verification Portal
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function GraduateDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <DashboardHeader title="Graduate Dashboard" />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    }>
      <GraduateDashboardContent />
    </Suspense>
  )
}
