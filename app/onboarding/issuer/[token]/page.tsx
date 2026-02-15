"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  CheckCircle2, 
  FileCheck, 
  Wallet, 
  AlertCircle, 
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react"
import { useWeb3 } from "@/components/providers/web3-provider"

interface IssuerData {
  id: number
  name: string
  email: string
  universityName: string
  onboardingStatus: string
}

export default function IssuerOnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const { isConnected, address, connect, isCorrectChain, switchChain } = useWeb3()
  
  const [issuerData, setIssuerData] = useState<IssuerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"nda" | "wallet" | "complete">("nda")
  
  // NDA state
  const [ndaAccepted, setNdaAccepted] = useState(false)
  const [isSubmittingNda, setIsSubmittingNda] = useState(false)
  
  // Wallet state
  const [walletAddress, setWalletAddress] = useState("")
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false)
  
  // Password change state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    loadOnboardingData()
  }, [token])

  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address)
    }
  }, [isConnected, address])

  const loadOnboardingData = async () => {
    try {
      const response = await fetch(`/api/onboarding/issuer/${token}`)
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || "Invalid or expired onboarding link")
        return
      }
      
      setIssuerData(data.issuer)
      
      // Set step based on current status
      if (data.issuer.onboardingStatus === "pending_nda") {
        setStep("nda")
      } else if (data.issuer.onboardingStatus === "pending_wallet") {
        setStep("wallet")
      } else if (data.issuer.onboardingStatus === "pending_blockchain" || data.issuer.onboardingStatus === "active") {
        setStep("complete")
      }
    } catch (err) {
      setError("Failed to load onboarding data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNdaSubmit = async () => {
    if (!ndaAccepted) return
    
    setIsSubmittingNda(true)
    try {
      const response = await fetch(`/api/onboarding/issuer/${token}/sign-nda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          accepted: true,
          newPassword: newPassword || undefined,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || "Failed to sign agreement")
        return
      }
      
      setStep("wallet")
    } catch (err) {
      setError("Failed to submit agreement")
    } finally {
      setIsSubmittingNda(false)
    }
  }

  const handleWalletSubmit = async () => {
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setError("Please enter a valid wallet address")
      return
    }
    
    setIsSubmittingWallet(true)
    setError("")
    try {
      const response = await fetch(`/api/onboarding/issuer/${token}/submit-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || "Failed to submit wallet")
        return
      }
      
      setStep("complete")
    } catch (err) {
      setError("Failed to submit wallet")
    } finally {
      setIsSubmittingWallet(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !issuerData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button className="w-full mt-4" onClick={() => router.push("/")}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <FileCheck className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Issuer Onboarding</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, {issuerData?.name}! Complete your setup to become an authorized issuer for {issuerData?.universityName}.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === "nda" ? "text-green-500" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "nda" ? "bg-green-500 text-white" : step !== "nda" ? "bg-green-500/20 text-green-500" : "bg-muted"
            }`}>
              {step !== "nda" ? <CheckCircle2 className="h-5 w-5" /> : "1"}
            </div>
            <span className="text-sm font-medium">Agreement</span>
          </div>
          <div className="w-12 h-0.5 bg-muted" />
          <div className={`flex items-center gap-2 ${step === "wallet" ? "text-green-500" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "wallet" ? "bg-green-500 text-white" : step === "complete" ? "bg-green-500/20 text-green-500" : "bg-muted"
            }`}>
              {step === "complete" ? <CheckCircle2 className="h-5 w-5" /> : "2"}
            </div>
            <span className="text-sm font-medium">Wallet</span>
          </div>
          <div className="w-12 h-0.5 bg-muted" />
          <div className={`flex items-center gap-2 ${step === "complete" ? "text-green-500" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "complete" ? "bg-green-500 text-white" : "bg-muted"
            }`}>
              {step === "complete" ? <CheckCircle2 className="h-5 w-5" /> : "3"}
            </div>
            <span className="text-sm font-medium">Complete</span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: NDA Agreement */}
        {step === "nda" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Confidentiality Agreement
              </CardTitle>
              <CardDescription>
                Please review and accept the agreement to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto text-sm">
                <h4 className="font-semibold mb-2">ISSUER CONFIDENTIALITY AND AUTHORIZATION AGREEMENT</h4>
                <p className="mb-4">
                  By accepting this agreement, I acknowledge and agree to the following terms as an authorized Degree Issuer for {issuerData?.universityName} on EdChain:
                </p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li><strong>Authority:</strong> I am authorized by {issuerData?.universityName} to issue degree certificates on the blockchain.</li>
                  <li><strong>Accuracy:</strong> I will only issue certificates with accurate and verified information.</li>
                  <li><strong>Confidentiality:</strong> I will maintain the confidentiality of all student data and not share private keys or credentials.</li>
                  <li><strong>Security:</strong> I will securely store my wallet credentials and report any security breaches immediately.</li>
                  <li><strong>Compliance:</strong> I will comply with all applicable laws, regulations, and university policies.</li>
                  <li><strong>Responsibility:</strong> I understand that blockchain transactions are immutable and I am responsible for ensuring accuracy before issuing.</li>
                  <li><strong>Termination:</strong> My issuer privileges may be revoked at any time by the university administration.</li>
                </ol>
              </div>

              <div className="space-y-4">
                <Label>Change Password (Optional)</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-destructive">Passwords do not match</p>
                )}
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="nda"
                  checked={ndaAccepted}
                  onCheckedChange={(checked) => setNdaAccepted(checked as boolean)}
                />
                <label htmlFor="nda" className="text-sm cursor-pointer">
                  I have read and agree to the Confidentiality and Authorization Agreement. I understand my responsibilities as an authorized issuer.
                </label>
              </div>

              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={handleNdaSubmit}
                disabled={!ndaAccepted || isSubmittingNda || (newPassword && newPassword !== confirmPassword)}
              >
                {isSubmittingNda ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept & Continue
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Wallet Setup */}
        {step === "wallet" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-500" />
                Connect Your Wallet
              </CardTitle>
              <CardDescription>
                Connect or enter your MetaMask wallet address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-green-500/30 bg-green-500/5">
                <Wallet className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Your wallet address will be used to sign blockchain transactions when issuing degrees.
                  Make sure to keep your wallet secure and never share your private key.
                </AlertDescription>
              </Alert>

              {!isConnected ? (
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <Wallet className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="font-semibold mb-2">Connect MetaMask</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your MetaMask wallet to automatically fill in your address
                  </p>
                  <Button onClick={connect} className="bg-green-600 hover:bg-green-700">
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    Don't have MetaMask?{" "}
                    <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">
                      Download here <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </p>
                </div>
              ) : !isCorrectChain ? (
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-amber-500" />
                  </div>
                  <h3 className="font-semibold mb-2">Wrong Network</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please switch to Base network
                  </p>
                  <Button onClick={switchChain} variant="outline" className="bg-transparent">
                    Switch to Base
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/30">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Wallet Connected</p>
                        <p className="text-sm font-mono text-muted-foreground">{address}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input
                  placeholder="0x..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your Ethereum wallet address (0x...)
                </p>
              </div>

              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={handleWalletSubmit}
                disabled={!walletAddress || isSubmittingWallet}
              >
                {isSubmittingWallet ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Submit Wallet Address
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {step === "complete" && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
              <p className="text-muted-foreground mb-6">
                Your wallet address has been submitted. The university administrator will add you to the blockchain shortly.
              </p>
              
              <Badge variant="outline" className="text-green-500 border-green-500 mb-6">
                <Wallet className="h-3 w-3 mr-1" />
                Pending Blockchain Addition
              </Badge>
              
              <div className="bg-muted/50 rounded-lg p-4 text-left">
                <h4 className="font-semibold mb-2">What happens next?</h4>
                <ol className="list-decimal pl-4 space-y-2 text-sm text-muted-foreground">
                  <li>The university administrator will review your submission</li>
                  <li>Your wallet will be added to the blockchain as an authorized issuer</li>
                  <li>You'll receive an email confirmation when activated</li>
                  <li>You can then log in and start issuing degrees</li>
                </ol>
              </div>
              
              <Button className="mt-6" onClick={() => router.push("/issuer/login")}>
                Go to Issuer Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
