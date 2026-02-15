"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Wallet,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Lock,
  Eye,
  Clock,
} from "lucide-react"

interface OnboardingData {
  universityName: string
  adminName: string
  adminEmail: string
  registrationType: string
  trialEndDate: string | null
  ndaSigned: boolean
  walletSubmitted: boolean
  isExpired: boolean
}

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [step, setStep] = useState(1)
  const [ndaAccepted, setNdaAccepted] = useState(false)
  const [confidentialityAccepted, setConfidentialityAccepted] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [walletConfirmed, setWalletConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchOnboardingData()
  }, [token])

  const fetchOnboardingData = async () => {
    if (!token) {
      setError("Invalid onboarding link - token missing")
      setLoading(false)
      return
    }

    console.log(`[Onboarding] Fetching data for token: ${token.substring(0, 16)}... (length: ${token.length})`)

    try {
      // Next.js handles URL encoding automatically, but we'll pass it as-is
      // The API route will handle decoding and validation
      const apiUrl = `/api/onboarding/${token}`
      console.log(`[Onboarding] API URL: ${apiUrl.substring(0, 50)}...`)
      const response = await fetch(apiUrl)
      const result = await response.json()

      if (!response.ok) {
        // Use the specific error message from the API if available
        const errorMessage = result.error || "Invalid or expired onboarding link"
        console.error("[Onboarding] API error:", errorMessage, "Status:", response.status)
        setError(errorMessage)
        setLoading(false)
        return
      }

      setData(result)
      
      // Set initial step based on progress
      if (result.ndaSigned && !result.walletSubmitted) {
        setStep(2)
      } else if (result.ndaSigned && result.walletSubmitted) {
        setStep(3)
      }
      
      setLoading(false)
    } catch (err) {
      console.error("[Onboarding] Fetch error:", err)
      setError("Failed to load onboarding data. Please check your connection and try again.")
      setLoading(false)
    }
  }

  const handleNdaSubmit = async () => {
    if (!ndaAccepted || !confidentialityAccepted) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/onboarding/${token}/nda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to submit NDA")
      }

      setStep(2)
      if (data) {
        setData({ ...data, ndaSigned: true })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleWalletSubmit = async () => {
    if (!walletAddress || !walletConfirmed) return
    
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setError("Invalid Ethereum wallet address format")
      return
    }

    setSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/onboarding/${token}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to submit wallet address")
      }

      setSuccess(true)
      setStep(3)
      if (data) {
        setData({ ...data, walletSubmitted: true })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Onboarding Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              This link may have expired or is invalid. Please contact the administrator for a new onboarding link.
            </p>
            <Button onClick={() => router.push("/")} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">BU Blockchain Degrees</h1>
              <p className="text-xs text-muted-foreground">University Onboarding</p>
            </div>
          </div>
          <Badge variant={data.registrationType === "trial" ? "secondary" : "default"}>
            {data.registrationType === "trial" ? "Trial Account" : "Subscription"}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
            <Building2 className="h-4 w-4" />
            {data.universityName}
          </div>
          <h2 className="text-3xl font-bold mb-2">Welcome, {data.adminName}!</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Complete the steps below to activate your university account and start issuing blockchain-verified degrees.
          </p>
          {data.trialEndDate && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 rounded-lg">
              <Clock className="h-4 w-4" />
              Trial expires: {new Date(data.trialEndDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step > s
                    ? "bg-green-500 text-white"
                    : step === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 md:w-24 h-1 mx-2 rounded ${
                    step > s ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-4 mb-8">
          <div className="flex items-center gap-3 text-sm">
            <span className={step >= 1 ? "text-foreground" : "text-muted-foreground"}>
              1. Sign NDA & Agreements
            </span>
            <span className="text-muted-foreground">→</span>
            <span className={step >= 2 ? "text-foreground" : "text-muted-foreground"}>
              2. Submit Wallet Address
            </span>
            <span className="text-muted-foreground">→</span>
            <span className={step >= 3 ? "text-foreground" : "text-muted-foreground"}>
              3. Await Activation
            </span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: NDA & Agreements */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Non-Disclosure & Confidentiality Agreement
              </CardTitle>
              <CardDescription>
                Please read and accept the following agreements to proceed with your account setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* NDA Content */}
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Non-Disclosure Agreement (NDA)</h4>
                  <ScrollArea className="h-48 rounded border bg-background p-4">
                    <div className="text-sm text-muted-foreground space-y-4">
                      <p><strong>PARTIES:</strong> This Non-Disclosure Agreement ("Agreement") is entered into between BU Blockchain Degrees ("Disclosing Party") and {data.universityName} ("Receiving Party").</p>
                      
                      <p><strong>1. DEFINITION OF CONFIDENTIAL INFORMATION</strong></p>
                      <p>"Confidential Information" means any data, information, or materials that are proprietary to the Disclosing Party, whether disclosed orally, in writing, or by any other means, including but not limited to: student personal data, academic records, blockchain private keys, system architecture, security protocols, and business processes.</p>
                      
                      <p><strong>2. OBLIGATIONS</strong></p>
                      <p>The Receiving Party agrees to:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Hold and maintain the Confidential Information in strict confidence</li>
                        <li>Not disclose any Confidential Information to third parties without prior written consent</li>
                        <li>Use the Confidential Information solely for the purposes of issuing and managing academic credentials</li>
                        <li>Protect Confidential Information using at least the same degree of care used to protect its own confidential information</li>
                        <li>Immediately notify the Disclosing Party of any unauthorized disclosure or use</li>
                      </ul>
                      
                      <p><strong>3. DATA PROTECTION</strong></p>
                      <p>The Receiving Party shall comply with all applicable data protection laws and regulations, including but not limited to GDPR, FERPA, and any local data protection requirements.</p>
                      
                      <p><strong>4. TERM</strong></p>
                      <p>This Agreement shall remain in effect for the duration of the business relationship and for a period of five (5) years thereafter.</p>
                      
                      <p><strong>5. RETURN OF MATERIALS</strong></p>
                      <p>Upon termination of this Agreement or upon request, the Receiving Party shall return or destroy all Confidential Information and any copies thereof.</p>
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="nda"
                    checked={ndaAccepted}
                    onCheckedChange={(checked) => setNdaAccepted(checked as boolean)}
                  />
                  <Label htmlFor="nda" className="text-sm leading-relaxed cursor-pointer">
                    I have read, understood, and agree to the terms of the Non-Disclosure Agreement on behalf of {data.universityName}
                  </Label>
                </div>
              </div>

              <Separator />

              {/* Confidentiality Agreement */}
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Confidentiality & Data Protection Agreement</h4>
                  <ScrollArea className="h-48 rounded border bg-background p-4">
                    <div className="text-sm text-muted-foreground space-y-4">
                      <p><strong>DATA HANDLING RESPONSIBILITIES</strong></p>
                      <p>As an authorized university administrator on the BU Blockchain Degrees platform, you acknowledge and agree to the following:</p>
                      
                      <p><strong>1. STUDENT DATA PROTECTION</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>All student personal information shall be handled with utmost confidentiality</li>
                        <li>Student data shall only be used for the purpose of issuing and verifying academic credentials</li>
                        <li>No student data shall be shared with unauthorized parties</li>
                        <li>Students shall be informed about how their data is processed on the blockchain</li>
                      </ul>
                      
                      <p><strong>2. WALLET SECURITY</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>The wallet private key shall be stored securely and never shared</li>
                        <li>Multi-signature approval shall be used for sensitive operations where applicable</li>
                        <li>Any suspected compromise of wallet security shall be reported immediately</li>
                      </ul>
                      
                      <p><strong>3. AUTHORIZED PERSONNEL</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Only authorized personnel shall have access to the university dashboard</li>
                        <li>All issuers and revokers must be properly vetted before authorization</li>
                        <li>Access shall be revoked immediately when personnel leave the institution</li>
                      </ul>
                      
                      <p><strong>4. AUDIT & COMPLIANCE</strong></p>
                      <p>The university agrees to maintain accurate records and cooperate with any audits or compliance reviews conducted by BU Blockchain Degrees or regulatory authorities.</p>
                      
                      <p><strong>5. LIABILITY</strong></p>
                      <p>The university accepts full responsibility for any unauthorized access or data breaches resulting from negligence in following these security protocols.</p>
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="confidentiality"
                    checked={confidentialityAccepted}
                    onCheckedChange={(checked) => setConfidentialityAccepted(checked as boolean)}
                  />
                  <Label htmlFor="confidentiality" className="text-sm leading-relaxed cursor-pointer">
                    I have read, understood, and agree to the Confidentiality & Data Protection Agreement, and I confirm that I am authorized to accept these terms on behalf of {data.universityName}
                  </Label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleNdaSubmit}
                  disabled={!ndaAccepted || !confidentialityAccepted || submitting}
                  className="gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Accept & Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Wallet Address */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Submit Your MetaMask Wallet Address
              </CardTitle>
              <CardDescription>
                Enter your Ethereum wallet address to link it to your university account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* MetaMask Instructions */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Make sure you have MetaMask installed and have created a wallet. Your wallet address will be permanently linked to your university's blockchain identity.
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold">How to find your wallet address:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Open the MetaMask extension in your browser</li>
                  <li>Click on your account name at the top</li>
                  <li>Your address will be displayed (starts with 0x...)</li>
                  <li>Click to copy the full address</li>
                  <li>Paste it in the field below</li>
                </ol>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  Don't have MetaMask? Download here
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wallet">Ethereum Wallet Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="wallet"
                      placeholder="0x..."
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(walletAddress)}
                      disabled={!walletAddress}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your full Ethereum address (42 characters starting with 0x)
                  </p>
                </div>

                {walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress) && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Valid wallet address format</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3 pt-4">
                  <Checkbox
                    id="walletConfirm"
                    checked={walletConfirmed}
                    onCheckedChange={(checked) => setWalletConfirmed(checked as boolean)}
                  />
                  <Label htmlFor="walletConfirm" className="text-sm leading-relaxed cursor-pointer">
                    I confirm that this is my official university wallet address and I understand that:
                    <ul className="list-disc list-inside mt-2 text-muted-foreground">
                      <li>This address will be permanently linked to my university</li>
                      <li>All blockchain transactions will be signed with this wallet</li>
                      <li>I am responsible for keeping the private key secure</li>
                    </ul>
                  </Label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleWalletSubmit}
                  disabled={!walletAddress || !walletConfirmed || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress) || submitting}
                  className="gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Wallet Address
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Awaiting Activation */}
        {step === 3 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Setup Complete!</CardTitle>
              <CardDescription>
                Your information has been submitted successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <Lock className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h4 className="font-semibold mb-2">Awaiting Admin Activation</h4>
                <p className="text-sm text-muted-foreground">
                  The super administrator has been notified and will review your submission. 
                  Once your account is activated, you will receive an email with your login credentials 
                  and instructions to access your dashboard.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">NDA Signed</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Agreements accepted and recorded
                  </p>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Wallet Submitted</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pending admin verification
                  </p>
                </div>
              </div>

              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  <strong>What happens next?</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Admin reviews your wallet address</li>
                    <li>Your wallet is linked to the blockchain smart contract</li>
                    <li>Your account is activated</li>
                    <li>You receive a confirmation email with login details</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="text-center pt-4">
                <Button variant="outline" onClick={() => router.push("/")}>
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        <p>&copy; 2024 BU Blockchain Degrees. All rights reserved.</p>
        <p className="mt-1">
          Need help? Contact{" "}
          <a href="mailto:support@bublockchain.edu" className="text-primary hover:underline">
            support@bublockchain.edu
          </a>
        </p>
      </footer>
    </div>
  )
}
