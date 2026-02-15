"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useWeb3 } from "@/components/providers/web3-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Building2,
  GraduationCap,
  FileCheck,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react"
import {
  fetchUniversityFromBlockchain,
  checkIsIssuerOnChain,
  findUniversitiesWhereIssuer,
  type BlockchainUniversity,
} from "@/lib/blockchain"

function IssuerDashboardContent() {
  const searchParams = useSearchParams()
  const universityIdParam = searchParams.get("universityId")

  const { isConnected, isCorrectChain, address, connect, switchChain } = useWeb3()

  const [university, setUniversity] = useState<BlockchainUniversity | null>(null)
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [isIssuer, setIsIssuer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [issuerUniversities, setIssuerUniversities] = useState<BlockchainUniversity[]>([])
  const [checkingStatus, setCheckingStatus] = useState(false)

  useEffect(() => {
    if (isConnected && isCorrectChain && address) {
      checkIssuerStatus()
    } else {
      setIsLoading(false)
    }
  }, [universityIdParam, isConnected, isCorrectChain, address])

  const checkIssuerStatus = async () => {
    setIsLoading(true)
    setCheckingStatus(true)
    try {
      if (universityIdParam) {
        // Check specific university
        const id = Number.parseInt(universityIdParam)
        const uni = await fetchUniversityFromBlockchain(id)
        const issuerStatus = await checkIsIssuerOnChain(id, address!)
        console.log(`[v0] Checking issuer status for university ${id}, address ${address}: ${issuerStatus}`)
        setUniversity(uni)
        setUniversityId(id)
        setIsIssuer(issuerStatus)
        if (issuerStatus && uni) {
          setIssuerUniversities([uni])
        }
      } else {
        // ✅ OPTIMIZED: Use database API (synced by indexer/WebSocket) instead of blockchain calls
        console.log(`[v0] Finding universities where ${address} is issuer from database...`)
        try {
          const response = await fetch(`/api/issuers/universities?walletAddress=${address}`)
          const data = await response.json()
          
          if (data.success && data.universities && data.universities.length > 0) {
            // Map database format to blockchain format for compatibility
            const issuerUnis: BlockchainUniversity[] = data.universities.map((u: any) => ({
              id: BigInt(u.id),
              admin: u.adminWallet || u.walletAddress || "",
              nameEn: u.nameEn || u.name || "",
              nameAr: u.nameAr || "",
              exists: true,
              isActive: u.isActive,
            }))
            
            console.log(`[v0] Found ${issuerUnis.length} universities where user is issuer (from DB)`)
            setIssuerUniversities(issuerUnis)

            // Default to first university
            setUniversity(issuerUnis[0])
            setUniversityId(Number(issuerUnis[0].id))
            setIsIssuer(true)
          } else {
            console.log(`[v0] No universities found in database, checking blockchain as fallback...`)
            // Fallback to blockchain if database doesn't have data yet
            console.log(`[v0] No universities found in database, checking blockchain directly...`)
            
            // ✅ DEBUG: First check with getWalletRoles to see what we get
            try {
              const { getWalletRoles } = await import("@/lib/blockchain")
              const roles = await getWalletRoles(address!)
              console.log(`[v0] 🔍 DEBUG getWalletRoles result:`, {
                issuerForUniversities: roles.issuerForUniversities,
                adminOfUniversities: roles.adminOfUniversities,
                total: roles.issuerForUniversities.length,
              })
            } catch (debugError) {
              console.error(`[v0] DEBUG getWalletRoles error:`, debugError)
            }
            
            const issuerUnis = await findUniversitiesWhereIssuer(address!)
            console.log(`[v0] Found ${issuerUnis.length} universities from blockchain fallback`)
            console.log(`[v0] 🔍 DEBUG findUniversitiesWhereIssuer result:`, issuerUnis.map(u => ({
              id: Number(u.id),
              nameEn: u.nameEn,
              isActive: u.isActive,
            })))
            
            if (issuerUnis.length > 0) {
              // ✅ FORCE SYNC: If found on blockchain but not in DB, force sync it
              console.log(`[v0] ⚠️ Wallet is issuer on blockchain but not in database. Force syncing...`)
              try {
                const syncResponse = await fetch("/api/issuers/force-sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ walletAddress: address }),
                })
                const syncData = await syncResponse.json()
                console.log(`[v0] 🔍 DEBUG force-sync result:`, syncData)
                console.log(`[v0] Force sync result:`, syncData)
                
                if (syncData.success) {
                  // Retry database query after sync
                  const retryResponse = await fetch(`/api/issuers/universities?walletAddress=${address}`)
                  const retryData = await retryResponse.json()
                  
                  if (retryData.success && retryData.universities && retryData.universities.length > 0) {
                    const issuerUnisFromDb: BlockchainUniversity[] = retryData.universities.map((u: any) => ({
                      id: BigInt(u.id),
                      admin: u.adminWallet || u.walletAddress || "",
                      nameEn: u.nameEn || u.name || "",
                      nameAr: u.nameAr || "",
                      exists: true,
                      isActive: u.isActive,
                    }))
                    setIssuerUniversities(issuerUnisFromDb)
                    setUniversity(issuerUnisFromDb[0])
                    setUniversityId(Number(issuerUnisFromDb[0].id))
                    setIsIssuer(true)
                    console.log(`[v0] ✅ Force sync successful! Found ${issuerUnisFromDb.length} universities`)
                    return // Exit early, we're done
                  }
                }
              } catch (syncError) {
                console.error(`[v0] Force sync failed:`, syncError)
              }
              
              // If force sync failed, still use blockchain data
              setIssuerUniversities(issuerUnis)
              setUniversity(issuerUnis[0])
              setUniversityId(Number(issuerUnis[0].id))
              setIsIssuer(true)
            } else {
              setIsIssuer(false)
            }
          }
        } catch (apiError) {
          console.error("[v0] Database API failed, falling back to blockchain:", apiError)
          // Fallback to blockchain if API fails
          const issuerUnis = await findUniversitiesWhereIssuer(address!)
          setIssuerUniversities(issuerUnis)
          if (issuerUnis.length > 0) {
            setUniversity(issuerUnis[0])
            setUniversityId(Number(issuerUnis[0].id))
            setIsIssuer(true)
          } else {
            setIsIssuer(false)
          }
        }
      }
    } catch (error) {
      console.error("Error checking issuer status:", error)
    } finally {
      setIsLoading(false)
      setCheckingStatus(false)
    }
  }

  const canIssue = isConnected && isCorrectChain && isIssuer && university?.isActive

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Issuer Dashboard" />
        <div className="p-6 flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Checking your issuer status on Base Mainnet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Issuer Dashboard" />

      <div className="p-6 space-y-6">
        {/* Connection Status */}
        {!isConnected && (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertTitle>Wallet Required</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Connect your wallet to access issuer features.</span>
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

        {isConnected && isCorrectChain && !isIssuer && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Not Authorized</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                Your wallet ({address?.slice(0, 6)}...{address?.slice(-4)}) is not an authorized issuer for any
                university on Base Mainnet. Contact your university admin to grant you issuer permissions.
              </span>
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={async () => {
                    setCheckingStatus(true)
                    try {
                      // Force sync from blockchain
                      const response = await fetch("/api/issuers/force-sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ walletAddress: address }),
                      })
                      const data = await response.json()
                      console.log("[ForceSync] Result:", data)
                      
                      if (data.success) {
                        // Recheck after sync
                        await checkIssuerStatus()
                      } else {
                        alert(data.message || "Force sync failed. Check console for details.")
                      }
                    } catch (error) {
                      console.error("[ForceSync] Error:", error)
                      alert("Force sync failed. Check console for details.")
                    } finally {
                      setCheckingStatus(false)
                    }
                  }}
                  variant="default"
                  size="sm"
                  disabled={checkingStatus}
                >
                  {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Force Sync</span>
                </Button>
                <Button
                  onClick={checkIssuerStatus}
                  variant="outline"
                  size="sm"
                  className="bg-transparent"
                  disabled={checkingStatus}
                >
                  {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Recheck</span>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {canIssue && (
          <Alert className="border-success bg-success/5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Issuer Access Verified On-Chain</AlertTitle>
            <AlertDescription>
              You are authorized to issue degrees for {university?.nameEn}. Your issuer role is verified on Base
              Mainnet.
            </AlertDescription>
          </Alert>
        )}

        {/* University Selection if multiple */}
        {issuerUniversities.length > 1 && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-3">You are an issuer for multiple universities:</p>
            <div className="flex flex-wrap gap-2">
              {issuerUniversities.map((uni) => (
                <Button
                  key={String(uni.id)}
                  variant={universityId === Number(uni.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setUniversity(uni)
                    setUniversityId(Number(uni.id))
                  }}
                >
                  {uni.nameEn}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* University Info */}
        {university && (
          <Card>
            <div className="p-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{university.nameEn}</h3>
                  <p className="text-sm text-muted-foreground" dir="rtl">
                    {university.nameAr}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isIssuer ? "default" : "secondary"} className="gap-1">
                  {isIssuer ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Verified Issuer
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Not Issuer
                    </>
                  )}
                </Badge>
                <Badge variant={university.isActive ? "outline" : "destructive"}>
                  {university.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="University ID"
            value={universityId || "-"}
            icon={<Building2 className="h-5 w-5" />}
            description="On-chain identifier"
          />
          <StatsCard
            title="Blockchain Status"
            value={isIssuer ? "Verified" : "Not Verified"}
            icon={<FileCheck className="h-5 w-5" />}
            description="On Base Mainnet"
          />
          <StatsCard
            title="Network"
            value="Base"
            icon={<GraduationCap className="h-5 w-5" />}
            description="Mainnet (Chain ID: 8453)"
          />
        </div>

        {/* Quick Action */}
        <Card className={`${canIssue ? "cursor-pointer hover:border-accent" : "opacity-60"} transition-colors`}>
          <Link
            href={canIssue ? `/issuer/issue?universityId=${universityId}` : "#"}
            className={canIssue ? "" : "pointer-events-none"}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-success/10">
                    <FileCheck className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Issue New Degree</h3>
                    <p className="text-sm text-muted-foreground">Create a new blockchain-verified degree certificate</p>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  )
}

export default function IssuerDashboardPage() {
  return (
    <Suspense fallback={null}>
      <IssuerDashboardContent />
    </Suspense>
  )
}
