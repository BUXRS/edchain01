"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useWeb3 } from "@/components/providers/web3-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PROTOCOL_ADDRESS } from "@/lib/contracts/abi"
import {
  GraduationCap,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Wallet,
  FileX,
  RefreshCw,
} from "lucide-react"
import {
  findUniversitiesWhereIssuer,
  type BlockchainDegree,
} from "@/lib/blockchain"

const DEGREE_LEVELS = ["Bachelor", "Master", "PhD"]

function IssuerHistoryContent() {
  const searchParams = useSearchParams()
  const universityIdParam = searchParams.get("universityId")

  const { isConnected, isCorrectChain, address, connect, switchChain } = useWeb3()

  const [isLoading, setIsLoading] = useState(true)
  const [degrees, setDegrees] = useState<
    Array<BlockchainDegree & { tokenId?: number; recipient?: string; owner?: string }>
  >([])
  const [universityName, setUniversityName] = useState<string>("")
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected && isCorrectChain && address) {
      loadDegrees()
    } else {
      setIsLoading(false)
    }
  }, [isConnected, isCorrectChain, address, universityIdParam])

  const loadDegrees = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log(`[v0] Loading degrees issued by: ${address}`)

      let targetUniversityId: number | null = null
      let targetUniversityName = ""

      if (universityIdParam) {
        // Use specified university ID
        targetUniversityId = Number(universityIdParam)
        console.log(`[v0] Using specified university ID: ${targetUniversityId}`)
      } else {
        // ✅ OPTIMIZED: Use database API (synced by indexer/WebSocket) instead of blockchain calls
        console.log(`[v0] Finding universities where ${address} is issuer from database...`)
        try {
          const response = await fetch(`/api/issuers/universities?walletAddress=${address}`)
          const data = await response.json()
          
          if (data.success && data.universities && data.universities.length > 0) {
            targetUniversityId = Number(data.universities[0].id)
            targetUniversityName = data.universities[0].nameEn || data.universities[0].name || ""
            console.log(`[v0] Selected university: ${targetUniversityName} (ID: ${targetUniversityId}) from DB`)
          } else {
            // Fallback to blockchain if database doesn't have data yet
            console.log(`[v0] No universities in DB, checking blockchain...`)
            const universities = await findUniversitiesWhereIssuer(address!)
            if (universities.length > 0) {
              targetUniversityId = Number(universities[0].id)
              targetUniversityName = universities[0].nameEn
              console.log(`[v0] Selected university: ${targetUniversityName} (ID: ${targetUniversityId}) from blockchain`)
            }
          }
        } catch (apiError) {
          console.error("[v0] Database API failed, falling back to blockchain:", apiError)
          // Fallback to blockchain if API fails
          const universities = await findUniversitiesWhereIssuer(address!)
          if (universities.length > 0) {
            targetUniversityId = Number(universities[0].id)
            targetUniversityName = universities[0].nameEn
            console.log(`[v0] Selected university: ${targetUniversityName} (ID: ${targetUniversityId}) from blockchain fallback`)
          }
        }
      }

      setUniversityId(targetUniversityId)
      setUniversityName(targetUniversityName)

      // ✅ OPTIMIZED: Fetch degrees from database API using issuedBy filter
      // This is much faster than fetching all degrees from blockchain
      console.log(`[v0] Fetching degrees issued by ${address} from database...`)
      const response = await fetch(`/api/degrees?issuedBy=${address}`)
      const data = await response.json()
      
      if (data.degrees && Array.isArray(data.degrees)) {
        // Map database format to component format
        const mappedDegrees = data.degrees.map((d: any) => ({
          tokenId: Number(d.token_id),
          universityId: Number(d.university_id),
          nameEn: d.student_name || "",
          nameAr: d.student_name_ar || "",
          majorEn: d.major || "",
          majorAr: d.major_ar || "",
          facultyEn: d.faculty || "",
          facultyAr: d.faculty_ar || "",
          year: d.graduation_date ? new Date(d.graduation_date).getFullYear() : 0,
          gpa: d.cgpa ? Number(d.cgpa) : 0,
          level: d.degree_level || 0,
          isRevoked: d.is_revoked || false,
          issuedAt: d.created_at ? Math.floor(new Date(d.created_at).getTime() / 1000) : 0,
          revokedAt: d.revoked_at ? Math.floor(new Date(d.revoked_at).getTime() / 1000) : 0,
          recipient: d.student_address || "",
          owner: d.student_address || "",
        }))
        console.log(`[v0] Mapped ${mappedDegrees.length} degrees from database`)
        setDegrees(mappedDegrees)
      } else {
        console.log(`[v0] No degrees found in database, setting empty array`)
        setDegrees([])
      }
    } catch (err: any) {
      console.error("[v0] Error loading degrees:", err)
      setError(err?.message || "Failed to load degrees")
      setDegrees([])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Issued Degrees" />
        <div className="p-6">
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Connect your wallet to view issued degrees.</span>
              <Button onClick={connect} size="sm" className="ml-4">
                Connect Wallet
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (isConnected && !isCorrectChain) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Issued Degrees" />
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Please switch to Base Mainnet.</span>
              <Button onClick={switchChain} variant="outline" size="sm" className="ml-4 bg-transparent">
                Switch Network
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Issued Degrees" />

      <div className="p-6 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                My Issued Degrees
              </CardTitle>
              <CardDescription>
                {universityName
                  ? `Degrees issued by ${universityName} (ID: ${universityId}) - fetched from Base Mainnet`
                  : "Degrees fetched from Base Mainnet"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadDegrees} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading degrees from blockchain...</p>
                <p className="text-xs text-muted-foreground mt-2">This may take a moment as we scan the blockchain</p>
              </div>
            ) : degrees.length === 0 ? (
              <div className="text-center py-12">
                <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No degrees found on the blockchain.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Degrees you issue will appear here after the transaction is confirmed.
                </p>
                <Button variant="outline" size="sm" onClick={loadDegrees} className="mt-4 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Found {degrees.length} degree(s) on the blockchain</p>
                {degrees.map((degree, index) => (
                  <div
                    key={degree.tokenId || index}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${degree.isRevoked ? "bg-destructive/10" : "bg-success/10"}`}>
                        <CheckCircle2 className={`h-5 w-5 ${degree.isRevoked ? "text-destructive" : "text-success"}`} />
                      </div>
                      <div>
                        <p className="font-medium">{degree.nameEn || "Unknown Student"}</p>
                        <p className="text-sm text-muted-foreground">
                          {DEGREE_LEVELS[degree.level] || "Degree"} in {degree.majorEn || "Unknown Major"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Year: {degree.year} | GPA: {(degree.gpa / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {degree.isRevoked && <Badge variant="destructive">Revoked</Badge>}
                      {!degree.isRevoked && (
                        <Badge variant="outline" className="text-success border-success">
                          Valid
                        </Badge>
                      )}
                      {degree.tokenId && <Badge variant="secondary">Token #{degree.tokenId}</Badge>}
                      {degree.tokenId && (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`https://basescan.org/nft/${PROTOCOL_ADDRESS}/${degree.tokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function IssuerHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <DashboardHeader title="Issued Degrees" />
          <div className="p-6 flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      }
    >
      <IssuerHistoryContent />
    </Suspense>
  )
}
