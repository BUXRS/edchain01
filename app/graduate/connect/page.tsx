"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useWeb3 } from "@/components/providers/web3-provider"
import { fetchDegreesOwnedByWallet } from "@/lib/blockchain"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  GraduationCap,
  ArrowLeft,
  Wallet,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"

export default function GraduateConnectPage() {
  const { address, isConnected, isConnecting, isCorrectChain, connect, switchChain } = useWeb3()
  const router = useRouter()

  const [isCheckingDegrees, setIsCheckingDegrees] = useState(false)
  const [hasDegrees, setHasDegrees] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (isConnected && isCorrectChain && address && !hasChecked) {
      checkDegrees()
    }
  }, [isConnected, isCorrectChain, address, hasChecked])

  const checkDegrees = async () => {
    if (!address) return
    setIsCheckingDegrees(true)
    try {
      const degrees = await fetchDegreesOwnedByWallet(address)
      setHasDegrees(degrees.length > 0)
      setHasChecked(true)
      
      // If degrees found, redirect to dashboard
      if (degrees.length > 0) {
        // Store session in localStorage
        localStorage.setItem("graduate_session", JSON.stringify({
          walletAddress: address.toLowerCase(),
          degreesCount: degrees.length,
          loginMethod: "wallet",
          loginAt: new Date().toISOString(),
        }))
        router.push("/graduate/dashboard")
      }
    } catch (error) {
      console.error("Error checking degrees:", error)
      setHasChecked(true)
    } finally {
      setIsCheckingDegrees(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <Link
          href="/graduate/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <GraduationCap className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect the wallet that holds your degree NFT to access your credentials
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!isConnected && (
              <Button onClick={connect} disabled={isConnecting} className="w-full" size="lg">
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </>
                )}
              </Button>
            )}

            {isConnected && !isCorrectChain && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Wrong Network</AlertTitle>
                <AlertDescription className="mt-2">
                  Please switch to Base Mainnet to continue.
                  <Button onClick={switchChain} variant="outline" className="w-full mt-3 bg-transparent">
                    Switch Network
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {isConnected && isCorrectChain && (
              <>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                  <p className="font-mono text-sm truncate">{address}</p>
                </div>

                {isCheckingDegrees && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-muted-foreground">Checking for degrees...</span>
                  </div>
                )}

                {hasChecked && !hasDegrees && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Degrees Found</AlertTitle>
                    <AlertDescription>
                      No degree NFTs were found for this wallet address. Make sure you're connecting the wallet that received your degree certificate.
                    </AlertDescription>
                  </Alert>
                )}

                {hasChecked && hasDegrees && (
                  <Card className="cursor-pointer hover:border-blue-500 transition-colors border-blue-500/20 bg-blue-500/5"
                    onClick={() => router.push("/graduate/dashboard")}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <GraduationCap className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">View Your Degrees</p>
                          <p className="text-sm text-muted-foreground">Access your credentials dashboard</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </CardContent>

          <div className="px-6 pb-6 flex flex-col gap-4 text-center text-sm text-muted-foreground border-t pt-6">
            <div className="flex items-center justify-center gap-2 text-xs">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Degrees are verified on-chain from the blockchain</span>
            </div>
            <p>
              Don't have a degree yet?{" "}
              <Link href="/docs/graduate-guide" className="text-primary hover:underline">
                Learn more
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
