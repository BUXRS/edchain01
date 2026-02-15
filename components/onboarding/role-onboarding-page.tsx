"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  EyeOff,
  Clock,
  Key,
  FileCheck,
  FileX,
  UserCheck,
} from "lucide-react"

interface RoleOnboardingProps {
  role: "issuer" | "revoker" | "verifier"
  token: string
  apiBasePath: string
  loginPath: string
}

const roleConfig = {
  issuer: {
    color: "#10b981",
    label: "Issuer",
    icon: FileCheck,
    description: "You can issue blockchain-verified degree certificates",
    roleDescription: "As an Issuer, you can create and issue blockchain-verified degree certificates. Each degree you issue will be permanently recorded on the blockchain.",
  },
  revoker: {
    color: "#f97316",
    label: "Revoker",
    icon: FileX,
    description: "You can revoke blockchain-verified degree certificates when necessary",
    roleDescription: "As a Revoker, you can revoke blockchain-verified degree certificates when necessary (e.g., academic misconduct, degree revocation). This action is permanent and recorded on the blockchain.",
  },
  verifier: {
    color: "#3b82f6",
    label: "Verifier",
    icon: UserCheck,
    description: "You can approve/reject degree issuance and revocation requests",
    roleDescription: "As a Verifier, you can approve or reject degree issuance and revocation requests. This two-stage verification process ensures quality control and prevents unauthorized actions. Maximum 3 verifiers per university.",
  },
}

export function RoleOnboardingPage({ role, token, apiBasePath, loginPath }: RoleOnboardingProps) {
  const router = useRouter()
  const config = roleConfig[role]
  const RoleIcon = config.icon

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [step, setStep] = useState(1)
  const [ndaAccepted, setNdaAccepted] = useState(false)
  const [confidentialityAccepted, setConfidentialityAccepted] = useState(false)
  const [ndaSignature, setNdaSignature] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [walletConfirmed, setWalletConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchOnboardingData()
  }, [token])

  const fetchOnboardingData = async () => {
    try {
      const response = await fetch(`${apiBasePath}/${token}`)
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Invalid or expired onboarding link")
        setLoading(false)
        return
      }

      const roleData = result[role]
      setData(roleData)
      
      // Set initial step based on progress
      if (roleData.ndaSigned && !roleData.walletSubmitted) {
        setStep(2) // Move to credentials if NDA signed
      } else if (roleData.ndaSigned && roleData.walletSubmitted) {
        setStep(5) // Show success if wallet submitted
        setSuccess(true)
      } else {
        setStep(1) // Start at NDA if not signed
      }
      
      setLoading(false)
    } catch (err) {
      setError("Failed to load onboarding data")
      setLoading(false)
    }
  }

  const handleNdaSubmit = async () => {
    if (!ndaAccepted || !confidentialityAccepted || !ndaSignature.trim()) {
      setError("Please accept both agreements and provide your signature (full name)")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`${apiBasePath}/${token}/nda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          accepted: true,
          signature: ndaSignature.trim()
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to submit NDA")
      }

      setStep(2) // Move to credentials view
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
      const response = await fetch(`${apiBasePath}/${token}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to submit wallet address")
      }

      setSuccess(true)
      setStep(5) // Show success screen
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
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: config.color }} />
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
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50" style={{ borderColor: config.color + "40" }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.color + "20" }}>
              <RoleIcon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <h1 className="font-bold text-lg">BU Blockchain Degrees</h1>
              <p className="text-xs text-muted-foreground">{config.label} Onboarding</p>
            </div>
          </div>
          <Badge style={{ backgroundColor: config.color + "20", color: config.color, borderColor: config.color }}>
            {config.label}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-4" style={{ backgroundColor: config.color + "20", color: config.color }}>
            <Building2 className="h-4 w-4" />
            {data.universityName}
          </div>
          <h2 className="text-3xl font-bold mb-2">Welcome, {data.name}!</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Complete the steps below to activate your {config.label.toLowerCase()} account. {config.description}
          </p>
        </div>

        {/* Progress Steps - 4 Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step > s
                    ? "bg-green-500 text-white"
                    : step === s
                      ? "text-white"
                      : "bg-muted text-muted-foreground"
                }`}
                style={step === s ? { backgroundColor: config.color } : {}}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-12 md:w-16 h-1 mx-2 rounded ${
                    step > s ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-4 mb-8">
          <div className="flex items-center gap-2 text-sm flex-wrap justify-center">
            <span className={step >= 1 ? "text-foreground" : "text-muted-foreground"}>
              1. Sign NDA & Agreements
            </span>
            <span className="text-muted-foreground">→</span>
            <span className={step >= 2 ? "text-foreground" : "text-muted-foreground"}>
              2. View Credentials
            </span>
            <span className="text-muted-foreground">→</span>
            <span className={step >= 3 ? "text-foreground" : "text-muted-foreground"}>
              3. Create Wallet
            </span>
            <span className="text-muted-foreground">→</span>
            <span className={step >= 4 ? "text-foreground" : "text-muted-foreground"}>
              4. Submit Wallet
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
                <FileText className="h-5 w-5" style={{ color: config.color }} />
                Non-Disclosure & Confidentiality Agreement
              </CardTitle>
              <CardDescription>
                Please read and accept the following agreements to proceed with your {config.label.toLowerCase()} account setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* NDA Content - Role-specific */}
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Non-Disclosure Agreement (NDA)</h4>
                  <ScrollArea className="h-48 rounded border bg-background p-4">
                    <div className="text-sm text-muted-foreground space-y-4">
                      <p><strong>PARTIES:</strong> This Non-Disclosure Agreement ("Agreement") is entered into between BU Blockchain Degrees ("Disclosing Party") and {data.universityName} - {config.label} Role ("Receiving Party").</p>
                      
                      <p><strong>1. DEFINITION OF CONFIDENTIAL INFORMATION</strong></p>
                      <p>"Confidential Information" means any data, information, or materials that are proprietary to the Disclosing Party, whether disclosed orally, in writing, or by any other means, including but not limited to: student personal data, academic records, blockchain private keys, system architecture, security protocols, and business processes.</p>
                      
                      <p><strong>2. OBLIGATIONS</strong></p>
                      <p>The Receiving Party agrees to:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Hold and maintain the Confidential Information in strict confidence</li>
                        <li>Not disclose any Confidential Information to third parties without prior written consent</li>
                        <li>Use the Confidential Information solely for the purposes of {role === "issuer" ? "issuing" : role === "revoker" ? "revoking" : "verifying"} academic credentials</li>
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
                    I have read, understood, and agree to the terms of the Non-Disclosure Agreement as a {config.label} for {data.universityName}
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
                      <p>As an authorized {config.label.toLowerCase()} on the BU Blockchain Degrees platform, you acknowledge and agree to the following:</p>
                      
                      <p><strong>1. STUDENT DATA PROTECTION</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>All student personal information shall be handled with utmost confidentiality</li>
                        <li>Student data shall only be used for the purpose of {role === "issuer" ? "issuing" : role === "revoker" ? "revoking" : "verifying"} academic credentials</li>
                        <li>No student data shall be shared with unauthorized parties</li>
                        <li>Students shall be informed about how their data is processed on the blockchain</li>
                      </ul>
                      
                      <p><strong>2. WALLET SECURITY</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>The wallet private key shall be stored securely and never shared</li>
                        <li>Any suspected compromise of wallet security shall be reported immediately</li>
                        <li>Only use your authorized wallet for {config.label.toLowerCase()} operations</li>
                      </ul>
                      
                      <p><strong>3. ROLE-SPECIFIC RESPONSIBILITIES</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        {role === "issuer" && (
                          <>
                            <li>Only issue degrees for legitimate graduates</li>
                            <li>Verify all information before issuing</li>
                            <li>Maintain accurate records of all issued degrees</li>
                          </>
                        )}
                        {role === "revoker" && (
                          <>
                            <li>Only revoke degrees with proper authorization</li>
                            <li>Document revocation reasons clearly</li>
                            <li>Follow university policies for revocations</li>
                          </>
                        )}
                        {role === "verifier" && (
                          <>
                            <li>Review all requests thoroughly before approval</li>
                            <li>Ensure compliance with university policies</li>
                            <li>Maintain impartiality in verification decisions</li>
                          </>
                        )}
                      </ul>
                      
                      <p><strong>4. AUDIT & COMPLIANCE</strong></p>
                      <p>You agree to maintain accurate records and cooperate with any audits or compliance reviews conducted by BU Blockchain Degrees, the university, or regulatory authorities.</p>
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
                    I have read, understood, and agree to the Confidentiality & Data Protection Agreement, and I confirm that I am authorized to accept these terms as a {config.label} for {data.universityName}
                  </Label>
                </div>
              </div>

              {/* Signature Field */}
              <div className="space-y-2">
                <Label htmlFor="signature">
                  Full Name (Signature) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="signature"
                  placeholder="Enter your full name"
                  value={ndaSignature}
                  onChange={(e) => setNdaSignature(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  By entering your full name, you are providing your digital signature for both agreements above.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleNdaSubmit}
                  disabled={!ndaAccepted || !confidentialityAccepted || !ndaSignature.trim() || submitting}
                  className="gap-2"
                  style={{ backgroundColor: config.color }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Sign Agreement & Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: View Credentials */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" style={{ color: config.color }} />
                Step 2: View Your Login Credentials
              </CardTitle>
              <CardDescription>
                Save these credentials securely. You'll need them to log in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Please save these credentials in a secure location. You will need them to log in to the {config.label.toLowerCase()} dashboard.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Input value={data?.email || ""} readOnly className="font-mono" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(data?.email || "")}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value="Check your email for the password"
                        readOnly
                        className="font-mono pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your password was sent to your email. If you don't have it, check your inbox or contact support.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(3)} className="gap-2" style={{ backgroundColor: config.color }}>
                  Continue to Next Step
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Create MetaMask Wallet Guide */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" style={{ color: config.color }} />
                Step 3: Create MetaMask Wallet (If Needed)
              </CardTitle>
              <CardDescription>
                Follow these steps to create a MetaMask wallet if you don't have one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Wallet className="h-4 w-4" />
                <AlertDescription>
                  If you already have a MetaMask wallet, you can skip to the next step.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">1. Install MetaMask</h3>
                  <p className="text-sm text-muted-foreground">
                    Visit <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">metamask.io</a> and install the MetaMask browser extension.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold">2. Create a New Wallet</h3>
                  <p className="text-sm text-muted-foreground">
                    Open MetaMask and click "Create a Wallet". Follow the instructions to set up your wallet.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold">3. Secure Your Recovery Phrase</h3>
                  <p className="text-sm text-muted-foreground">
                    Write down your 12-word recovery phrase in a secure location. Never share this with anyone.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold">4. Get Your Wallet Address</h3>
                  <p className="text-sm text-muted-foreground">
                    After creating your wallet, copy your wallet address (it starts with 0x). You'll need this in the next step.
                  </p>
                </div>

                <Separator />

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Security Tips</h3>
                  <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                    <li>Never share your recovery phrase with anyone</li>
                    <li>Use a hardware wallet for enhanced security</li>
                    <li>Keep your wallet address private</li>
                    <li>Be cautious of phishing attempts</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(4)} className="gap-2" style={{ backgroundColor: config.color }}>
                  I Have My Wallet Address - Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Submit Wallet Address */}
        {step === 4 && !success && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" style={{ color: config.color }} />
                Step 4: Submit Your Wallet Address
              </CardTitle>
              <CardDescription>
                Enter your MetaMask wallet address for approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your wallet address will be reviewed and approved by the university admin before your account is activated.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wallet">Wallet Address <span className="text-destructive">*</span></Label>
                  <Input
                    id="wallet"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => {
                      setWalletAddress(e.target.value)
                      setError(null)
                    }}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Ethereum wallet address (42 characters, starts with 0x)
                  </p>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="walletConfirm"
                    checked={walletConfirmed}
                    onCheckedChange={(checked) => setWalletConfirmed(checked as boolean)}
                  />
                  <Label htmlFor="walletConfirm" className="text-sm leading-relaxed cursor-pointer">
                    I confirm that this is my wallet address and I have securely stored my recovery phrase
                  </Label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleWalletSubmit}
                  disabled={!walletAddress || !walletConfirmed || submitting}
                  className="gap-2"
                  style={{ backgroundColor: config.color }}
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

        {/* Success State / Awaiting Activation */}
        {success && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: config.color + "20" }}>
                <CheckCircle2 className="h-8 w-8" style={{ color: config.color }} />
              </div>
              <CardTitle>Onboarding Complete!</CardTitle>
              <CardDescription>
                Your information has been submitted successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg p-6 text-center" style={{ backgroundColor: config.color + "10", borderColor: config.color + "40", borderWidth: "1px" }}>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: config.color }} />
                <h3 className="font-semibold text-lg mb-2">All Steps Completed!</h3>
                <p className="text-sm text-muted-foreground">
                  Your onboarding information has been submitted successfully. The university admin will review your
                  wallet address and activate your account. You will receive an email notification once your
                  account is activated.
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
                    <li>University Admin reviews your wallet address</li>
                    <li>Your wallet is registered on the blockchain smart contract</li>
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
