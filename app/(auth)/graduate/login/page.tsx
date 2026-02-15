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
import { 
  GraduationCap, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Info, 
  Eye, 
  EyeOff,
  Copy,
  Check,
  Wallet,
  FileCheck,
  Share2,
  Download,
  Link as LinkIcon,
  QrCode
} from "lucide-react"
import { WalletLoginButton } from "@/components/auth/wallet-login-button"

export default function GraduateLoginPage() {
  const [walletOrEmail, setWalletOrEmail] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [loginMethod, setLoginMethod] = useState<"wallet" | "email">("wallet")
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const router = useRouter()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/graduate/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: walletOrEmail, password, loginMethod: "email" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      localStorage.setItem("graduate_session", JSON.stringify(data.graduate))
      router.push("/graduate/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletLogin = async (walletAddress: string) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/graduate/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          loginMethod: "wallet",
          walletAddress: walletAddress 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Wallet not authorized or no degrees found")
      }

      localStorage.setItem("graduate_session", JSON.stringify(data.graduate))
      router.push("/graduate/dashboard")
    } catch (err: any) {
      setError(err.message || "Wallet login failed")
      throw err // Re-throw so WalletLoginButton can handle it
    } finally {
      setIsLoading(false)
    }
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
                <div className="p-3 rounded-full bg-blue-500/10">
                  <GraduationCap className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Graduate Portal</h1>
                  <p className="text-muted-foreground">Access Your Credentials</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                Welcome, graduate! Access your blockchain-verified academic credentials, share them with 
                employers, and download official certificates. Your degrees are permanently secured on 
                the blockchain.
              </p>
            </div>

            {/* Capabilities */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">What You Can Do</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-blue-500/10">
                    <FileCheck className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">View Your Degrees</p>
                    <p className="text-xs text-muted-foreground">See all credentials issued to your wallet</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-blue-500/10">
                    <Share2 className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Share Credentials</p>
                    <p className="text-xs text-muted-foreground">Generate shareable links for employers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-blue-500/10">
                    <Download className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Download Certificates</p>
                    <p className="text-xs text-muted-foreground">Get official PDF versions of your degrees</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-blue-500/10">
                    <QrCode className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">QR Code Verification</p>
                    <p className="text-xs text-muted-foreground">Generate QR codes for instant verification</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Info */}
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <Wallet className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm">
                <strong className="text-blue-500">Wallet Connection:</strong> Your degrees are linked to your 
                Ethereum wallet address. Connect the same wallet that received your degree NFT to view and 
                manage your credentials.
              </AlertDescription>
            </Alert>

            {/* How It Works */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-medium">1</span>
                    <div>
                      <p className="font-medium">Connect Your Wallet</p>
                      <p className="text-muted-foreground text-xs">Use MetaMask to connect the wallet that holds your degree NFT</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-medium">2</span>
                    <div>
                      <p className="font-medium">View Your Credentials</p>
                      <p className="text-muted-foreground text-xs">See all degrees issued to your wallet address</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-medium">3</span>
                    <div>
                      <p className="font-medium">Share with Employers</p>
                      <p className="text-muted-foreground text-xs">Generate verification links or QR codes</p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Don't Have a Degree */}
            <div className="p-4 rounded-lg border border-border/50 bg-card/30">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Verify a Degree</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Are you an employer looking to verify a graduate's credentials? Use our public 
                verification portal - no account required.
              </p>
              <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                <Link href="/verify">Go to Verification Portal</Link>
              </Button>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl">Access Your Credentials</CardTitle>
              <CardDescription>Connect your wallet or sign in to view your degrees</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Login Method Toggle */}
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setLoginMethod("wallet")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    loginMethod === "wallet" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Wallet className="inline-block h-4 w-4 mr-2" />
                  Wallet
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("email")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    loginMethod === "email" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Email
                </button>
              </div>

              {loginMethod === "wallet" ? (
                <div className="space-y-4">
                  <Alert className="border-blue-500/30 bg-blue-500/5">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-sm">
                      Connect the wallet that received your degree NFT to view your credentials
                    </AlertDescription>
                  </Alert>
                  
                  <WalletLoginButton
                    onWalletLogin={handleWalletLogin}
                    role="Graduate"
                    disabled={isLoading}
                  />

                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground text-center">
                      Don't have MetaMask?{" "}
                      <a 
                        href="https://metamask.io/download/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Download here
                      </a>
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={walletOrEmail}
                      onChange={(e) => setWalletOrEmail(e.target.value)}
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

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <GraduationCap className="mr-2 h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Quick Verify */}
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-500 mb-2">
                    <Info className="h-4 w-4" />
                    Quick Verification
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Know your degree token ID? Enter it directly to view your credential.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter Token ID (e.g., 1234)"
                      className="bg-background/50 text-sm"
                    />
                    <Button variant="outline" size="sm">
                      Verify
                    </Button>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="text-center space-y-2 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/graduate/register" className="text-primary hover:underline">
                    Register here
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  Need help?{" "}
                  <Link href="/docs/graduate-guide" className="text-primary hover:underline">
                    View graduate guide
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
