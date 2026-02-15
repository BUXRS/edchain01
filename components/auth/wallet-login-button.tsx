"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWeb3 } from "@/components/providers/web3-provider"
import { Wallet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

interface WalletLoginButtonProps {
  onWalletLogin: (address: string) => Promise<void>
  role: string
  disabled?: boolean
  /** When set, login errors are reported here so the parent can show them (avoids duplicate alerts). */
  onError?: (message: string) => void
}

export function WalletLoginButton({ onWalletLogin, role, disabled, onError }: WalletLoginButtonProps) {
  const { address, isConnected, isConnecting, isCorrectChain, connect, switchChain } = useWeb3()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState("")

  const showError = (msg: string) => {
    if (onError) onError(msg)
    else setError(msg)
  }

  const handleConnectAndLogin = async () => {
    if (onError) onError("")
    setError("")
    
    try {
      // Step 1: Connect wallet if not connected
      if (!isConnected) {
        console.log("[WalletLoginButton] Wallet not connected, connecting...")
        await connect()
        return // Wait for wallet to connect, then user can click again
      }

      // Step 2: Check chain
      if (!isCorrectChain) {
        console.log("[WalletLoginButton] Wrong chain, switching...")
        await switchChain()
        return // Wait for chain switch, then user can click again
      }

      // Step 3: Login with wallet
      if (address) {
        console.log("[WalletLoginButton] Starting login with address:", address)
        setIsLoggingIn(true)
        try {
          await onWalletLogin(address)
          console.log("[WalletLoginButton] Login successful!")
        } catch (loginError: any) {
          console.error("[WalletLoginButton] Login error:", loginError)
          const msg = loginError?.message || "Login failed. Please check console for details."
          showError(msg)
          throw loginError // Re-throw to be caught by outer catch
        }
      } else {
        showError("No wallet address available. Please connect your wallet.")
      }
    } catch (err: any) {
      console.error("[WalletLoginButton] Error:", err)
      showError(err?.message || "Failed to connect wallet. Please try again.")
    } finally {
      setIsLoggingIn(false)
    }
  }

  const displayError = onError ? "" : error

  return (
    <div className="space-y-3">
      {displayError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{displayError}</AlertDescription>
        </Alert>
      )}

      {isConnected && isCorrectChain && address && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-sm">
            <strong className="text-green-500">Wallet Connected:</strong> {address.slice(0, 6)}...{address.slice(-4)}
          </AlertDescription>
        </Alert>
      )}

      {!isCorrectChain && isConnected && (
        <Alert className="border-orange-500/30 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-sm">
            Please switch to Base network to continue
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log("[WalletLoginButton] Button clicked!")
          handleConnectAndLogin()
        }}
        disabled={disabled || isConnecting || isLoggingIn}
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        variant="default"
      >
        {isConnecting || isLoggingIn ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isConnecting ? "Connecting..." : "Logging in..."}
          </>
        ) : !isConnected ? (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet & Login
          </>
        ) : !isCorrectChain ? (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            Switch to Base Network
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Login with Wallet
          </>
        )}
      </Button>

      {isConnected && isCorrectChain && (
        <p className="text-xs text-center text-muted-foreground">
          Your wallet address will be verified against the {role} registry on the blockchain
        </p>
      )}
    </div>
  )
}
