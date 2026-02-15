"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  UserCheck, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Info, 
  Eye, 
  EyeOff,
  Copy,
  Check,
  Wallet,
  Lock,
  FileCheck,
  History,
  Shield,
  CheckCircle2,
  FileText,
} from "lucide-react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { WalletLoginButton } from "@/components/auth/wallet-login-button"

interface AuthorizedUniversity {
  id: number
  nameEn: string
  nameAr?: string
  isActive: boolean
}

export default function VerifierLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loginMethod, setLoginMethod] = useState<"wallet" | "email">("wallet")
  const [requiresUniversitySelection, setRequiresUniversitySelection] = useState(false)
  const [authorizedUniversities, setAuthorizedUniversities] = useState<AuthorizedUniversity[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
  const router = useRouter()
  
  const { isConnected, address, connect, isCorrectChain, switchChain } = useWeb3()
  
  // Handle wallet login
  const handleWalletLogin = async (walletAddress: string) => {
    setIsLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/auth/verifier/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          loginMethod: "wallet",
          walletAddress: walletAddress,
          ...(selectedUniversityId && { universityId: selectedUniversityId }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Wallet not authorized as verifier")
      }

      // Check if university selection is required
      if (data.requiresUniversitySelection && data.authorizedUniversities) {
        setRequiresUniversitySelection(true)
        setAuthorizedUniversities(data.authorizedUniversities)
        setIsLoading(false)
        return
      }

      // Login successful
      localStorage.setItem("verifier_session", JSON.stringify(data.verifier))
      router.push("/verifier")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      throw err // Re-throw so WalletLoginButton can handle it
    } finally {
      setIsLoading(false)
    }
  }

  const handleUniversitySelection = async () => {
    if (!selectedUniversityId || !address) {
      setError("Please select a university")
      return
    }
    await handleWalletLogin(address)
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/verifier/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, loginMethod: "email" }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If database unavailable, suggest wallet login
        if (response.status === 503) {
          setError("Database unavailable. Please use Wallet Login instead.")
          setLoginMethod("wallet")
          return
        }
        throw new Error(data.error || "Login failed")
      }

      localStorage.setItem("verifier_session", JSON.stringify(data.verifier))
      router.push("/verifier")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail("verifier@rak-university.edu")
    setPassword("verifier123")
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login portal
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-2 items-start">
          {/* Left Column - Info */}
          <div className="space-y-6 lg:sticky lg:top-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-purple-500/10">
                  <UserCheck className="h-8 w-8 text-purple-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Degree Verifier Portal</h1>
                  <p className="text-muted-foreground">Approval Workflow</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                As an authorized Degree Verifier, you can approve degree and revocation requests 
                on behalf of your university. Your approval is required before degrees can be issued 
                or revoked on the blockchain.
              </p>
            </div>

            {/* Capabilities */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Verifier Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-purple-500/10">
                    <FileCheck className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Approve Degree Requests</p>
                    <p className="text-xs text-muted-foreground">Review and approve degree issuance requests</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-purple-500/10">
                    <FileText className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Approve Revocation Requests</p>
                    <p className="text-xs text-muted-foreground">Review and approve degree revocation requests</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-purple-500/10">
                    <History className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Approval History</p>
                    <p className="text-xs text-muted-foreground">View all requests you have approved or rejected</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-purple-500/10">
                    <Shield className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Verification Workflow</p>
                    <p className="text-xs text-muted-foreground">Participate in multi-verifier approval process</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Notice */}
            <Alert className="border-purple-500/30 bg-purple-500/10">
              <Wallet className="h-4 w-4 text-purple-500" />
              <AlertDescription className="text-sm">
                <strong className="text-purple-500">Wallet Required:</strong> After logging in, you must connect 
                your MetaMask wallet. Your wallet must be authorized as a verifier for your university on the 
                smart contract. Each approval requires your wallet signature.
              </AlertDescription>
            </Alert>

            {/* Important Notes */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Important Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">&#8226;</span>
                    Verifiers work in groups of 2-3, with approval rules (1 of 2 or 2 of 3)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">&#8226;</span>
                    Review all request details carefully before approving
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">&#8226;</span>
                    Gas fees are required for each blockchain transaction
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">&#8226;</span>
                    Contact your university admin if you need assistance
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="p-4 rounded-lg border border-border/50 bg-card/30">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Security Information</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Your wallet address must be authorized by your university admin</li>
                <li>All approvals are permanently recorded on the blockchain</li>
                <li>Never share your wallet private key or seed phrase</li>
              </ul>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl">Verifier Sign In</CardTitle>
              <CardDescription>Enter your credentials to access the verification portal</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Tabs value={loginMethod} onValueChange={(v) => { setLoginMethod(v as "wallet" | "email"); setError(""); }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="wallet" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Wallet Login
                  </TabsTrigger>
                  <TabsTrigger value="email" className="gap-2">
                    <UserCheck className="h-4 w-4" />
                    Email Login
                  </TabsTrigger>
                </TabsList>

                {/* WALLET LOGIN - Primary method, uses blockchain as source of truth */}
                <TabsContent value="wallet" className="space-y-4 mt-4">
                  <Alert className="border-purple-500/30 bg-purple-500/5">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <AlertDescription className="text-sm">
                      <strong>Recommended:</strong> Connect your MetaMask wallet to verify your verifier status directly on the blockchain. No password required.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {!isConnected ? (
                      <div className="text-center space-y-4 py-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                          <Wallet className="h-8 w-8 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Connect Your Wallet</h3>
                          <p className="text-sm text-muted-foreground">
                            Your wallet must be authorized as a verifier on the smart contract
                          </p>
                        </div>
                        <Button onClick={connect} size="lg" className="bg-purple-600 hover:bg-purple-700">
                          <Wallet className="mr-2 h-5 w-5" />
                          Connect MetaMask
                        </Button>
                      </div>
                    ) : !isCorrectChain ? (
                      <div className="text-center space-y-4 py-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <AlertCircle className="h-8 w-8 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Wrong Network</h3>
                          <p className="text-sm text-muted-foreground">
                            Please switch to Base network to continue
                          </p>
                        </div>
                        <Button onClick={switchChain} size="lg" variant="outline" className="bg-transparent">
                          Switch to Base
                        </Button>
                      </div>
                    ) : requiresUniversitySelection ? (
                      <div className="space-y-4 py-6">
                        <Alert className="border-blue-500/30 bg-blue-500/5">
                          <Info className="h-4 w-4 text-blue-500" />
                          <AlertDescription className="text-sm">
                            Your wallet is authorized for multiple universities. Please select which university you want to access.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="university-select">Select University</Label>
                          <Select
                            value={selectedUniversityId?.toString() || ""}
                            onValueChange={(value) => setSelectedUniversityId(Number(value))}
                          >
                            <SelectTrigger id="university-select">
                              <SelectValue placeholder="Choose a university..." />
                            </SelectTrigger>
                            <SelectContent>
                              {authorizedUniversities.map((uni) => (
                                <SelectItem key={uni.id} value={uni.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <span>{uni.nameEn}</span>
                                    {uni.nameAr && (
                                      <span className="text-muted-foreground">({uni.nameAr})</span>
                                    )}
                                    {!uni.isActive && (
                                      <span className="text-xs text-amber-500">(Inactive)</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={handleUniversitySelection} 
                          size="lg" 
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          disabled={isLoading || !selectedUniversityId}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Logging in...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-5 w-5" />
                              Continue to Dashboard
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setRequiresUniversitySelection(false)
                            setAuthorizedUniversities([])
                            setSelectedUniversityId(null)
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-full"
                        >
                          Back
                        </Button>
                      </div>
                    ) : (
                      <WalletLoginButton
                        onWalletLogin={handleWalletLogin}
                        role="Verifier"
                        disabled={isLoading}
                      />
                    )}
                  </div>
                </TabsContent>

                {/* EMAIL LOGIN - Database fallback */}
                <TabsContent value="email" className="space-y-4 mt-4">
                  <Alert className="border-border bg-muted/30">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Email login requires database access. If unavailable, use Wallet Login.
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="verifier@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          className="bg-background/50 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <label
                        htmlFor="remember"
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Remember me for 30 days
                      </label>
                    </div>

                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Sign In with Email
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Demo Credentials */}
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Demo Access</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-500 mb-3">
                    <Info className="h-4 w-4" />
                    Demo Credentials
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div>
                        <span className="text-xs text-muted-foreground">Email:</span>
                        <p className="text-sm font-mono">verifier@rak-university.edu</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("verifier@rak-university.edu", "email")}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {copiedField === "email" ? <Check className="h-4 w-4 text-purple-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div>
                        <span className="text-xs text-muted-foreground">Password:</span>
                        <p className="text-sm font-mono">verifier123</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("verifier123", "password")}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {copiedField === "password" ? <Check className="h-4 w-4 text-purple-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3 bg-transparent"
                    onClick={fillDemoCredentials}
                  >
                    Fill Demo Credentials
                  </Button>
                </div>
              </div>

              {/* Links */}
              <div className="text-center space-y-2 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Not authorized as a verifier?{" "}
                  <Link href="/docs/verification" className="text-primary hover:underline">
                    Learn how to become one
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  University Admin?{" "}
                  <Link href="/university/login" className="text-primary hover:underline">
                    Login here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
