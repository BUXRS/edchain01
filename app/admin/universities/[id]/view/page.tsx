"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  Building2,
  Mail,
  User,
  Phone,
  MapPin,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Shield,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

interface University {
  id: number
  name: string
  name_ar: string | null
  admin_name: string
  admin_email: string
  phone: string | null
  address: string | null
  city: string | null
  wallet_address: string | null
  subscription_type: string
  subscription_expires_at: string | null
  is_active: boolean
  status: string
  blockchain_id: number | null
  created_at: string
  registration_type?: string
  is_trial?: boolean
  trial_end_date?: string
  nda_signed?: boolean
  wallet_submitted?: boolean
  account_activated?: boolean
  payment_status?: string
}

export default function UniversityViewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [university, setUniversity] = useState<University | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchUniversity()
  }, [id])

  const fetchUniversity = async () => {
    try {
      const response = await fetch(`/api/admin/universities/${id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch university")
      }

      setUniversity(result.university)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "inactive":
        return <Badge variant="destructive">Inactive</Badge>
      case "expired":
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Expired</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!university) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>University not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="University Details" showAuth />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/universities">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{university.name}</h1>
                {getStatusBadge(university.status)}
                {university.is_trial && (
                  <Badge variant="outline" className="border-amber-500 text-amber-500">
                    Trial
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{university.admin_email}</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* University Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                University Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name (English)</span>
                  <span className="font-medium">{university.name}</span>
                </div>
                {university.name_ar && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name (Arabic)</span>
                    <span className="font-medium" dir="rtl">{university.name_ar}</span>
                  </div>
                )}
                {university.city && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">City</span>
                    <span className="font-medium">{university.city}</span>
                  </div>
                )}
                {university.address && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-medium text-right max-w-[200px]">{university.address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blockchain ID</span>
                  <span className="font-medium">
                    {university.blockchain_id ? (
                      <div className="flex items-center gap-2">
                        <span>#{university.blockchain_id}</span>
                        <a
                          href={`https://basescan.org/address/${university.wallet_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      "Not registered"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created At</span>
                  <span className="font-medium">
                    {new Date(university.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Admin Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{university.admin_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{university.admin_email}</span>
                </div>
                {university.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{university.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Wallet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Blockchain Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              {university.wallet_address ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded break-all">
                      {university.wallet_address}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(university.wallet_address!)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Wallet connected
                  </div>
                  <a
                    href={`https://basescan.org/address/${university.wallet_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View on BaseScan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {university.wallet_submitted
                      ? "Wallet submitted, pending activation"
                      : "No wallet address submitted"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Subscription Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">
                    {university.subscription_type || "Not set"}
                  </span>
                </div>
                {university.subscription_expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires At</span>
                    <span className="font-medium">
                      {new Date(university.subscription_expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {university.is_trial && university.trial_end_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trial End Date</span>
                    <span className="font-medium">
                      {new Date(university.trial_end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {university.payment_status && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Status</span>
                    <Badge variant={university.payment_status === "paid" ? "default" : "secondary"}>
                      {university.payment_status}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Registration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Registration Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">NDA Signed</span>
                  <Badge variant={university.nda_signed ? "default" : "outline"}>
                    {university.nda_signed ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Wallet Submitted</span>
                  <Badge variant={university.wallet_submitted ? "default" : "outline"}>
                    {university.wallet_submitted ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Account Activated</span>
                  <Badge variant={university.account_activated ? "default" : "outline"}>
                    {university.account_activated ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(university.status)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active</span>
                  <Badge variant={university.is_active ? "default" : "destructive"}>
                    {university.is_active ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <Link href={`/admin/universities/${id}/status`}>
            <Button variant="outline">
              Change Status
            </Button>
          </Link>
          <Link href={`/admin/universities/${id}/admin`}>
            <Button variant="outline">
              Change Admin
            </Button>
          </Link>
          <Link href={`/admin/universities/${id}`}>
            <Button>
              Full Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
