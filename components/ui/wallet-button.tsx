"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useWeb3 } from "@/components/providers/web3-provider"
import { Wallet, ChevronDown, LogOut, AlertTriangle, Check } from "lucide-react"

export function WalletButton() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected, isConnecting, isCorrectChain, connect, disconnect, switchChain, isContractOwner } =
    useWeb3()

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // SSR + initial client render: same placeholder to avoid hydration mismatch (wallet state is client-only)
  if (!mounted) {
    return (
      <Button variant="outline" className="gap-2 bg-transparent" disabled>
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  if (!isConnected) {
    return (
      <Button onClick={connect} disabled={isConnecting} className="bg-accent text-accent-foreground hover:bg-accent/90">
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    )
  }

  if (!isCorrectChain) {
    return (
      <Button onClick={switchChain} variant="destructive">
        <AlertTriangle className="mr-2 h-4 w-4" />
        Switch to Base
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span className="font-mono text-sm">{formatAddress(address!)}</span>
            {isContractOwner && (
              <Badge variant="secondary" className="text-xs">
                Owner
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Connected to Base</p>
          <p className="font-mono text-sm truncate">{address}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-muted-foreground">
          <Check className="mr-2 h-4 w-4 text-success" />
          Network Connected
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
