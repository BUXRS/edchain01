"use client"

import { Suspense } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useReadContract } from "wagmi"
import { DEGREE_PROTOCOL_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts/abi"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileX, Search, Shield, AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"

function RevokerDashboardContent() {
  const { user } = useAuth()

  const { data: universityInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.degreeProtocol as `0x${string}`,
    abi: DEGREE_PROTOCOL_ABI,
    functionName: "getUniversityByRevoker",
    args: user?.address ? [user.address as `0x${string}`] : undefined,
  })

  const universityName = universityInfo ? (universityInfo as any)[1] : "Loading..."

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Revoker Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage degree revocations for your university</p>
      </div>

      <Card className="bg-destructive/5 border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-foreground">Revoker Account</CardTitle>
              <CardDescription>Authorized to revoke degrees for {universityName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-background rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Your Wallet</p>
              <p className="font-mono text-sm mt-1 text-foreground">{user?.address}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">University</p>
              <p className="font-medium mt-1 text-foreground">{universityName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground">Important Notice</p>
          <p className="text-sm text-muted-foreground mt-1">
            Degree revocation is a permanent action recorded on the blockchain. Ensure you have proper authorization and
            documentation before revoking any degree. All revocations are logged and auditable.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Search Degrees</CardTitle>
                <CardDescription>Find degrees to revoke</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Search for degrees by degree ID or student wallet address to initiate revocation.
            </p>
            <Link href="/revoker/search">
              <Button className="w-full gap-2">
                Search Degrees
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <FileX className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">Revocation History</CardTitle>
                <CardDescription>View past revocations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Review all degrees that have been revoked by your university.
            </p>
            <Link href="/revoker/history">
              <Button variant="outline" className="w-full gap-2 bg-transparent">
                View History
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revocation Process</CardTitle>
          <CardDescription>Steps to revoke a degree</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Badge className="mb-2">Step 1</Badge>
              <h4 className="font-medium text-foreground">Search</h4>
              <p className="text-sm text-muted-foreground mt-1">Find the degree by ID or student address</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Badge className="mb-2">Step 2</Badge>
              <h4 className="font-medium text-foreground">Verify</h4>
              <p className="text-sm text-muted-foreground mt-1">Confirm the degree details and reason for revocation</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Badge className="mb-2">Step 3</Badge>
              <h4 className="font-medium text-foreground">Revoke</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Sign the transaction to permanently revoke the degree
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RevokerDashboard() {
  return (
    <Suspense fallback={null}>
      <RevokerDashboardContent />
    </Suspense>
  )
}
