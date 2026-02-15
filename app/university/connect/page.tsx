"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useWeb3 } from "@/components/providers/web3-provider"
import {
  Wallet,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Building2,
  Shield,
  Loader2,
  Download,
  ExternalLink,
  Key,
  Lock,
  FileText,
  ArrowRight,
  RefreshCw,
  Chrome,
  Globe,
  Smartphone,
  Monitor,
} from "lucide-react"
import { CHAIN_ID } from "@/lib/contracts/abi"

interface UniversitySession {
  id: number
  name: string
  email?: string
  admin_email?: string
  wallet_address?: string | null
  walletAddress?: string | null
  status: string
}

type WizardStep =
  | "detect"
  | "choose-platform"
  | "install-extension"
  | "create-wallet"
  | "set-password"
  | "recovery-phrase"
  | "verify-phrase"
  | "complete"
  | "connect"

const METAMASK_LINKS = {
  chrome: "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
  firefox: "https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/",
  edge: "https://microsoftedge.microsoft.com/addons/detail/metamask/ejbalbakoplchlghecdalmeeeajnimhm",
  brave: "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
  opera: "https://addons.opera.com/en/extensions/details/metamask-10/",
  mobile: "https://metamask.io/download/",
  main: "https://metamask.io/download/",
}

export default function UniversityConnectPage() {
  const [university, setUniversity] = useState<UniversitySession | null>(null)
  const [activatedWallet, setActivatedWallet] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [hasMetaMask, setHasMetaMask] = useState<boolean | null>(null)
  const [wizardStep, setWizardStep] = useState<WizardStep>("detect")
  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null)
  const [showRecoveryTips, setShowRecoveryTips] = useState(false)
  const router = useRouter()
  const { address, isConnected, chainId, connect, switchChain, isConnecting } = useWeb3()

  // Detect browser
  const detectBrowser = (): string => {
    if (typeof window === "undefined") return "chrome"
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes("edg/")) return "edge"
    if (userAgent.includes("brave")) return "brave"
    if (userAgent.includes("opera") || userAgent.includes("opr/")) return "opera"
    if (userAgent.includes("firefox")) return "firefox"
    if (userAgent.includes("chrome")) return "chrome"
    if (/iphone|ipad|android/i.test(userAgent)) return "mobile"
    return "chrome"
  }

  useEffect(() => {
    const session = localStorage.getItem("university_session")
    if (!session) {
      router.push("/university/login")
      return
    }
    try {
      const parsed = JSON.parse(session)
      console.log("[UniversityConnect] Loaded session:", parsed)
      
      // Ensure email is in session - fetch from API if missing
      if (!parsed.email && !parsed.admin_email && parsed.id) {
        console.log("[UniversityConnect] Email missing from session, fetching from API...")
        fetch(`/api/admin/universities/${parsed.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.university) {
              const email = data.university.admin_email || data.university.email
              if (email) {
                const updatedSession = { ...parsed, email, admin_email: email }
                setUniversity(updatedSession)
                localStorage.setItem("university_session", JSON.stringify(updatedSession))
                console.log("[UniversityConnect] ✅ Updated session with email:", email)
              } else {
                setUniversity(parsed)
              }
              
              // Set activated wallet
              if (data.university.wallet_address || data.university.admin_wallet) {
                setActivatedWallet((data.university.admin_wallet || data.university.wallet_address)?.toLowerCase())
              }
            } else {
              setUniversity(parsed)
            }
          })
          .catch((err) => {
            console.error("[UniversityConnect] Failed to fetch university data:", err)
            setUniversity(parsed)
          })
      } else {
        setUniversity(parsed)
        
        // Fetch activated wallet from database
        if (parsed.id) {
          fetch(`/api/admin/universities/${parsed.id}`)
            .then(res => res.json())
            .then(data => {
              if (data.university?.wallet_address || data.university?.admin_wallet) {
                setActivatedWallet((data.university.admin_wallet || data.university.wallet_address)?.toLowerCase())
              }
            })
            .catch(() => {})
        }
      }
    } catch (err) {
      console.error("[UniversityConnect] Failed to parse session:", err)
      router.push("/university/login")
    }

    const checkMetaMask = () => {
      if (typeof window !== "undefined") {
        const detected = !!window.ethereum
        setHasMetaMask(detected)
        if (detected) {
          setWizardStep("connect")
        }
      }
    }
    checkMetaMask()
    setSelectedBrowser(detectBrowser())

    const interval = setInterval(checkMetaMask, 2000)
    return () => clearInterval(interval)
  }, [router])

  const isWrongNetwork = chainId !== CHAIN_ID

  const handleLinkWallet = async () => {
    if (!address || !university) {
      console.error("[UniversityConnect] Missing address or university:", { address, university })
      setError("Please connect your wallet first")
      return
    }

    // Get email from university session - try multiple possible field names
    const universityEmail = university.email || (university as any).admin_email || ""
    
    if (!universityEmail) {
      console.error("[UniversityConnect] University session missing email. Session data:", university)
      // Try to fetch email from API using university ID
      try {
        const uniResponse = await fetch(`/api/admin/universities/${university.id}`)
        if (uniResponse.ok) {
          const uniData = await uniResponse.json()
          const fetchedEmail = uniData.university?.admin_email || uniData.university?.email
          if (fetchedEmail) {
            console.log("[UniversityConnect] Fetched email from API:", fetchedEmail)
            // Update session with email
            const updatedUni = { ...university, email: fetchedEmail, admin_email: fetchedEmail }
            setUniversity(updatedUni)
            localStorage.setItem("university_session", JSON.stringify(updatedUni))
            // Retry with fetched email
            return handleLinkWallet()
          }
        }
      } catch (fetchError) {
        console.error("[UniversityConnect] Failed to fetch email:", fetchError)
      }
      
      setError("University session is missing email. Please log in again with your email and password.")
      return
    }

    console.log("[UniversityConnect] Starting wallet link for:", { email: universityEmail, address, universityId: university.id })
    setIsLinking(true)
    setError("")
    setSuccess("")

    try {
      // ✅ Use verify-wallet endpoint which enforces wallet matching
      const response = await fetch("/api/auth/university/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: universityEmail,
          connectedWalletAddress: address,
        }),
      })

      console.log("[UniversityConnect] Response status:", response.status)
      const data = await response.json()
      console.log("[UniversityConnect] Response data:", data)

      if (!response.ok) {
        // If wallet doesn't match, show specific error
        if (data.activatedWalletAddress && data.connectedWalletAddress) {
          const errorMsg = `Wallet mismatch! Connected: ${data.connectedWalletAddress.slice(0, 6)}...${data.connectedWalletAddress.slice(-4)}, Required: ${data.activatedWalletAddress.slice(0, 6)}...${data.activatedWalletAddress.slice(-4)}`
          console.error("[UniversityConnect] Wallet mismatch:", errorMsg)
          throw new Error(errorMsg)
        }
        const errorMsg = data.error || "Failed to verify wallet"
        console.error("[UniversityConnect] Verification failed:", errorMsg)
        throw new Error(errorMsg)
      }

      // Update session with verified wallet
      const updatedUniversity = { ...university, wallet_address: address }
      localStorage.setItem("university_session", JSON.stringify(updatedUniversity))
      setUniversity(updatedUniversity)
      setSuccess("Wallet verified successfully! Redirecting to dashboard...")
      console.log("[UniversityConnect] Wallet verified, redirecting...")

      setTimeout(() => {
        router.push("/university")
      }, 2000)
    } catch (err) {
      console.error("[UniversityConnect] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to verify wallet")
    } finally {
      setIsLinking(false)
    }
  }

  const handleContinueToDashboard = () => {
    router.push("/university")
  }

  const getStepProgress = (): number => {
    const steps: WizardStep[] = [
      "detect",
      "choose-platform",
      "install-extension",
      "create-wallet",
      "set-password",
      "recovery-phrase",
      "verify-phrase",
      "complete",
      "connect",
    ]
    const currentIndex = steps.indexOf(wizardStep)
    return Math.round(((currentIndex + 1) / steps.length) * 100)
  }

  const getBrowserIcon = (browser: string) => {
    switch (browser) {
      case "chrome":
      case "brave":
        return <Chrome className="h-5 w-5" />
      case "mobile":
        return <Smartphone className="h-5 w-5" />
      default:
        return <Globe className="h-5 w-5" />
    }
  }

  const getBrowserName = (browser: string) => {
    const names: Record<string, string> = {
      chrome: "Chrome",
      firefox: "Firefox",
      edge: "Edge",
      brave: "Brave",
      opera: "Opera",
      mobile: "Mobile App",
    }
    return names[browser] || "Browser"
  }

  if (!university) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const walletAlreadyLinked = university.wallet_address && university.wallet_address.length > 0

  // Render wizard step content
  const renderWizardContent = () => {
    // If wallet already linked, show success
    if (walletAlreadyLinked) {
      return (
        <div className="space-y-4">
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              Wallet already linked: {university.wallet_address?.slice(0, 6)}...
              {university.wallet_address?.slice(-4)}
            </AlertDescription>
          </Alert>
          <Button onClick={handleContinueToDashboard} className="w-full">
            Continue to Dashboard
          </Button>
        </div>
      )
    }

    // If MetaMask detected and connected
    if (hasMetaMask && isConnected && !isWrongNetwork) {
      const connectedWallet = address?.toLowerCase() || ""
      const walletMatches = !activatedWallet || connectedWallet === activatedWallet.toLowerCase()
      
      return (
        <div className="space-y-4">
          {activatedWallet && (
            <Alert className={walletMatches ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}>
              {walletMatches ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <AlertDescription>
                {walletMatches ? (
                  <span className="text-green-500">
                    ✅ Connected wallet matches your activated admin wallet
                  </span>
                ) : (
                  <div>
                    <p className="text-amber-500 mb-2">
                      ⚠️ Wrong wallet connected. You must connect your activated admin wallet.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Required: {activatedWallet.slice(0, 6)}...{activatedWallet.slice(-4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Connected: {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Wallet Connected</span>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              {address?.slice(0, 10)}...{address?.slice(-8)}
            </p>
          </div>
          <Button 
            onClick={handleLinkWallet} 
            className="w-full gap-2" 
            disabled={isLinking || (activatedWallet && !walletMatches)}
            variant={activatedWallet && !walletMatches ? "destructive" : "default"}
          >
            {isLinking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                {activatedWallet && !walletMatches ? "Wrong Wallet - Connect Correct One" : "Verify & Link Wallet"}
              </>
            )}
          </Button>
          {activatedWallet && !walletMatches && (
            <p className="text-xs text-muted-foreground text-center">
              Please disconnect and connect the wallet: {activatedWallet.slice(0, 6)}...{activatedWallet.slice(-4)}
            </p>
          )}
        </div>
      )
    }

    // If MetaMask detected but wrong network
    if (hasMetaMask && isConnected && isWrongNetwork) {
      return (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Please switch to Base Mainnet (Chain ID: {CHAIN_ID})</AlertDescription>
          </Alert>
          <Button onClick={switchChain} className="w-full">
            Switch to Base Mainnet
          </Button>
        </div>
      )
    }

    // If MetaMask detected but not connected
    if (hasMetaMask && !isConnected) {
      return (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="font-semibold text-lg">MetaMask Detected!</h3>
            <p className="text-sm text-muted-foreground">Click below to connect your wallet</p>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button 
            onClick={async () => {
              console.log("[UniversityConnect] Connect MetaMask button clicked")
              setError("")
              try {
                await connect()
                console.log("[UniversityConnect] Wallet connected successfully")
              } catch (err: any) {
                console.error("[UniversityConnect] Failed to connect:", err)
                // Don't show error if user rejected
                if (err?.code !== 4001 && err?.code !== "ACTION_REJECTED") {
                  setError(err?.message || "Failed to connect wallet. Please try again.")
                }
              }
            }} 
            className="w-full gap-2" 
            size="lg"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                Connect MetaMask
              </>
            )}
          </Button>
        </div>
      )
    }

    // Wizard steps for users without MetaMask
    switch (wizardStep) {
      case "detect":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="font-semibold text-lg">Set Up Your Wallet</h3>
              <p className="text-sm text-muted-foreground">
                You'll need a MetaMask wallet to manage certificates on the blockchain. Let's set one up in just a few
                minutes!
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Install MetaMask</p>
                  <p className="text-xs text-muted-foreground">Browser extension or mobile app</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Create Your Wallet</p>
                  <p className="text-xs text-muted-foreground">Set password & save recovery phrase</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Connect & Link</p>
                  <p className="text-xs text-muted-foreground">Link wallet to your university</p>
                </div>
              </div>
            </div>

            <Button onClick={() => setWizardStep("choose-platform")} className="w-full gap-2" size="lg">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )

      case "choose-platform":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Choose Your Platform</h3>
              <p className="text-sm text-muted-foreground">Select where you'd like to install MetaMask</p>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => {
                  setSelectedBrowser(detectBrowser())
                  setWizardStep("install-extension")
                }}
                className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Browser Extension</p>
                  <p className="text-sm text-muted-foreground">Chrome, Firefox, Edge, Brave</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>

              <button
                onClick={() => {
                  setSelectedBrowser("mobile")
                  setWizardStep("install-extension")
                }}
                className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Mobile App</p>
                  <p className="text-sm text-muted-foreground">iOS or Android</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>

            <Button variant="ghost" onClick={() => setWizardStep("detect")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        )

      case "install-extension":
        const installUrl = selectedBrowser
          ? METAMASK_LINKS[selectedBrowser as keyof typeof METAMASK_LINKS]
          : METAMASK_LINKS.main
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center">
                <Download className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="font-semibold text-lg">Install MetaMask</h3>
              <p className="text-sm text-muted-foreground">
                {selectedBrowser === "mobile"
                  ? "Download the MetaMask app from your app store"
                  : `Install the MetaMask extension for ${getBrowserName(selectedBrowser || "chrome")}`}
              </p>
            </div>

            <Button onClick={() => window.open(installUrl, "_blank")} className="w-full gap-2" size="lg">
              {getBrowserIcon(selectedBrowser || "chrome")}
              {selectedBrowser === "mobile"
                ? "Open App Store"
                : `Add to ${getBrowserName(selectedBrowser || "chrome")}`}
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                After clicking the button above:
              </h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Click "Add to {getBrowserName(selectedBrowser || "chrome")}" or "Install"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Confirm the installation when prompted</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Look for the fox icon in your browser toolbar</span>
                </li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setWizardStep("choose-platform")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setWizardStep("create-wallet")} className="flex-1">
                I've Installed It
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      case "create-wallet":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-semibold text-lg">Create Your Wallet</h3>
              <p className="text-sm text-muted-foreground">Open MetaMask and select "Create a new wallet"</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-500 shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm">Click the MetaMask icon</p>
                  <p className="text-xs text-muted-foreground">
                    Look for the fox icon in your browser toolbar or open the app
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-500 shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm">Click "Create a new wallet"</p>
                  <p className="text-xs text-muted-foreground">
                    If you already have a wallet, you can import it instead
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-500 shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium text-sm">Agree to terms</p>
                  <p className="text-xs text-muted-foreground">Review and accept MetaMask's terms of use</p>
                </div>
              </div>
            </div>

            <Alert className="border-blue-500/30 bg-blue-500/5">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs text-blue-500">
                MetaMask will guide you through the setup. Follow along with our instructions!
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setWizardStep("install-extension")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setWizardStep("set-password")} className="flex-1">
                Next Step
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      case "set-password":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center">
                <Lock className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="font-semibold text-lg">Create a Strong Password</h3>
              <p className="text-sm text-muted-foreground">This password protects your wallet on this device</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
              <h4 className="font-medium text-sm">Password Requirements:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  At least 8 characters long
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Mix of letters, numbers, and symbols
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Don't use personal information
                </li>
              </ul>
            </div>

            <Alert className="border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs text-amber-500">
                <strong>Important:</strong> MetaMask cannot recover this password. Store it securely!
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setWizardStep("create-wallet")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setWizardStep("recovery-phrase")} className="flex-1">
                Next Step
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      case "recovery-phrase":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <Key className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="font-semibold text-lg">Save Your Recovery Phrase</h3>
              <p className="text-sm text-muted-foreground">
                This is the MOST IMPORTANT step. Your recovery phrase is the only way to restore your wallet.
              </p>
            </div>

            <Alert variant="destructive" className="border-red-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>NEVER share your recovery phrase with anyone!</strong> Not even MetaMask support will ask for
                it.
              </AlertDescription>
            </Alert>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                How to save your recovery phrase:
              </h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>
                    <strong>Write it down</strong> on paper (not digital)
                  </span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>
                    <strong>Store in multiple secure locations</strong> (safe, safety deposit box)
                  </span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>
                    <strong>Never take a screenshot</strong> or store digitally
                  </span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>
                    <strong>Never share with anyone</strong> - it gives full access to your wallet
                  </span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowRecoveryTips(!showRecoveryTips)}
              className="w-full p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors flex items-center justify-between"
            >
              <span className="text-sm font-medium">Why is this so important?</span>
              <ArrowRight className={`h-4 w-4 transition-transform ${showRecoveryTips ? "rotate-90" : ""}`} />
            </button>

            {showRecoveryTips && (
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/30 text-sm text-muted-foreground space-y-2">
                <p>Your recovery phrase is like the master key to your wallet. If you:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Lose your device</li>
                  <li>Forget your password</li>
                  <li>Need to restore your wallet on a new device</li>
                </ul>
                <p className="font-medium text-amber-500">
                  Your recovery phrase is the ONLY way to get your wallet back!
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setWizardStep("set-password")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setWizardStep("verify-phrase")} className="flex-1">
                I've Saved It
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      case "verify-phrase":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg">Verify Your Phrase</h3>
              <p className="text-sm text-muted-foreground">
                MetaMask will ask you to confirm some words from your recovery phrase
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
              <p className="text-sm text-muted-foreground">
                This verification ensures you've correctly saved your recovery phrase. Select the correct words when
                prompted by MetaMask.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Click the words in the correct order</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">If you make a mistake, you can try again</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setWizardStep("recovery-phrase")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setWizardStep("complete")} className="flex-1">
                I've Verified
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      case "complete":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="font-semibold text-xl">Wallet Created!</h3>
              <p className="text-sm text-muted-foreground">Congratulations! Your MetaMask wallet is ready to use.</p>
            </div>

            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 space-y-3">
              <h4 className="font-medium text-sm text-green-500">What's next?</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-500 shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Click "Connect Wallet" below</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-500 shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Approve the connection in MetaMask</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-500 shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Link your wallet to {university.name}</span>
                </li>
              </ol>
            </div>

            <Button
              onClick={() => {
                window.location.reload()
              }}
              className="w-full gap-2"
              size="lg"
            >
              <RefreshCw className="h-5 w-5" />
              Connect My New Wallet
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              If MetaMask doesn't appear, click the fox icon in your browser toolbar
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            {!hasMetaMask && !walletAlreadyLinked && wizardStep !== "detect" && (
              <div className="space-y-2">
                <Progress value={getStepProgress()} className="h-1" />
                <p className="text-xs text-muted-foreground">Step {getStepProgress() / 12.5} of 8</p>
              </div>
            )}

            {(hasMetaMask || walletAlreadyLinked || wizardStep === "detect") && (
              <>
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Connect Wallet</CardTitle>
                  <CardDescription>Link your wallet to {university.name}</CardDescription>
                </div>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {(hasMetaMask || walletAlreadyLinked) && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{university.name}</p>
                    <p className="text-sm text-muted-foreground">{university.email}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-500">{success}</AlertDescription>
              </Alert>
            )}

            {renderWizardContent()}

            {(hasMetaMask || walletAlreadyLinked) && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Your wallet will be used to sign transactions for issuing and managing certificates
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
