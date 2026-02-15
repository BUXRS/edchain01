"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useWeb3 } from "@/components/providers/web3-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  GraduationCap,
  Share2,
  QrCode,
  Copy,
  Check,
  Link as LinkIcon,
  Mail,
  MessageSquare,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { fetchDegreeFromBlockchain, fetchDegreeOwner } from "@/lib/blockchain"
import { PROTOCOL_ADDRESS } from "@/lib/contracts/abi"

const DEGREE_LEVELS = ["Bachelor", "Master", "PhD"]

function ShareCredentialsContent() {
  const searchParams = useSearchParams()
  const tokenIdParam = searchParams.get("tokenId")
  const { address, isConnected } = useWeb3()

  const [tokenId, setTokenId] = useState(tokenIdParam || "")
  const [degree, setDegree] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (tokenIdParam) {
      loadDegree(Number(tokenIdParam))
    }
  }, [tokenIdParam])

  const loadDegree = async (id: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const degreeData = await fetchDegreeFromBlockchain(id)
      if (!degreeData) {
        setError("Degree not found")
        return
      }

      const owner = await fetchDegreeOwner(id)
      if (owner && address && owner.toLowerCase() !== address.toLowerCase()) {
        setError("This degree does not belong to your wallet")
        return
      }

      setDegree({ ...degreeData, tokenId: id, owner })
    } catch (err: any) {
      setError(err?.message || "Failed to load degree")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    const id = Number.parseInt(tokenId)
    if (Number.isNaN(id) || id < 1) {
      setError("Please enter a valid token ID")
      return
    }
    loadDegree(id)
  }

  const getVerificationUrl = (id: number) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/verify?id=${id}`
    }
    return `/verify?id=${id}`
  }

  const getQrCodeUrl = (id: number) => {
    const verificationUrl = getVerificationUrl(id)
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(verificationUrl)}`
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Degree Verification - Token #${degree.tokenId}`)
    const body = encodeURIComponent(
      `Please verify my degree certificate:\n\n${getVerificationUrl(degree.tokenId)}\n\nToken ID: ${degree.tokenId}`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Please verify my degree certificate: ${getVerificationUrl(degree.tokenId)}`
    )
    window.open(`https://wa.me/?text=${text}`, "_blank")
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Share Credentials" />

      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Search */}
        {!degree && (
          <Card>
            <CardHeader>
              <CardTitle>Select Degree to Share</CardTitle>
              <CardDescription>Enter the token ID of the degree you want to share</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Token ID (e.g., 1234)"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Share Options */}
        {degree && (
          <>
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>{degree.nameEn || "Degree Certificate"}</CardTitle>
                    <CardDescription>
                      {DEGREE_LEVELS[degree.level] || "Degree"} • Token #{degree.tokenId}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Verification URL */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Link</CardTitle>
                <CardDescription>Share this link with employers or institutions to verify your degree</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={getVerificationUrl(degree.tokenId)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(getVerificationUrl(degree.tokenId), "url")}
                  >
                    {copiedField === "url" ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={shareViaEmail} className="flex-1">
                    <Mail className="mr-2 h-4 w-4" />
                    Share via Email
                  </Button>
                  <Button variant="outline" onClick={shareViaWhatsApp} className="flex-1">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Share via WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>Scan this QR code to instantly verify the degree</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={getQrCodeUrl(degree.tokenId)}
                    alt="QR Code"
                    className="w-64 h-64 border-2 border-border rounded-lg p-4 bg-white"
                  />
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Scan this QR code with any QR code reader to verify the degree instantly
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement("a")
                        link.href = getQrCodeUrl(degree.tokenId)
                        link.download = `degree-qr-${degree.tokenId}.png`
                        link.click()
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download QR Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" asChild>
                    <a href={getVerificationUrl(degree.tokenId)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on Verification Portal
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href={`https://basescan.org/nft/${PROTOCOL_ADDRESS}/${degree.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on BaseScan
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default function ShareCredentialsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <DashboardHeader title="Share Credentials" />
        <div className="p-6 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    }>
      <ShareCredentialsContent />
    </Suspense>
  )
}
