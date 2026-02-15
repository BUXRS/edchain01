"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
// Removed useContract - using API instead
import { PROTOCOL_ADDRESS, CHAIN_ID } from "@/lib/contracts/abi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Building2,
  Calendar,
  Award,
  ExternalLink,
  Share2,
  Copy,
  Check,
  QrCode,
} from "lucide-react"
import dynamic from "next/dynamic"

const QRCode = dynamic(() => import("react-qr-code").then((m) => m.default), { ssr: false })
import { toast } from "sonner"

const DEGREE_LEVELS = ["Bachelor of Science", "Master of Science", "Doctor of Philosophy", "Degree"]

function VerifyContent() {
  const searchParams = useSearchParams()
  const initialTokenId = searchParams.get("id") || ""

  const [tokenId, setTokenId] = useState(initialTokenId)
  const [isSearching, setIsSearching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searchResult, setSearchResult] = useState<{
    degree: any | null
    university: any | null
    isValid: boolean
    tokenURI: string | null
  } | null>(null)
  const [error, setError] = useState("")

  const isMainnet = CHAIN_ID === 8453
  const basescanUrl = isMainnet ? "https://basescan.org" : "https://sepolia.basescan.org"
  const openseaUrl = isMainnet ? "https://opensea.io/assets/base" : "https://testnets.opensea.io/assets/base-sepolia"
  const networkName = isMainnet ? "Base (Chain ID: 8453)" : "Base Sepolia (Chain ID: 84532)"

  useEffect(() => {
    if (initialTokenId && initialTokenId.trim()) {
      handleSearchById(initialTokenId.trim())
    }
  }, [initialTokenId])

  const handleSearchById = async (id: string) => {
    if (!id) return

    setIsSearching(true)
    setError("")
    setSearchResult(null)

    try {
      const parsedId = Number.parseInt(id)
      if (Number.isNaN(parsedId) || parsedId < 1) {
        setError("Please enter a valid degree token ID")
        return
      }

      // ✅ ARCHITECTURE COMPLIANCE: Use backend verify endpoint (backend reads chain, UI calls API)
      const res = await fetch(`/api/verify/degree/${parsedId}`)
      const data = await res.json().catch(() => null)

      if (!data || typeof data !== "object") {
        setError("Invalid response from verification service. Please try again.")
        return
      }
      if (data.error) {
        setError(data.error)
        return
      }
      if (!res.ok) {
        setError(data.error || "Verification request failed. Please try again.")
        return
      }
      if (!data.blockchain?.exists) {
        const reason = data.blockchain?.error
          ? `Blockchain error: ${data.blockchain.error}`
          : "No degree found with this token ID"
        setError(reason)
        return
      }

      // Get university info from DB or blockchain data
      let university = null
      if (data.database?.exists && data.database?.data?.university_id) {
        try {
          const uniRes = await fetch(`/api/universities`)
          const uniData = await uniRes.json().catch(() => ({}))
          university = uniData?.universities?.find((u: any) =>
            u.id === data.database?.data?.university_id ||
            u.blockchain_id === Number(data.blockchain?.data?.universityId)
          ) ?? null
        } catch {
          // Keep university null; use fallback below
        }
      }

      if (!university && data.blockchain?.data) {
        const uniId = data.blockchain.data.universityId
        university = {
          id: typeof uniId === "bigint" ? Number(uniId) : Number(uniId),
          nameEn: `University ${typeof uniId === "bigint" ? Number(uniId) : Number(uniId)}`,
          nameAr: "",
        }
      }

      setSearchResult({
        degree: data.blockchain?.data || data.database?.data || null,
        university,
        isValid: Boolean(data.verified),
        tokenURI: null, // TokenURI not needed for verification
      })
    } catch (err: unknown) {
      console.error("Search error:", err)
      setError("Failed to fetch degree information. Please check the token ID and try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    handleSearchById(tokenId)
  }

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatGPA = (gpa: number) => {
    return (gpa / 100).toFixed(2)
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/verify?id=${tokenId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Verification link copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/verify?id=${tokenId}`
    if (navigator.share) {
      await navigator.share({
        title: "Degree Verification",
        text: `Verify degree certificate #${tokenId} on EdChain`,
        url,
      })
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/edchain-logo.png" alt="EdChain" width={90} height={32} className="object-contain" />
            <span className="text-lg font-semibold">EdChain</span>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Shield className="w-3 h-3" />
              Public Verification
            </Badge>
          </div>
        </div>
      </header>

      <div className="container py-12 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
            <Search className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground text-balance">Verify a Degree Certificate</h1>
          <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto text-pretty">
            Enter a degree token ID to instantly verify its authenticity on the Base L2 blockchain
          </p>
        </div>

        <Card className="mb-8 border-2">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="tokenId" className="sr-only">
                  Degree Token ID
                </Label>
                <Input
                  id="tokenId"
                  type="text"
                  placeholder="Enter degree token ID (e.g., 1, 2, 3...)"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="h-14 text-lg"
                />
              </div>
              <Button type="submit" disabled={isSearching || !tokenId} size="lg" className="h-14 px-8 gap-2">
                {isSearching ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Verify Degree
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-8">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {searchResult && (
          <div className="space-y-6">
            {/* Certificate NFT Image */}
            <Card className="overflow-hidden border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5 text-primary" />
                  Certificate NFT
                </CardTitle>
                <CardDescription>
                  On-chain degree certificate image for token #{tokenId}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-full max-w-md aspect-[3/2] rounded-xl overflow-hidden bg-muted/50 border border-border">
                  <Image
                    src={`/api/verify/degree/${tokenId}/image`}
                    alt={`Degree certificate #${tokenId}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 28rem"
                    unoptimized
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = "none"
                      const fallback = target.nextElementSibling as HTMLElement
                      if (fallback) fallback.classList.remove("hidden")
                    }}
                  />
                  <div className="hidden absolute inset-0 flex items-center justify-center p-6 text-center">
                    <div>
                      <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">Certificate image not available</p>
                      <p className="text-xs text-muted-foreground mt-1">NFT metadata may not include an image yet</p>
                    </div>
                  </div>
                </div>
                <div className="border-t mt-4 pt-4 w-full">
                  <p className="text-sm font-medium text-foreground flex items-center justify-center gap-2 mb-3">
                    <QrCode className="h-4 w-4" />
                    Scan to open on BaseScan or OpenSea
                  </p>
                  <div className="flex flex-wrap gap-6 justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-white rounded-lg inline-block">
                        <QRCode
                          value={`${basescanUrl}/nft/${PROTOCOL_ADDRESS}/${tokenId}`}
                          size={128}
                          level="M"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">BaseScan</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-white rounded-lg inline-block">
                        <QRCode
                          value={`${openseaUrl}/${PROTOCOL_ADDRESS}/${tokenId}`}
                          size={128}
                          level="M"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">OpenSea</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={
                searchResult.isValid
                  ? "border-2 border-green-500/50 bg-green-500/5"
                  : "border-2 border-destructive/50 bg-destructive/5"
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    {searchResult.isValid ? (
                      <>
                        <div className="p-4 rounded-full bg-green-500/10">
                          <CheckCircle2 className="h-10 w-10 text-green-500" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">Verified Authentic</h2>
                          <p className="text-muted-foreground">
                            This degree has been verified on the blockchain and is valid.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 rounded-full bg-destructive/10">
                          <XCircle className="h-10 w-10 text-destructive" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-destructive">Degree Revoked</h2>
                          <p className="text-muted-foreground">This degree has been revoked and is no longer valid.</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2 bg-transparent">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 bg-transparent">
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Degree Details</TabsTrigger>
                <TabsTrigger value="institution">Institution</TabsTrigger>
                <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Degree Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <Label className="text-muted-foreground text-sm">Recipient (English)</Label>
                        <p className="text-xl font-semibold mt-1 text-foreground">{searchResult.degree?.nameEn}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <Label className="text-muted-foreground text-sm">Recipient (Arabic)</Label>
                        <p className="text-xl font-semibold mt-1 text-foreground" dir="rtl">
                          {searchResult.degree?.nameAr}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Label className="text-muted-foreground text-sm">Degree Level</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Award className="h-6 w-6 text-primary" />
                        <span className="text-xl font-semibold text-foreground">
                          {searchResult.degree?.degreeNameEn ||
                            (typeof searchResult.degree?.level === "number" && searchResult.degree.level < DEGREE_LEVELS.length
                              ? DEGREE_LEVELS[searchResult.degree.level]
                              : DEGREE_LEVELS[0])}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <Label className="text-muted-foreground text-sm">Faculty</Label>
                        <p className="font-semibold mt-1 text-foreground">{searchResult.degree?.facultyEn}</p>
                        <p className="text-sm text-muted-foreground" dir="rtl">
                          {searchResult.degree?.facultyAr}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <Label className="text-muted-foreground text-sm">Major</Label>
                        <p className="font-semibold mt-1 text-foreground">{searchResult.degree?.majorEn}</p>
                        <p className="text-sm text-muted-foreground" dir="rtl">
                          {searchResult.degree?.majorAr}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <Label className="text-muted-foreground text-sm">GPA</Label>
                        <p className="text-4xl font-bold text-foreground mt-1">
                          {formatGPA(searchResult.degree?.gpa || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">out of 5.00</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <Label className="text-muted-foreground text-sm">Graduation Year</Label>
                        <p className="text-4xl font-bold text-foreground mt-1">{searchResult.degree?.year}</p>
                        <p className="text-sm text-muted-foreground">academic year</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <Label className="text-muted-foreground text-sm">Issued On</Label>
                          <p className="font-medium text-foreground">
                            {formatDate(searchResult.degree?.issuedAt || 0)}
                          </p>
                        </div>
                      </div>
                      {searchResult.degree?.isRevoked && (
                        <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                          <Calendar className="h-5 w-5 text-destructive" />
                          <div>
                            <Label className="text-muted-foreground text-sm">Revoked On</Label>
                            <p className="font-medium text-destructive">
                              {formatDate(searchResult.degree?.revokedAt || 0)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="institution" className="mt-6">
                {searchResult.university && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Issuing Institution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-2xl font-bold text-foreground">{searchResult.university?.nameEn || searchResult.university?.name || "Unknown University"}</p>
                          {searchResult.university?.nameAr && (
                            <p className="text-lg text-muted-foreground" dir="rtl">
                              {searchResult.university.nameAr}
                            </p>
                          )}
                        </div>
                        {searchResult.university?.isActive !== undefined && (
                          <Badge
                            variant={searchResult.university.isActive ? "default" : "destructive"}
                            className="text-sm px-3 py-1"
                          >
                            {searchResult.university.isActive ? "Active Institution" : "Inactive Institution"}
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <Label className="text-muted-foreground text-sm">University ID</Label>
                          <p className="font-mono text-foreground mt-1">#{searchResult.degree?.universityId}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <Label className="text-muted-foreground text-sm">Status</Label>
                          <p className="font-medium mt-1 text-foreground">
                            {searchResult.university?.isActive ? "Authorized to issue degrees" : "No longer authorized"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="blockchain" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Blockchain Verification
                    </CardTitle>
                    <CardDescription>
                      This certificate is permanently recorded on the Base L2 blockchain
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-muted-foreground text-sm">Token ID (NFT)</Label>
                      <p className="font-mono text-xl font-bold text-foreground mt-1">#{tokenId}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-muted-foreground text-sm">Smart Contract Address</Label>
                      <p className="font-mono text-sm break-all text-foreground mt-1">{PROTOCOL_ADDRESS}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-muted-foreground text-sm">Network</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <p className="font-medium text-foreground">{networkName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button variant="outline" className="flex-1 gap-2 bg-transparent" asChild>
                        <a
                          href={`${basescanUrl}/nft/${PROTOCOL_ADDRESS}/${tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on BaseScan
                        </a>
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2 bg-transparent" asChild>
                        <a
                          href={`${openseaUrl}/${PROTOCOL_ADDRESS}/${tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on OpenSea
                        </a>
                      </Button>
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                        <QrCode className="h-4 w-4" />
                        Scan to open
                      </p>
                      <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-white rounded-lg inline-block">
                            <QRCode
                              value={`${basescanUrl}/nft/${PROTOCOL_ADDRESS}/${tokenId}`}
                              size={128}
                              level="M"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">BaseScan</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-white rounded-lg inline-block">
                            <QRCode
                              value={`${openseaUrl}/${PROTOCOL_ADDRESS}/${tokenId}`}
                              size={128}
                              level="M"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">OpenSea</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!searchResult && !error && (
          <Card className="mt-12">
            <CardHeader>
              <CardTitle>How Verification Works</CardTitle>
              <CardDescription>Understanding the blockchain verification process</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Enter Token ID</h3>
                <p className="text-sm text-muted-foreground">
                  Input the unique token ID provided with the degree certificate
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Blockchain Query</h3>
                <p className="text-sm text-muted-foreground">
                  We query the Base L2 blockchain directly for the degree data
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Instant Results</h3>
                <p className="text-sm text-muted-foreground">
                  View the verified degree details and authenticity status
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  )
}
