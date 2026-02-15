"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Building2,
  Mail,
  User,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react"

export default function AddUniversityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    adminName: "",
    adminEmail: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    website: "",
    isTrial: true,
    trialDays: 30,
    subscriptionPlan: "basic",
    notes: "",
  })

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.name || !formData.adminName || !formData.adminEmail) {
        throw new Error("Please fill in all required fields")
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
        throw new Error("Please enter a valid email address")
      }

      const response = await fetch("/api/admin/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to add university")
      }

      setSuccess(true)
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/admin/universities/${result.university.id}`)
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">University Added Successfully!</h2>
              <p className="text-muted-foreground mb-4">
                An email has been sent to {formData.adminEmail} with login credentials and onboarding instructions.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to university details...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/universities">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add New University</h1>
          <p className="text-muted-foreground">
            Register a new university and send onboarding invitation
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* University Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                University Information
              </CardTitle>
              <CardDescription>
                Basic information about the university
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    University Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Harvard University"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameAr">University Name (Arabic)</Label>
                  <Input
                    id="nameAr"
                    placeholder="e.g., جامعة هارفارد"
                    value={formData.nameAr}
                    onChange={(e) => handleChange("nameAr", e.target.value)}
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Cambridge"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="e.g., United States"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Full address..."
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://www.university.edu"
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Admin Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                University Admin Contact
              </CardTitle>
              <CardDescription>
                The person who will manage this university account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminName">
                    Admin Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="adminName"
                    placeholder="e.g., John Smith"
                    value={formData.adminName}
                    onChange={(e) => handleChange("adminName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">
                    Admin Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@university.edu"
                    value={formData.adminEmail}
                    onChange={(e) => handleChange("adminEmail", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+1 234 567 8900"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  An email will be sent to this address with login credentials, 
                  onboarding instructions, and a link to sign the NDA and submit wallet address.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Subscription Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Subscription Settings
              </CardTitle>
              <CardDescription>
                Configure trial period or subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Trial Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable trial period for this university
                  </p>
                </div>
                <Switch
                  checked={formData.isTrial}
                  onCheckedChange={(checked) => handleChange("isTrial", checked)}
                />
              </div>

              {formData.isTrial && (
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Trial Period (Days)</Label>
                  <Select
                    value={formData.trialDays.toString()}
                    onValueChange={(value) => handleChange("trialDays", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Trial will expire on: {new Date(Date.now() + formData.trialDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
              )}

              {!formData.isTrial && (
                <div className="space-y-2">
                  <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
                  <Select
                    value={formData.subscriptionPlan}
                    onValueChange={(value) => handleChange("subscriptionPlan", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic - $99/month</SelectItem>
                      <SelectItem value="professional">Professional - $299/month</SelectItem>
                      <SelectItem value="enterprise">Enterprise - Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {formData.isTrial
                    ? "Trial accounts have full access but will be deactivated after the trial period ends unless upgraded or extended."
                    : "This will create an active subscription. Make sure payment has been arranged separately."}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
              <CardDescription>
                Add any notes about this university (visible only to admins)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add notes..."
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/universities">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding University...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Add University & Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
