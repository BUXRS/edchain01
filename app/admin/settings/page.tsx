"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { useWeb3 } from "@/components/providers/web3-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  PROTOCOL_ADDRESS, 
  RENDERER_ADDRESS, 
  CORE_CONTRACT_ADDRESS,
  RENDER_CONTRACT_ADDRESS,
  READER_CONTRACT_ADDRESS,
  CHAIN_ID 
} from "@/lib/contracts/abi"
import { Settings, Shield, ExternalLink, Copy, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

export default function SettingsPage() {
  const { user } = useAuth()
  const { address, isConnected, isContractOwner } = useWeb3()
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Settings" showAuth />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Admin Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Profile
            </CardTitle>
            <CardDescription>Your account information and connected wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center gap-2">
                  <Input value="Super Admin" readOnly className="bg-muted" />
                  <Badge>Admin</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Connected Wallet</Label>
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <Input value={address || ""} readOnly className="bg-muted font-mono" />
                  {isContractOwner && <Badge className="bg-accent">Contract Owner</Badge>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No wallet connected</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Smart Contract Information
            </CardTitle>
            <CardDescription>Deployed contract addresses and network details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol Contract</Label>
              <div className="flex items-center gap-2">
                <Input value={PROTOCOL_ADDRESS} readOnly className="bg-muted font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(PROTOCOL_ADDRESS, "Protocol Address")}
                >
                  {copied === "Protocol Address" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={`https://basescan.org/address/${PROTOCOL_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Renderer Contract</Label>
              <div className="flex items-center gap-2">
                <Input value={RENDERER_ADDRESS} readOnly className="bg-muted font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(RENDERER_ADDRESS, "Renderer Address")}
                >
                  {copied === "Renderer Address" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={`https://basescan.org/address/${RENDERER_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Network</Label>
                <Input value="Base (Mainnet)" readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Chain ID</Label>
                <Input value={CHAIN_ID} readOnly className="bg-muted font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
