"use client"

import { useParams, useRouter } from "next/navigation"
import { useMemo } from "react"
import useSWR from "swr"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileCheck, Loader2, ExternalLink, ArrowLeft } from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const BASESCAN_URL = "https://basescan.org"

export default function IssuerRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params?.requestId as string

  const { data, error, isLoading } = useSWR(
    requestId ? `/api/degree-requests/${requestId}` : null,
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
      <DashboardHeader title={`Degree Request #${requestId}`} />
      <div className="mt-2 flex items-center gap-2">
        <Link href="/issuer/requests">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back to My Requests</Button>
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Request details
          </CardTitle>
          <CardDescription>From DB (indexer mirror). Threshold: {req.approval_count ?? 0} / {req.required_approvals ?? 0}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span className="text-muted-foreground">Status</span><br /><Badge variant={status === "ISSUED" ? "default" : status === "REJECTED" ? "destructive" : "outline"}>{status}</Badge></div>
            <div><span className="text-muted-foreground">University</span><br />{req.university_name ?? req.university_id}</div>
            <div><span className="text-muted-foreground">Recipient</span><br /><code className="text-sm">{req.recipient_address}</code></div>
            <div><span className="text-muted-foreground">Requester</span><br /><code className="text-sm">{req.requester_address}</code></div>
            {req.student_name && <div><span className="text-muted-foreground">Student name</span><br />{req.student_name} {req.student_name_ar && `/ ${req.student_name_ar}`}</div>}
            {req.degree_name_en && <div><span className="text-muted-foreground">Degree</span><br />{req.degree_name_en} {req.degree_name_ar && `/ ${req.degree_name_ar}`}</div>}
            {req.gpa != null && <div><span className="text-muted-foreground">GPA / Year</span><br />{req.gpa} / {req.year}</div>}
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
                    {a.tx_hash && (
                      <a href={`${BASESCAN_URL}/tx/${a.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-primary">Tx</a>
                    )}
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
