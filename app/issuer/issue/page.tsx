"use client"

import type React from "react"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useContract, type University } from "@/hooks/use-contract"
import { PROTOCOL_ADDRESS, CHAIN_ID } from "@/lib/contracts/abi"
import { findUniversitiesWhereIssuer, checkIsIssuerOnChain } from "@/lib/blockchain"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { toast } from "sonner"
import { FileCheck, Loader2, AlertTriangle, CheckCircle2, GraduationCap, ExternalLink } from "lucide-react"

const DEGREE_LEVELS = [
  { value: "0", label: "Bachelor of Science" },
  { value: "1", label: "Master of Science" },
  { value: "2", label: "Doctor of Philosophy" },
]

interface IssuerUniversity {
  id: number
  name: string
  nameAr?: string
  isActive: boolean
}

function IssueDegreeContent() {
  const searchParams = useSearchParams()
  const urlUniversityId = searchParams.get("universityId")

  const { isConnected, isCorrectChain, address } = useWeb3()
  const { getUniversity, issueDegree, isLoading: contractLoading } = useContract()

  const [issuerUniversities, setIssuerUniversities] = useState<IssuerUniversity[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
  const [university, setUniversity] = useState<University | null>(null)
  const [dbUniversity, setDbUniversity] = useState<{ id: number } | null>(null)
  const [isIssuer, setIsIssuer] = useState(false)
  const [issuedTokenId, setIssuedTokenId] = useState<bigint | null>(null)
  const [submittedRequestId, setSubmittedRequestId] = useState<number | null>(null)
  const [isLoadingRole, setIsLoadingRole] = useState(true)

  const [formData, setFormData] = useState({
    recipientAddress: "",
    nameEn: "",
    nameAr: "",
    facultyEn: "",
    facultyAr: "",
    majorEn: "",
    majorAr: "",
    degreeNameEn: "",
    degreeNameAr: "",
    gpa: "",
    year: new Date().getFullYear().toString(),
    level: "0", // Deprecated - kept for backward compatibility
  })

  useEffect(() => {
    const detectIssuerRole = async () => {
      if (!address || !isConnected || !isCorrectChain) {
        setIsLoadingRole(false)
        return
      }

      setIsLoadingRole(true)
      try {
        console.log("[v0] Issue page: Detecting issuer role for", address)
        
        // ✅ FORCED APPROACH: Check blockchain FIRST (source of truth), then sync to DB
        console.log("[v0] Issue page: Checking blockchain directly (forced check)...")
        const blockchainUniversities = await findUniversitiesWhereIssuer(address)
        console.log("[v0] Issue page: Blockchain check found", blockchainUniversities.length, "universities")
        
        if (blockchainUniversities.length > 0) {
          // ✅ FORCE SYNC: Wallet IS issuer on blockchain - force sync to database immediately
          console.log("[v0] Issue page: ✅ Wallet IS issuer on blockchain! Force syncing to database...")
          try {
            const syncResponse = await fetch("/api/issuers/force-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ walletAddress: address }),
            })
            const syncData = await syncResponse.json()
            console.log("[v0] Issue page: Force sync completed:", syncData)
          } catch (syncError) {
            console.error("[v0] Issue page: Force sync error (non-critical):", syncError)
            // Continue even if sync fails - we have blockchain data
          }
          
          // Use blockchain data immediately
          const mappedUniversities: IssuerUniversity[] = blockchainUniversities.map((u) => ({
            id: typeof u.id === "bigint" ? Number(u.id) : u.id,
            name: u.nameEn ?? "",
            nameAr: u.nameAr ?? "",
            isActive: u.isActive ?? false,
          }))
          setIssuerUniversities(mappedUniversities)

          if (urlUniversityId) {
            const id = Number.parseInt(urlUniversityId)
            const found = mappedUniversities.find((u) => u.id === id)
            if (found) {
              setSelectedUniversityId(id)
              setIsIssuer(true)
              console.log("[v0] Issue page: ✅ Selected university from URL:", id)
            } else {
              // Use first available if URL ID not found
              setSelectedUniversityId(mappedUniversities[0].id)
              setIsIssuer(true)
            }
          } else if (mappedUniversities.length > 0) {
            setSelectedUniversityId(mappedUniversities[0].id)
            setIsIssuer(true)
            console.log("[v0] Issue page: ✅ Auto-selected university", mappedUniversities[0].id, mappedUniversities[0].name)
          }
        } else {
          // Not found on blockchain - check database as fallback
          console.log("[v0] Issue page: Not found on blockchain, checking database...")
          try {
            const response = await fetch(`/api/issuers/universities?walletAddress=${address}`)
            const data = await response.json()
            
            if (data.success && data.universities && data.universities.length > 0) {
              console.log("[v0] Issue page: Found", data.universities.length, "universities from database")
              
              const mappedUniversities: IssuerUniversity[] = data.universities.map((u: any) => ({
                id: Number(u.id),
                name: u.nameEn || u.name || "",
                nameAr: u.nameAr || "",
                isActive: u.isActive !== false,
              }))
              setIssuerUniversities(mappedUniversities)

              if (urlUniversityId) {
                const id = Number.parseInt(urlUniversityId)
                const found = mappedUniversities.find((u) => u.id === id)
                if (found) {
                  setSelectedUniversityId(id)
                  setIsIssuer(true)
                }
              } else if (mappedUniversities.length > 0) {
                setSelectedUniversityId(mappedUniversities[0].id)
                setIsIssuer(true)
              }
            }
          } catch (apiError) {
            console.error("[v0] Issue page: Database check also failed:", apiError)
          }
        }
      } catch (error) {
        console.error("[v0] Issue page: Error detecting issuer role:", error)
      } finally {
        setIsLoadingRole(false)
      }
    }

    detectIssuerRole()
  }, [address, isConnected, isCorrectChain, urlUniversityId])

  useEffect(() => {
    const loadUniversityDetails = async () => {
      if (!selectedUniversityId || !address) return

      try {
        const uni = await getUniversity(selectedUniversityId)
        setUniversity(uni)

        // ✅ Don't override issuer status - it's already set from blockchain check
        // Only verify if we have a selected university (means we already confirmed issuer status)
        if (selectedUniversityId && issuerUniversities.length > 0) {
          // Use app RPC (checkIsIssuerOnChain) so we match findUniversitiesWhereIssuer - never overwrite
          // isIssuer to false when we already have issuerUniversities (avoids wallet-provider false negatives)
          const issuerStatus = await checkIsIssuerOnChain(selectedUniversityId, address)
          console.log("[v0] Issue page: Verification check for university", selectedUniversityId, ":", issuerStatus)
          if (issuerStatus) {
            setIsIssuer(true)
          }
          // Never set isIssuer to false here - findUniversitiesWhereIssuer already confirmed issuer;
          // a false from wallet RPC or transient error would wrongly lock out the user.
        }
      } catch (error) {
        console.error("[v0] Issue page: Error loading university details:", error)
        // Don't override issuer status on error - keep what we have from blockchain check
      }
    }

    loadUniversityDetails()
  }, [selectedUniversityId, address, getUniversity, issuerUniversities])

  useEffect(() => {
    if (address) {
      fetch(`/api/universities/wallet/${address}`)
        .then((res) => {
          if (res.ok) {
            return res.json()
          }
          // 404 is expected when wallet is not a university wallet - don't log error
          return null
        })
        .then((data) => {
          if (data?.university) {
            setDbUniversity(data.university)
          }
        })
        .catch((err) => {
          // Only log unexpected errors
          console.error("[v0] Issue page: Unexpected error fetching university by wallet:", err)
        })
    }
  }, [address])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUniversityId) return

    const gpaNum = Number.parseFloat(formData.gpa)
    if (Number.isNaN(gpaNum) || gpaNum < 0 || gpaNum > 5) {
      toast.error("GPA must be between 0 and 5")
      return
    }

    const gpaInt = Math.round(gpaNum * 100)

    // Map level to degree names if degreeName fields are empty (backward compatibility)
    // The contract requires non-empty degreeNameAr and degreeNameEn
    const levelIndex = Number.parseInt(formData.level)
    const levelMap: Record<number, { en: string; ar: string }> = {
      0: { en: "Bachelor of Science", ar: "بكالوريوس علوم" },
      1: { en: "Master of Science", ar: "ماجستير علوم" },
      2: { en: "Doctor of Philosophy", ar: "دكتوراه فلسفة" },
    }
    
    let degreeNameEn = formData.degreeNameEn || levelMap[levelIndex]?.en || DEGREE_LEVELS[levelIndex]?.label || "Bachelor's Degree"
    let degreeNameAr = formData.degreeNameAr || levelMap[levelIndex]?.ar || "درجة البكالوريوس"

    // Validate required fields
    if (!degreeNameEn.trim() || !degreeNameAr.trim()) {
      toast.error("Degree name (Arabic and English) is required")
      return
    }

    try {
      console.log("[v0] Issue page: Submitting degree request for university", selectedUniversityId)
      const result = await issueDegree(
        selectedUniversityId,
        formData.recipientAddress,
        formData.nameAr,
        formData.nameEn,
        formData.facultyAr,
        formData.facultyEn,
        formData.majorAr,
        formData.majorEn,
        degreeNameAr,
        degreeNameEn,
        gpaInt,
        Number.parseInt(formData.year),
        levelIndex, // Still passed for backward compatibility but not used by contract
      )
      console.log("[v0] Issue page: issueDegree result:", result)

      if (result !== null) {
        const isRequest = typeof result === "object" && "requestId" in result
        if (isRequest && typeof (result as { requestId?: unknown }).requestId === "number") {
          const requestId = (result as { requestId: number }).requestId
          console.log("[v0] Issue page: Request submitted with ID:", requestId)
          setSubmittedRequestId(requestId)
          setIssuedTokenId(null)
          toast.success("Degree request submitted. Verifiers must approve before the degree is issued.")
          setFormData({
            recipientAddress: "",
            nameEn: "",
            nameAr: "",
            facultyEn: "",
            facultyAr: "",
            majorEn: "",
            majorAr: "",
            degreeNameEn: "",
            degreeNameAr: "",
            gpa: "",
            year: new Date().getFullYear().toString(),
            level: "0",
          })
        } else if (typeof result === "bigint" || typeof result === "number") {
          const tokenId = typeof result === "number" ? BigInt(result) : result
          setIssuedTokenId(tokenId)
          setSubmittedRequestId(null)
          toast.success(`Degree issued successfully! Token ID: ${tokenId}`)
          if (dbUniversity) {
            try {
              await fetch("/api/degrees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tokenId: Number(tokenId),
                  universityId: dbUniversity.id,
                  studentAddress: formData.recipientAddress,
                  studentName: formData.nameEn,
                  studentNameAr: formData.nameAr,
                  degreeType: DEGREE_LEVELS[Number.parseInt(formData.level)].label,
                  major: formData.majorEn,
                  majorAr: formData.majorAr,
                  graduationDate: `${formData.year}-06-01`,
                  cgpa: gpaNum,
                  issuedBy: address,
                }),
              })
            } catch (dbError) {
              console.error("Failed to save degree to database:", dbError)
            }
          }
          setFormData({
            recipientAddress: "",
            nameEn: "",
            nameAr: "",
            facultyEn: "",
            facultyAr: "",
            majorEn: "",
            majorAr: "",
            degreeNameEn: "",
            degreeNameAr: "",
            gpa: "",
            year: new Date().getFullYear().toString(),
            level: "0",
          })
        } else {
          console.error("[v0] Issue page: Unexpected result format:", result)
          toast.error("Failed to request degree - unexpected response format")
        }
      } else {
        console.error("[v0] Issue page: issueDegree returned null")
        toast.error("Failed to request degree - transaction may have failed")
      }
    } catch (error: unknown) {
      const err = error as { code?: number | string; message?: string; reason?: string; info?: { reason?: string } }
      const isUserRejection =
        err?.code === 4001 ||
        err?.code === "ACTION_REJECTED" ||
        String(err?.reason).toLowerCase() === "rejected" ||
        err?.info?.reason === "rejected" ||
        /denied|rejected|cancelled|canceled/i.test(err?.message ?? "")
      if (isUserRejection) {
        toast.info("Transaction cancelled. You rejected the signature in your wallet.")
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to request degree"
        toast.error(errorMessage)
      }
    }
  }

  const selectedUniversityName =
    issuerUniversities.find((u) => u.id === selectedUniversityId)?.name || university?.nameEn || "your university"

  const canIssue = isConnected && isCorrectChain && isIssuer && selectedUniversityId && university?.isActive !== false

  const isMainnet = CHAIN_ID === 8453
  const basescanUrl = isMainnet ? "https://basescan.org" : "https://sepolia.basescan.org"

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Issue Degree" />

      <div className="p-6 space-y-6 max-w-4xl">
        {isLoadingRole && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Verifying your issuer permissions on the blockchain...</AlertDescription>
          </Alert>
        )}

        {!isLoadingRole && isIssuer && issuerUniversities.length > 0 && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Issuer Access Verified</AlertTitle>
            <AlertDescription>
              You are authorized to issue degrees for {issuerUniversities.length} universit
              {issuerUniversities.length > 1 ? "ies" : "y"}.
            </AlertDescription>
          </Alert>
        )}

        {!isLoadingRole && !canIssue && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {!isConnected
                ? "Connect your wallet to issue degrees."
                : !isCorrectChain
                  ? "Switch to the correct network."
                  : !isIssuer || issuerUniversities.length === 0
                    ? `Your wallet (${address?.slice(0, 6)}...${address?.slice(-4)}) is not an authorized issuer for any university on the blockchain. If you believe this is an error, the system will automatically check blockchain and sync on page load.`
                    : "University is not active."}
            </AlertDescription>
          </Alert>
        )}

        {submittedRequestId !== null && (
          <Alert className="border-success">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Degree Request Submitted</AlertTitle>
            <AlertDescription>
              <p>Request ID: {submittedRequestId}. Verifiers must approve before the degree is issued. Track status in My Requests.</p>
              <Button variant="outline" size="sm" className="mt-2 bg-transparent" asChild>
                <Link href="/issuer/requests">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  My Degree Requests
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {issuedTokenId !== null && (
          <Alert className="border-success">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Degree Issued Successfully!</AlertTitle>
            <AlertDescription>
              <p>Token ID: {issuedTokenId.toString()}</p>
              <Button variant="outline" size="sm" className="mt-2 bg-transparent" asChild>
                <a
                  href={`${basescanUrl}/nft/${PROTOCOL_ADDRESS}/${issuedTokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on BaseScan
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Issue New Degree Certificate
            </CardTitle>
            <CardDescription>
              Create a new blockchain-verified degree for {selectedUniversityName}. This will mint a soulbound NFT.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {issuerUniversities.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="university">Select University *</Label>
                  <Select
                    value={selectedUniversityId?.toString() || ""}
                    onValueChange={(value) => setSelectedUniversityId(Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select university" />
                    </SelectTrigger>
                    <SelectContent>
                      {issuerUniversities.map((uni) => (
                        <SelectItem key={uni.id} value={uni.id.toString()}>
                          {uni.name} (ID: {uni.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Recipient */}
              <div className="space-y-2">
                <Label htmlFor="recipientAddress">Recipient Wallet Address *</Label>
                <Input
                  id="recipientAddress"
                  placeholder="0x..."
                  value={formData.recipientAddress}
                  onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                  className="font-mono"
                  required
                  disabled={!canIssue}
                />
                <p className="text-xs text-muted-foreground">
                  The wallet address of the degree recipient. This cannot be changed after issuance.
                </p>
              </div>

              {/* Student Name */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nameEn">Student Name (English) *</Label>
                  <Input
                    id="nameEn"
                    placeholder="John Doe"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    required
                    disabled={!canIssue}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameAr">Student Name (Arabic) *</Label>
                  <Input
                    id="nameAr"
                    placeholder="جون دو"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    dir="rtl"
                    required
                    disabled={!canIssue}
                  />
                </div>
              </div>

              {/* Faculty */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="facultyEn">Faculty (English) *</Label>
                  <Input
                    id="facultyEn"
                    placeholder="Faculty of Engineering"
                    value={formData.facultyEn}
                    onChange={(e) => setFormData({ ...formData, facultyEn: e.target.value })}
                    required
                    disabled={!canIssue}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facultyAr">Faculty (Arabic) *</Label>
                  <Input
                    id="facultyAr"
                    placeholder="كلية الهندسة"
                    value={formData.facultyAr}
                    onChange={(e) => setFormData({ ...formData, facultyAr: e.target.value })}
                    dir="rtl"
                    required
                    disabled={!canIssue}
                  />
                </div>
              </div>

              {/* Major */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="majorEn">Major (English) *</Label>
                  <Input
                    id="majorEn"
                    placeholder="Computer Science"
                    value={formData.majorEn}
                    onChange={(e) => setFormData({ ...formData, majorEn: e.target.value })}
                    required
                    disabled={!canIssue}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="majorAr">Major (Arabic) *</Label>
                  <Input
                    id="majorAr"
                    placeholder="علوم الحاسوب"
                    value={formData.majorAr}
                    onChange={(e) => setFormData({ ...formData, majorAr: e.target.value })}
                    dir="rtl"
                    required
                    disabled={!canIssue}
                  />
                </div>
              </div>

              {/* Degree Name - New required fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="degreeNameEn">Degree Name (English) *</Label>
                  <Input
                    id="degreeNameEn"
                    placeholder="Bachelor of Science"
                    value={formData.degreeNameEn}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ ...formData, degreeNameEn: value })
                      // Auto-update level based on degree name if empty
                      if (!formData.degreeNameEn && value) {
                        const level = DEGREE_LEVELS.findIndex(l => l.label.toLowerCase().includes(value.toLowerCase()))
                        if (level >= 0) {
                          setFormData(prev => ({ ...prev, degreeNameEn: value, level: level.toString() }))
                        }
                      }
                    }}
                    required
                    disabled={!canIssue}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="degreeNameAr">Degree Name (Arabic) *</Label>
                  <Input
                    id="degreeNameAr"
                    placeholder="بكالوريوس علوم"
                    value={formData.degreeNameAr}
                    onChange={(e) => setFormData({ ...formData, degreeNameAr: e.target.value })}
                    dir="rtl"
                    required
                    disabled={!canIssue}
                  />
                </div>
              </div>

              {/* Academic Info */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="level">Degree Level (Optional - for reference)</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => {
                      const levelIndex = Number.parseInt(value)
                      const levelMap: Record<number, { en: string; ar: string }> = {
                        0: { en: "Bachelor of Science", ar: "بكالوريوس علوم" },
                        1: { en: "Master of Science", ar: "ماجستير علوم" },
                        2: { en: "Doctor of Philosophy", ar: "دكتوراه فلسفة" },
                      }
                      const mapping = levelMap[levelIndex]
                      if (mapping && (!formData.degreeNameEn || !formData.degreeNameAr)) {
                        setFormData({ ...formData, level: value, degreeNameEn: mapping.en, degreeNameAr: mapping.ar })
                      } else {
                        setFormData({ ...formData, level: value })
                      }
                    }}
                    disabled={!canIssue}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level (auto-fills degree names)" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEGREE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gpa">GPA (0.00 - 5.00) *</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    placeholder="3.75"
                    value={formData.gpa}
                    onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                    required
                    disabled={!canIssue}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Graduation Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1950"
                    max="2100"
                    placeholder="2026"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    required
                    disabled={!canIssue}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button type="submit" size="lg" disabled={!canIssue || contractLoading} className="w-full md:w-auto">
                  {contractLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Issuing Degree...
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Issue Degree Certificate
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This action will create a permanent, immutable record on the blockchain.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function IssueDegreePage() {
  return (
    <Suspense fallback={null}>
      <IssueDegreeContent />
    </Suspense>
  )
}
