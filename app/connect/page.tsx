"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useContract } from "@/hooks/use-contract"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Shield,
  ArrowLeft,
  Wallet,
  Loader2,
  AlertTriangle,
  Building2,
  FileCheck,
  FileX,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

type UserRole = {
  isOwner: boolean
  universityAdmin: { id: number; name: string } | null
  issuerFor: { id: number; name: string }[]
  revokerFor: { id: number; name: string }[]
}

export default function ConnectPage() {
  const { address, isConnected, isConnecting, isCorrectChain, connect, switchChain } = useWeb3()
  const { findUserRole } = useContract()
  const router = useRouter()

  const [isCheckingRole, setIsCheckingRole] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (isConnected && isCorrectChain && address && !hasChecked) {
      checkUserRole()
    }
  }, [isConnected, isCorrectChain, address, hasChecked])

  const checkUserRole = async () => {
    if (!address) return
    setIsCheckingRole(true)
    try {
      const role = await findUserRole(address)
      setUserRole(role)
      setHasChecked(true)
    } catch (error) {
      console.error("Error checking role:", error)
    } finally {
      setIsCheckingRole(false)
    }
  }

  const navigateToDashboard = (path: string) => {
    router.push(path)
  }

  const hasAnyRole =
    userRole &&
    (userRole.isOwner || userRole.universityAdmin || userRole.issuerFor.length > 0 || userRole.revokerFor.length > 0)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-accent/10">
                <Wallet className="h-8 w-8 text-accent" />
              </div>
            </div>
            <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect your MetaMask wallet to access your role-based dashboard. Your role is determined by the smart
              contract.
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

                {isCheckingRole && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-muted-foreground">Checking your on-chain roles...</span>
                  </div>
                )}

                {hasChecked && userRole && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Your Roles</h3>

                    {!hasAnyRole && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>No Roles Found</AlertTitle>
                        <AlertDescription>
                          Your wallet address has no assigned roles in the smart contract. If you are a university,
                          please subscribe first and wait for the Super Admin to approve your wallet.
                        </AlertDescription>
                      </Alert>
                    )}

                    {userRole.isOwner && (
                      <Card
                        className="cursor-pointer hover:border-accent transition-colors"
                        onClick={() => navigateToDashboard("/admin")}
                      >
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent/10">
                              <Shield className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                              <p className="font-medium">Contract Owner</p>
                              <p className="text-sm text-muted-foreground">Full admin access</p>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    )}

                    {userRole.universityAdmin && (
                      <Card
                        className="cursor-pointer hover:border-accent transition-colors"
                        onClick={() => navigateToDashboard(`/university?id=${userRole.universityAdmin!.id}`)}
                      >
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">University Admin</p>
                              <p className="text-sm text-muted-foreground">{userRole.universityAdmin.name}</p>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    )}

                    {userRole.issuerFor.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Issuer for:</p>
                        {userRole.issuerFor.map((uni) => (
                          <Card
                            key={`issuer-${uni.id}`}
                            className="cursor-pointer hover:border-accent transition-colors"
                            onClick={() => navigateToDashboard(`/issuer?universityId=${uni.id}`)}
                          >
                            <CardContent className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-success/10">
                                  <FileCheck className="h-5 w-5 text-success" />
                                </div>
                                <div>
                                  <p className="font-medium">Issuer</p>
                                  <p className="text-sm text-muted-foreground">{uni.name}</p>
                                </div>
                              </div>
                              <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {userRole.revokerFor.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Revoker for:</p>
                        {userRole.revokerFor.map((uni) => (
                          <Card
                            key={`revoker-${uni.id}`}
                            className="cursor-pointer hover:border-accent transition-colors"
                            onClick={() => navigateToDashboard(`/revoker?universityId=${uni.id}`)}
                          >
                            <CardContent className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-destructive/10">
                                  <FileX className="h-5 w-5 text-destructive" />
                                </div>
                                <div>
                                  <p className="font-medium">Revoker</p>
                                  <p className="text-sm text-muted-foreground">{uni.name}</p>
                                </div>
                              </div>
                              <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground border-t pt-6">
            <div className="flex items-center justify-center gap-2 text-xs">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Roles are verified on-chain from the smart contract</span>
            </div>
            <p>
              Super Admin?{" "}
              <Link href="/admin/login" className="text-primary hover:underline">
                Login with email
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
