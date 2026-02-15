"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  FileX, 
  Loader2, 
  CheckCircle2, 
  Wallet, 
  FileText, 
  Shield,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react"
import { useWeb3 } from "@/components/providers/web3-provider"

interface OnboardingData {
  id: number
  name: string
  email: string
  universityName: string
  universityId: number
  onboardingStatus: string
}

type OnboardingStep = "nda" | "wallet" | "complete"

export default function RevokerOnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const { isConnected, address, connect, isCorrectChain, switchChain } = useWeb3()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("nda")
  const [ndaAccepted, setNdaAccepted] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [copied, setCopied] = useState(false)

  // Load onboarding data
  useEffect(() => {
    const loadOnboarding = async () => {
      try {
        const response = await fetch(`/api/onboarding/revoker/${token}`)
        const data = await response.json()
        
        if (!response.ok) {
          setError(data.error || "Invalid or expired onboarding link")
          setIsLoading(false)
          return
        }
        
        setOnboardingData(data.revoker)
        
        // Determine current step based on status
        if (data.revoker.onboardingStatus === "pending_nda") {
          setCurrentStep("nda")
        } else if (data.revoker.onboardingStatus === "pending_wallet") {
          setCurrentStep("wallet")
        } else if (data.revoker.onboardingStatus === "pending_blockchain" || data.revoker.onboardingStatus === "active") {
          setCurrentStep("complete")
        }
      } catch (err) {
        setError("Failed to load onboarding data")
      } finally {
        setIsLoading(false)
      }
    }
    
    if (token) {
      loadOnboarding()
    }
  }, [token])

  // Auto-fill wallet address when connected
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address)
    }
  }, [isConnected, address])

  const handleSignNDA = async () => {
    if (!ndaAccepted) {
      setError("Please accept the confidentiality agreement")
      return
    }
    
    setIsSubmitting(true)
    setError("")
    
    try {
      const response = await fetch(`/api/onboarding/revoker/${token}/sign-nda`, {
        method: "POST",
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to sign agreement")
      }
      
      setCurrentStep("wallet")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign agreement")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitWallet = async () => {
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setError("Please enter a valid wallet address")
      return
    }
    
    setIsSubmitting(true)
    setError("")
    
    try {
      const response = await fetch(`/api/onboarding/revoker/${token}/submit-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit wallet")
      }
      
      setCurrentStep("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit wallet")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
          <p className="mt-4 text-muted-foreground">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  if (error && !onboardingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push("/")} variant="outline" className="bg-transparent">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <FileX className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Revoker Onboarding</h1>
              <p className="text-sm text-muted-foreground">{onboardingData?.universityName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep === "nda" ? "text-orange-500" : currentStep !== "nda" ? "text-muted-foreground" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === "nda" ? "bg-orange-500 text-white" : 
                currentStep !== "nda" ? "bg-orange-500/20 text-orange-500" : "bg-muted"
              }`}>
                {currentStep !== "nda" ? <CheckCircle2 className="h-5 w-5" /> : "1"}
              </div>
              <span className="text-sm font-medium hidden sm:block">Agreement</span>
            </div>
            <div className="w-12 h-0.5 bg-muted" />
            <div className={`flex items-center gap-2 ${currentStep === "wallet" ? "text-orange-500" : currentStep === "complete" ? "text-muted-foreground" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === "wallet" ? "bg-orange-500 text-white" : 
                currentStep === "complete" ? "bg-orange-500/20 text-orange-500" : "bg-muted"
              }`}>
                {currentStep === "complete" ? <CheckCircle2 className="h-5 w-5" /> : "2"}
              </div>
              <span className="text-sm font-medium hidden sm:block">Wallet</span>
            </div>
            <div className="w-12 h-0.5 bg-muted" />
            <div className={`flex items-center gap-2 ${currentStep === "complete" ? "text-orange-500" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === "complete" ? "bg-orange-500 text-white" : "bg-muted"
              }`}>
                3
              </div>
              <span className="text-sm font-medium hidden sm:block">Complete</span>
            </div>
          </div>
        </div>

        {/* Welcome Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Welcome, {onboardingData?.name}!</CardTitle>
            <CardDescription>
              You have been added as an authorized <Badge variant="outline" className="text-orange-500 border-orange-500">Revoker</Badge> for {onboardingData?.universityName}.
              Complete the steps below to activate your account.
            </CardDescription>
          </CardHeader>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: NDA */}
        {currentStep === "nda" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <FileText className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle>Confidentiality Agreement</CardTitle>
                  <CardDescription>Please review and accept the agreement to continue</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto text-sm space-y-4">
                <h4 className="font-semibold">REVOKER CONFIDENTIALITY AND RESPONSIBILITY AGREEMENT</h4>
                
                <p>
                  By accepting this agreement, you acknowledge and agree to the following terms as an authorized
                  Degree Revoker for {onboardingData?.universityName} on EdChain:
                </p>
                
                <div className="space-y-2">
                  <p><strong>1. Role and Responsibilities</strong></p>
                  <p>As a Revoker, you will have the authority to permanently revoke blockchain-verified degree certificates. This is a critical function that should only be exercised in accordance with university policies.</p>
                </div>
                
                <div className="space-y-2">
                  <p><strong>2. Confidentiality</strong></p>
                  <p>You agree to maintain strict confidentiality regarding all student information, revocation records, and internal university matters related to degree revocations.</p>
                </div>
                
                <div className="space-y-2">
                  <p><strong>3. Wallet Security</strong></p>
                  <p>You are solely responsible for maintaining the security of your blockchain wallet. Never share your private keys or seed phrase with anyone.</p>
                </div>
                
                <div className="space-y-2">
                  <p><strong>4. Proper Use</strong></p>
                  <p>You agree to only revoke degrees when properly authorized and in compliance with university regulations and applicable laws.</p>
                </div>
                
                <div className="space-y-2">
                  <p><strong>5. Irreversibility</strong></p>
                  <p>You understand that blockchain transactions are permanent and irreversible. Extra care must be taken before executing any revocation.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="nda" 
                  checked={ndaAccepted}
                  onCheckedChange={(checked) => setNdaAccepted(checked as boolean)}
                />
                <label htmlFor="nda" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the Confidentiality and Responsibility Agreement. I understand my duties as a Revoker.
                </label>
              </div>
              
              <Button 
                onClick={handleSignNDA} 
                disabled={!ndaAccepted || isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Accept & Continue
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Wallet */}
        {currentStep === "wallet" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Wallet className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle>Connect Your Wallet</CardTitle>
                  <CardDescription>Submit your MetaMask wallet address to complete setup</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-orange-500/30 bg-orange-500/5">
                <Wallet className="h-4 w-4 text-orange-500" />
                <AlertDescription>
                  <strong>Need MetaMask?</strong> Download it from{" "}
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline inline-flex items-center gap-1"
                  >
                    metamask.io <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {!isConnected ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Wallet className="h-8 w-8 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Connect MetaMask</h3>
                      <p className="text-sm text-muted-foreground">
                        Click below to connect your wallet automatically
                      </p>
                    </div>
                    <Button onClick={connect} size="lg" className="bg-orange-600 hover:bg-orange-700">
                      <Wallet className="mr-2 h-5 w-5" />
                      Connect MetaMask
                    </Button>
                  </div>
                ) : !isCorrectChain ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Wrong Network</h3>
                      <p className="text-sm text-muted-foreground">
                        Please switch to Base network
                      </p>
                    </div>
                    <Button onClick={switchChain} size="lg" variant="outline" className="bg-transparent">
                      Switch to Base
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border bg-orange-500/5 border-orange-500/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Connected Wallet</p>
                          <p className="font-mono text-sm">{address}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={copyAddress}>
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet">Wallet Address</Label>
                  <Input
                    id="wallet"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSubmitWallet} 
                disabled={!walletAddress || isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Wallet Address
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {currentStep === "complete" && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold">Onboarding Complete!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your wallet address has been submitted. The university administrator will add you 
                  to the blockchain. You will receive an email once your revoker permissions are activated.
                </p>
                
                <div className="p-4 rounded-lg bg-muted/50 max-w-sm mx-auto">
                  <p className="text-sm text-muted-foreground mb-1">Your Wallet</p>
                  <p className="font-mono text-sm break-all">{walletAddress || address}</p>
                </div>
                
                <div className="pt-4">
                  <Button onClick={() => router.push("/revoker/login")} className="bg-orange-600 hover:bg-orange-700">
                    Go to Revoker Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
