"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Shield, 
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
  Server,
  Users,
  BarChart3
} from "lucide-react"
import { WalletLoginButton } from "@/components/auth/wallet-login-button"
import { useWeb3 } from "@/components/providers/web3-provider"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loginMethod, setLoginMethod] = useState<"email" | "wallet">("email")
  const { login, user, isLoading: authLoading, refreshSession } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/admin")
    }
  }, [authLoading, user, router])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(email, password)
      router.push("/admin")
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please check your email and password.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletLogin = async (walletAddress: string) => {
    console.log("[AdminLogin] Starting wallet login with address:", walletAddress)
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          loginMethod: "wallet",
          walletAddress: walletAddress 
        }),
      })

      console.log("[AdminLogin] Response status:", response.status)
      const data = await response.json()
      console.log("[AdminLogin] Response data:", data)

      if (!response.ok) {
        const errorMsg = data.error || data.message || "Wallet not authorized as admin"
        console.error("[AdminLogin] Login failed:", errorMsg)
        throw new Error(errorMsg)
      }

      // Session is set via HTTP-only cookie by the API
      console.log("[AdminLogin] ✅ Login successful! Session set via cookie.")
      console.log("[AdminLogin] Response data:", data)
      
      // Wait a moment for cookie to be set
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Manually trigger session refresh in AuthProvider
      console.log("[AdminLogin] Refreshing session in AuthProvider...")
      try {
        await refreshSession()
        console.log("[AdminLogin] ✅ Session refreshed successfully")
      } catch (refreshError) {
        console.warn("[AdminLogin] Session refresh failed (non-critical):", refreshError)
      }
      
      // Wait a bit more to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Redirect to admin dashboard
      console.log("[AdminLogin] Redirecting to /admin")
      router.push("/admin")
    } catch (err: any) {
      console.error("[AdminLogin] Error:", err)
      const errorMsg = err.message || "Wallet login failed. Please check if your wallet is the contract owner."
      setError(errorMsg)
      throw err // Re-throw so WalletLoginButton can handle it
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail("admin@university-protocol.com")
    setPassword("admin")
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
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
                <div className="p-3 rounded-full bg-red-500/10">
                  <Shield className="h-8 w-8 text-red-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Super Admin Portal</h1>
                  <p className="text-muted-foreground">Platform Administration</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                The Super Admin role has full access to manage the entire EdChain platform, 
                including all universities, users, and system configurations.
              </p>
            </div>

            {/* Capabilities */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Admin Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <Server className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Platform Management</p>
                    <p className="text-xs text-muted-foreground">Configure system settings and smart contract parameters</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">University Management</p>
                    <p className="text-xs text-muted-foreground">Add, edit, activate or deactivate universities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Analytics & Reports</p>
                    <p className="text-xs text-muted-foreground">View platform-wide statistics and reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Notice */}
            <Alert className="border-orange-500/30 bg-orange-500/10">
              <Wallet className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-sm">
                <strong className="text-orange-500">Wallet Required:</strong> After logging in, you will need to 
                connect your MetaMask wallet to perform blockchain transactions. Your wallet must be authorized 
                as a platform admin on the smart contract.
              </AlertDescription>
            </Alert>

            {/* Security Notice */}
            <div className="p-4 rounded-lg border border-border/50 bg-card/30">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Security Information</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Your session will expire after 24 hours of inactivity</li>
                <li>All actions are logged for security purposes</li>
                <li>Use a strong password and never share your credentials</li>
              </ul>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>Enter your admin credentials to continue</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && loginMethod === "email" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Login Method Tabs */}
              <div className="flex gap-2 p-1 rounded-lg bg-muted">
                <button
                  type="button"
                  onClick={() => setLoginMethod("email")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    loginMethod === "email"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Email Login
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("wallet")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    loginMethod === "wallet"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Wallet className="inline h-4 w-4 mr-2" />
                  Wallet Login
                </button>
              </div>

              {loginMethod === "wallet" ? (
                <WalletLoginButton
                  onWalletLogin={handleWalletLogin}
                  role="Super Admin"
                  disabled={isLoading}
                />
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@university-protocol.com"
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Sign In as Admin
                    </>
                  )}
                </Button>
              </form>
              )}

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

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary mb-3">
                    <Info className="h-4 w-4" />
                    Demo Credentials
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div>
                        <span className="text-xs text-muted-foreground">Email:</span>
                        <p className="text-sm font-mono">admin@university-protocol.com</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("admin@university-protocol.com", "email")}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {copiedField === "email" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div>
                        <span className="text-xs text-muted-foreground">Password:</span>
                        <p className="text-sm font-mono">admin</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("admin", "password")}
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
                  University Admin?{" "}
                  <Link href="/university/login" className="text-primary hover:underline">
                    Login here
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  Need help?{" "}
                  <Link href="/docs/platform-admin-guide" className="text-primary hover:underline">
                    View admin guide
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
