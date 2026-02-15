"use client"

import { useWeb3 } from "@/components/providers/web3-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileX, Loader2, RefreshCw, Wallet, AlertTriangle } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

function MyRevocationRequestsContent() {
  const { isConnected, address, connect, switchChain, isCorrectChain } = useWeb3()

  const { data, error, isLoading, mutate } = useSWR(
    address && isConnected ? `/api/revocation-requests?requester=${address}&status=all` : null,
    (url) => fetch(url).then((r) => r.json()).then((d) => d.requests || []),
    { refreshInterval: 10000 }
  )
  const requests = data ?? []

  if (!isConnected || !address) {
    return (
      <div className="p-6">
        <DashboardHeader title="My Revocation Requests" />
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            Connect your wallet to see your revocation requests.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => connect?.()} disabled={!connect}>Connect Wallet</Button>
          {!isCorrectChain && <Button variant="outline" className="ml-2" onClick={() => switchChain?.()}>Switch to Base</Button>}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <DashboardHeader title="My Revocation Requests" />
      <p className="text-muted-foreground mt-1">All revocation requests you submitted. Status from DB.</p>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <Link href="/revoker/search">
          <Button size="sm">Request new revocation</Button>
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5" />
            Revocation Requests
          </CardTitle>
          <CardDescription>PENDING / REJECTED / EXECUTED / EXPIRED</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Failed to load requests.</AlertDescription>
            </Alert>
          )}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && !error && requests.length === 0 && (
            <p className="text-muted-foreground py-8 text-center">No revocation requests for your wallet.</p>
          )}
          {!isLoading && !error && requests.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Token ID</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approvals</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req: any) => (
                  <TableRow key={req.request_id}>
                    <TableCell className="font-mono">{req.request_id}</TableCell>
                    <TableCell className="font-mono">{req.token_id}</TableCell>
                    <TableCell>{req.university_name ?? req.university_id}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          req.status === "EXECUTED" || req.status === "executed" ? "default" :
                          req.status === "REJECTED" || req.status === "rejected" ? "destructive" :
                          req.status === "EXPIRED" || req.status === "expired" ? "secondary" : "outline"
                        }
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{req.approvalProgress ?? `${req.approval_count ?? 0} / ${req.required_approvals ?? 0}`}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {req.requested_at ? new Date(req.requested_at).toLocaleDateString() : req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/revoker/requests/${req.request_id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function MyRevocationRequestsPage() {
  return (
    <div className="min-h-screen bg-background">
      <MyRevocationRequestsContent />
    </div>
  )
}
