"use client"

import { useParams } from "next/navigation"
import useSWR from "swr"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileX, Loader2, ExternalLink, ArrowLeft } from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const BASESCAN_URL = "https://basescan.org"

export default function RevokerRequestDetailPage() {
  const params = useParams()
  const requestId = params?.requestId as string

  const { data, error, isLoading } = useSWR(
    requestId ? `/api/revocation-requests/${requestId}` : null,
    fetcher,
    { refreshInterval: 10000 }
  )

  if (!requestId) return null
  if (error) return <div className="p-6">Failed to load request.</div>
  if (isLoading) return <div className="p-6 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
  if (!data || data.error) return <div className="p-6">Request not found.</div>

  const req = data
  const status = (req.status || "").toUpperCase()

  return (
    <div className="p-6">
      <DashboardHeader title={`Revocation Request #${requestId}`} />
      <div className="mt-2">
        <Link href="/revoker/requests">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back to My Revocation Requests</Button>
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5" />
            Revocation request details
          </CardTitle>
          <CardDescription>Approvals: {req.approval_count ?? 0} / {req.required_approvals ?? 0}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span className="text-muted-foreground">Status</span><br /><Badge variant={status === "EXECUTED" ? "default" : status === "REJECTED" ? "destructive" : "outline"}>{status}</Badge></div>
            <div><span className="text-muted-foreground">Token ID</span><br /><code>{req.token_id}</code></div>
            <div><span className="text-muted-foreground">University</span><br />{req.university_name ?? req.university_id}</div>
            <div><span className="text-muted-foreground">Requester</span><br /><code className="text-sm">{req.requester_address}</code></div>
            {req.created_tx_hash && (
              <div>
                <span className="text-muted-foreground">Created tx</span><br />
                <a href={`${BASESCAN_URL}/tx/${req.created_tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1">
                  {req.created_tx_hash?.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
          {req.approvals && req.approvals.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Approvals</h4>
              <ul className="space-y-1">
                {req.approvals.map((a: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <code>{a.verifier_address?.slice(0, 10)}…</code>
                    {a.approved_at && <span className="text-muted-foreground">{new Date(a.approved_at).toLocaleString()}</span>}
                    {a.tx_hash && <a href={`${BASESCAN_URL}/tx/${a.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-primary">Tx</a>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
