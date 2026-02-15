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
  Building2,
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
  UserPlus,
  FileSignature,
  BarChart3,
  Settings,
} from "lucide-react"
import { WalletLoginButton } from "@/components/auth/wallet-login-button"

export default function UniversityLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loginMethod, setLoginMethod] = useState<"email" | "wallet">("email")
  const [emailTouched, setEmailTouched] = useState(false)

  const { universityUser, isLoading: authLoading, refreshSession, universityLogin } = useAuth()

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const emailError = emailTouched && email.trim() && !emailValid
  const canSubmitEmail = email.trim() && password && !emailError
  const router = useRouter()

  // Redirect if already logged in as university
  useEffect(() => {
    if (!authLoading && universityUser) {
      router.replace("/university")
    }
  }, [authLoading, universityUser, router])

  const LOGIN_TIMEOUT_MS = 35_000 // Match backend timeouts; show error if exceeded

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      await Promise.race([
        universityLogin(email, password),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Login timed out. Please try again.")), LOGIN_TIMEOUT_MS)
        ),
      ])
      router.replace("/university")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials."
      setError(msg || "Invalid email or password. Try again or sign in with your admin wallet.")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletLogin = async (walletAddress: string) => {
    setIsLoading(true)
    setError("")
    const aborter = new AbortController()
    const timeoutId = setTimeout(() => aborter.abort(), LOGIN_TIMEOUT_MS)
    try {
      const res = await fetch("/api/auth/university/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginMethod: "wallet", walletAddress }),
        credentials: "include",
        signal: aborter.signal,
      })
      clearTimeout(timeoutId)
      const text = await res.text()
      let data: { error?: string } = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        setError("Server returned an invalid response. Please try again.")
        return
      }
      if (!res.ok) throw new Error(data.error || "Wallet not authorized as university admin")
      await refreshSession()
      await new Promise((r) => setTimeout(r, 300))
      router.replace("/university")
    } catch (err: any) {
      clearTimeout(timeoutId)
      const isAbort = err?.name === "AbortError"
      const msg = isAbort
        ? "Login took too long. Blockchain verification may be slow—please try again."
        : err.message || "Wallet login failed. Your wallet must be the university admin on the blockchain."
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail("rak@university.edu")
    setPassword("admin")
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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
          {/* Left – info (super-admin style) */}
          <div className="space-y-6 lg:sticky lg:top-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">University Admin Portal</h1>
                  <p className="text-muted-foreground">Institution Management</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                As a University Admin you manage issuers, revokers, degrees, and subscription for your institution. 
                Sign in with your university email or with the wallet registered as your institution’s admin on the blockchain.
              </p>
            </div>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">What you can do</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Manage issuers & revokers</p>
                    <p className="text-xs text-muted-foreground">Add or remove degree issuers and revokers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <FileSignature className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">View all degrees</p>
                    <p className="text-xs text-muted-foreground">See certificates issued by your institution</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Analytics & reports</p>
                    <p className="text-xs text-muted-foreground">Issuance stats and trends</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <Settings className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Subscription</p>
                    <p className="text-xs text-muted-foreground">Manage plan and billing</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="border-orange-500/30 bg-orange-500/10">
              <Wallet className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-sm">
                <strong className="text-orange-500">Wallet:</strong> For on-chain actions after login, connect the 
                wallet that is registered as your university’s admin on the smart contract.
              </AlertDescription>
            </Alert>

            <div className="p-4 rounded-lg border border-border/50 bg-card/30">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Security</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Session expires after 24 hours of inactivity</li>
                <li>Actions are logged</li>
                <li>Do not share credentials</li>
              </ul>
            </div>
          </div>

          {/* Right – login form */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Use your university credentials or admin wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 p-1 rounded-lg bg-muted">
                <button
                  type="button"
                  onClick={() => { setLoginMethod("email"); setError("") }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    loginMethod === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod("wallet"); setError("") }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    loginMethod === "wallet" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                  Wallet
                </button>
              </div>

              {loginMethod === "wallet" ? (
                <>
                  <WalletLoginButton
                    onWalletLogin={handleWalletLogin}
                    role="University Admin"
                    disabled={isLoading}
                    onError={setError}
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    Wallet verification can take 15–30 seconds. If it times out, try again.
                  </p>
                </>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="university-email">University email</Label>
                    <Input
                      id="university-email"
                      type="email"
                      placeholder="admin@university.edu"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      onBlur={() => setEmailTouched(true)}
                      required
                      autoComplete="email"
                      aria-invalid={emailError}
                      aria-describedby={emailError ? "email-hint" : undefined}
                      className={`bg-background/50 ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {emailError && (
                      <p id="email-hint" className="text-xs text-destructive">
                        Enter a valid email address (e.g. name@university.edu)
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="university-password">Password</Label>
                      <Link href="/forgot-password" className="text-xs text-primary hover:underline" aria-label="Forgot password">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="university-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        required
                        minLength={6}
                        autoComplete="current-password"
                        className="bg-background/50 pr-10"
                        aria-label="Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(c) => setRememberMe(!!c)}
                    />
                    <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                      Remember me for 30 days
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">Use the email and password set for your institution’s admin account.</p>
                  <Button type="submit" className="w-full" disabled={isLoading || !canSubmitEmail} aria-busy={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Sign in to University Portal
                      </>
                    )}
                  </Button>
                </form>
              )}

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Demo</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary mb-3">
                    <Info className="h-4 w-4" />
                    Demo (RAK University)
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div>
                        <span className="text-xs text-muted-foreground">Email:</span>
                        <p className="text-sm font-mono">rak@university.edu</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("rak@university.edu", "email")}
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
                  <Button type="button" variant="outline" size="sm" className="w-full mt-3 bg-transparent" onClick={fillDemoCredentials}>
                    Fill demo credentials
                  </Button>
                </div>
              </div>

              <div className="text-center space-y-2 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  New institution? <Link href="/subscribe" className="text-primary hover:underline">Register</Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  Super Admin? <Link href="/admin/login" className="text-primary hover:underline">Admin login</Link>
                </p>
                <p className="text-xs text-muted-foreground">
                  Can’t sign in? Use the wallet registered as your university admin, or contact your platform administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
