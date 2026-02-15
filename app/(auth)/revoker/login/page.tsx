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
import { 
  FileX, 
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
  AlertTriangle,
  History,
  FileSearch,
  Shield,
  CheckCircle2,
} from "lucide-react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { WalletLoginButton } from "@/components/auth/wallet-login-button"

export default function RevokerLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loginMethod, setLoginMethod] = useState<"wallet" | "email">("wallet")
  const router = useRouter()
  
  // Handle wallet login
  const handleWalletLogin = async (walletAddress: string) => {
    setIsLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/auth/revoker/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          loginMethod: "wallet",
          walletAddress: walletAddress 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Wallet not authorized as revoker")
      }

      localStorage.setItem("revoker_session", JSON.stringify(data.revoker))
      router.push("/revoker")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      throw err // Re-throw so WalletLoginButton can handle it
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/revoker/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, loginMethod: "email" }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 503) {
          setError("Database unavailable. Please use Wallet Login instead.")
          setLoginMethod("wallet")
          return
        }
        throw new Error(data.error || "Login failed")
      }

      localStorage.setItem("revoker_session", JSON.stringify(data.revoker))
      router.push("/revoker")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail("revoker@rak-university.edu")
    setPassword("revoker123")
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleLogin = (e: React.FormEvent) => {
    if (loginMethod === "wallet") {
      handleWalletLogin()
    } else {
      handleEmailLogin(e)
    }
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
                <div className="p-3 rounded-full bg-orange-500/10">
                  <FileX className="h-8 w-8 text-orange-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Degree Revoker Portal</h1>
                  <p className="text-muted-foreground">Certificate Revocation</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                As an authorized Degree Revoker, you have the critical responsibility of invalidating 
                fraudulent or erroneous degree certificates. This action is permanent and publicly 
                visible on the blockchain.
              </p>
            </div>

            {/* Warning */}
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-sm">
                <strong className="text-red-500">Critical Role:</strong> Degree revocation is a serious action 
                that permanently invalidates a credential. This cannot be undone. Use this power responsibly 
                and only when absolutely necessary.
              </AlertDescription>
            </Alert>

            {/* Capabilities */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Revoker Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-orange-500/10">
                    <FileX className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Revoke Degrees</p>
                    <p className="text-xs text-muted-foreground">Permanently invalidate fraudulent certificates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-orange-500/10">
                    <FileSearch className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Verify Degrees</p>
                    <p className="text-xs text-muted-foreground">Check authenticity before taking action</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-orange-500/10">
                    <History className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Revocation History</p>
                    <p className="text-xs text-muted-foreground">View all revocations you have performed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-orange-500/10">
                    <Shield className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Audit Trail</p>
                    <p className="text-xs text-muted-foreground">Complete record of all revocation activities</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Notice */}
            <Alert className="border-orange-500/30 bg-orange-500/10">
              <Wallet className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-sm">
                <strong className="text-orange-500">Wallet Required:</strong> After logging in, you must connect 
                your MetaMask wallet. Your wallet must be authorized as a revoker for your university on the 
                smart contract. Each revocation requires your wallet signature.
              </AlertDescription>
            </Alert>

            {/* When to Revoke */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">When to Revoke a Degree</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">&#8226;</span>
                    Degree was issued fraudulently or by mistake
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">&#8226;</span>
                    Student's academic record was found to be falsified
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">&#8226;</span>
                    Degree requirements were not actually fulfilled
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">&#8226;</span>
                    Court order or legal requirement to invalidate
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
                <li>All revocations are permanently recorded on the blockchain</li>
                <li>You may be required to provide justification for revocations</li>
              </ul>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl">Revoker Sign In</CardTitle>
              <CardDescription>Enter your credentials to access the revocation portal</CardDescription>
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
                    <FileX className="h-4 w-4" />
                    Email Login
                  </TabsTrigger>
                </TabsList>

                {/* WALLET LOGIN - Primary method */}
                <TabsContent value="wallet" className="space-y-4 mt-4">
                  <Alert className="border-orange-500/30 bg-orange-500/5">
                    <Shield className="h-4 w-4 text-orange-500" />
                    <AlertDescription className="text-sm">
                      <strong>Recommended:</strong> Connect your MetaMask wallet to verify your revoker status directly on the blockchain. No password required.
                    </AlertDescription>
                  </Alert>

                  <WalletLoginButton
                    onWalletLogin={handleWalletLogin}
                    role="Revoker"
                    disabled={isLoading}
                  />
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
                        placeholder="revoker@university.edu"
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

                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <FileX className="mr-2 h-4 w-4" />
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

                <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-500 mb-3">
                    <Info className="h-4 w-4" />
                    Demo Credentials
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div>
                        <span className="text-xs text-muted-foreground">Email:</span>
                        <p className="text-sm font-mono">revoker@rak-university.edu</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("revoker@rak-university.edu", "email")}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {copiedField === "email" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div>
                        <span className="text-xs text-muted-foreground">Password:</span>
                        <p className="text-sm font-mono">revoker123</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("revoker123", "password")}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {copiedField === "password" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
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
                  Not authorized as a revoker?{" "}
                  <Link href="/docs/revoking-degrees" className="text-primary hover:underline">
                    Learn about the process
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
