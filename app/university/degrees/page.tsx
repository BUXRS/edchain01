"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useWeb3 } from "@/components/providers/web3-provider"
import { PROTOCOL_ADDRESS } from "@/lib/contracts/abi"
import useSWR from "swr"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  GraduationCap,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Download,
  Users,
  FileCheck,
  AlertCircle,
  Eye,
  Copy,
  Image as ImageIcon,
  FileJson,
  FileText,
} from "lucide-react"
import { toast } from "sonner"

const DEGREE_LEVELS = ["Bachelor", "Master", "PhD"]

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type DegreeFromDB = {
  id: number
  token_id: number
  university_id: number
  recipient_wallet?: string
  student_address?: string
  student_name: string
  student_name_ar?: string
  faculty?: string
  faculty_ar?: string
  major?: string
  major_ar?: string
  degree_level?: number
  degree_type?: string
  gpa?: number
  graduation_year?: number
  graduation_date?: string
  is_revoked: boolean
  blockchain_verified: boolean
  created_at?: string
}

export default function UniversityDegreesPage() {
  const searchParams = useSearchParams()
  const universityIdParam = searchParams.get("id")
  const { address } = useWeb3()

  // State for university ID
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [universityName, setUniversityName] = useState("")

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [facultyFilter, setFacultyFilter] = useState<string>("all")

  // Single degree search
  const [tokenIdSearch, setTokenIdSearch] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<any>(null)
  const [searchError, setSearchError] = useState("")

  // Degree detail sheet (NFT certificate view)
  const [selectedDegree, setSelectedDegree] = useState<DegreeFromDB | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [nftMetadata, setNftMetadata] = useState<any>(null)
  const [isLoadingNft, setIsLoadingNft] = useState(false)
  const [isDownloading, setIsDownloading] = useState<{ type: string; tokenId: string } | null>(null)

  // Load university ID
  useEffect(() => {
    const loadUniversityId = async () => {
      let targetUniversityId: number | null = null

      if (universityIdParam) {
        targetUniversityId = Number.parseInt(universityIdParam)
      } else if (address) {
        try {
          const res = await fetch(`/api/universities/wallet/${address}`)
          if (res.ok) {
            const data = await res.json()
            if (data.university) {
              // Use DB id for degrees API (degrees.university_id is FK to universities.id, not blockchain_id)
              targetUniversityId = data.university.id
              setUniversityName(data.university.name_en || data.university.name || "Your University")
            }
          }
        } catch (e) {
          console.error("Error loading university:", e)
        }
      }

      if (targetUniversityId) {
        setUniversityId(targetUniversityId)
      }
    }

    loadUniversityId()
  }, [universityIdParam, address])

  // Fetch degrees from API (DB-backed)
  const { data: degreesData, error: degreesError, isLoading } = useSWR(
    universityId ? `/api/degrees?universityId=${universityId}` : null,
    fetcher,
    { refreshInterval: 10000 } // Refresh every 10 seconds
  )

  const degrees: DegreeFromDB[] = degreesData?.degrees || []
  const error = degreesError ? "Failed to load degrees" : ""

  // Get unique values for filters
  const uniqueYears = useMemo(() => {
    const years = [...new Set(degrees.map((d) => d.graduation_year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0))
    return years
  }, [degrees])

  const uniqueFaculties = useMemo(() => {
    const faculties = [...new Set(degrees.map((d) => d.faculty).filter(Boolean))]
    return faculties.sort()
  }, [degrees])

  // Filter degrees
  const filteredDegrees = useMemo(() => {
    return degrees.filter((degree) => {
      // Search query (name, major, faculty)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          degree.student_name?.toLowerCase().includes(query) ||
          degree.student_name_ar?.includes(query) ||
          degree.major?.toLowerCase().includes(query) ||
          degree.faculty?.toLowerCase().includes(query) ||
          degree.token_id?.toString().includes(query)
        if (!matchesSearch) return false
      }

      // Level filter
      if (levelFilter !== "all" && degree.degree_level !== Number.parseInt(levelFilter)) {
        return false
      }

      // Year filter
      if (yearFilter !== "all" && degree.graduation_year !== Number.parseInt(yearFilter)) {
        return false
      }

      // Status filter
      if (statusFilter === "valid" && degree.is_revoked) return false
      if (statusFilter === "revoked" && !degree.is_revoked) return false

      // Faculty filter
      if (facultyFilter !== "all" && degree.faculty !== facultyFilter) {
        return false
      }

      return true
    })
  }, [degrees, searchQuery, levelFilter, yearFilter, statusFilter, facultyFilter])

  // Stats
  const stats = useMemo(() => {
    return {
      total: degrees.length,
      valid: degrees.filter((d) => !d.is_revoked).length,
      revoked: degrees.filter((d) => d.is_revoked).length,
      thisYear: degrees.filter((d) => d.graduation_year === new Date().getFullYear()).length,
    }
  }, [degrees])

  // Search single degree by token ID (via verify API)
  const handleTokenSearch = async () => {
    if (!tokenIdSearch) return

    setIsSearching(true)
    setSearchError("")
    setSearchResult(null)

    try {
      const tokenId = Number.parseInt(tokenIdSearch)
      
      // Use verify endpoint (backend reads chain, UI calls API)
      const res = await fetch(`/api/verify/degree/${tokenId}`)
      const data = await res.json()

      if (!data.blockchain.exists) {
        setSearchError("No degree found with this token ID")
        return
      }

      // Check if degree belongs to this university (from DB if available)
      if (universityId && data.database.exists && data.database.data.university_id !== universityId) {
        setSearchError("This degree does not belong to your university")
        return
      }

      setSearchResult({ 
        degree: data.blockchain.data || data.database.data, 
        tokenId,
        verified: data.verified 
      })
    } catch (err) {
      setSearchError("Failed to fetch degree")
    } finally {
      setIsSearching(false)
    }
  }

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Token ID",
      "Student Name",
      "Student Name (Arabic)",
      "Faculty",
      "Major",
      "Degree Level",
      "GPA",
      "Year",
      "Status",
      "Issued Date",
    ]
    const rows = filteredDegrees.map((d) => [
      d.token_id,
      d.student_name,
      d.student_name_ar || "",
      d.faculty || "",
      d.major || "",
      DEGREE_LEVELS[d.degree_level || 0] || "Unknown",
      d.gpa ? (d.gpa / 100).toFixed(2) : "-",
      d.graduation_year || "-",
      d.is_revoked ? "Revoked" : "Valid",
      "-", // Issued date not in DB schema
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `degrees-${universityName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const handleViewDegree = async (degree: DegreeFromDB) => {
    setSelectedDegree(degree)
    setIsDetailOpen(true)
    setIsLoadingNft(true)
    setNftMetadata(null)

    try {
      const response = await fetch(`/api/university/degrees/${degree.token_id}/nft`, { credentials: "include" })
      if (response.ok) {
        const data = await response.json()
        setNftMetadata(data)
      }
    } catch (error) {
      console.error("Failed to fetch NFT metadata:", error)
    } finally {
      setIsLoadingNft(false)
    }
  }

  const handleDownloadPNG = async (tokenId: string) => {
    setIsDownloading({ type: "png", tokenId })
    try {
      const response = await fetch(`/api/university/degrees/${tokenId}/download.png`, {
        credentials: "include",
        headers: { Accept: "image/*" },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || "Failed to download PNG")
        setIsDownloading(null)
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `degree-${tokenId}-nft.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("PNG downloaded successfully")
    } catch (error: any) {
      toast.error("Failed to download PNG: " + (error?.message || "Unknown error"))
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDownloadJSON = async (tokenId: string) => {
    setIsDownloading({ type: "json", tokenId })
    try {
      const response = await fetch(`/api/university/degrees/${tokenId}/metadata.json`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || "Failed to download metadata")
        setIsDownloading(null)
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `degree-${tokenId}-metadata.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Metadata downloaded successfully")
    } catch (error: any) {
      toast.error("Failed to download metadata: " + (error?.message || "Unknown error"))
    } finally {
      setIsDownloading(null)
    }
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return "N/A"
    }
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="University Degrees" />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Degrees</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valid</p>
                  <p className="text-3xl font-bold text-green-500">{stats.valid}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revoked</p>
                  <p className="text-3xl font-bold text-destructive">{stats.revoked}</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Year</p>
                  <p className="text-3xl font-bold">{stats.thisYear}</p>
                </div>
                <FileCheck className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search by Token ID */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search by Token ID
            </CardTitle>
            <CardDescription>Find a specific degree by its blockchain token ID</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter token ID..."
                value={tokenIdSearch}
                onChange={(e) => setTokenIdSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTokenSearch()}
                className="max-w-xs"
              />
              <Button onClick={handleTokenSearch} disabled={isSearching || !tokenIdSearch}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>
            {searchError && <p className="text-sm text-destructive mt-2">{searchError}</p>}

            {searchResult && (
              <div className="mt-4 p-4 border rounded-lg bg-card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Degree #{searchResult.tokenId}
                    </h4>
                    <p className="text-lg font-medium">{searchResult.degree.nameEn || searchResult.degree.student_name}</p>
                  </div>
                  <Badge variant={searchResult.degree.isRevoked || searchResult.degree.is_revoked ? "destructive" : "default"}>
                    {searchResult.verified ? "Verified" : searchResult.degree.isRevoked || searchResult.degree.is_revoked ? "Revoked" : "Valid"}
                  </Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Level:</span> {DEGREE_LEVELS[searchResult.degree.level || searchResult.degree.degree_level || 0]}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Faculty:</span> {searchResult.degree.facultyEn || searchResult.degree.faculty || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Major:</span> {searchResult.degree.majorEn || searchResult.degree.major || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">GPA:</span> {searchResult.degree.gpa ? (searchResult.degree.gpa / 100).toFixed(2) : "-"}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-3 bg-transparent" asChild>
                  <a
                    href={`https://basescan.org/nft/${PROTOCOL_ADDRESS}/${searchResult.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on BaseScan
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Degrees with Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Degrees - {universityName}
                </CardTitle>
                <CardDescription>
                  {filteredDegrees.length} of {degrees.length} degrees • Synced from blockchain
                  {degreesData?.sync && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Last synced: block {degreesData.sync.lastSyncedBlock})
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredDegrees.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, major, faculty, or token ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Degree Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="0">Bachelor</SelectItem>
                  <SelectItem value="1">Master</SelectItem>
                  <SelectItem value="2">PhD</SelectItem>
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
              {uniqueFaculties.length > 1 && (
                <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Faculties</SelectItem>
                    {uniqueFaculties.map((faculty) => (
                      <SelectItem key={faculty} value={faculty}>
                        {faculty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Degrees Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading degrees from database...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            ) : filteredDegrees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No degrees found</p>
                <p className="text-sm">
                  {degrees.length > 0 ? "Try adjusting your filters" : "No degrees have been issued yet"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Token ID</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Major</TableHead>
                      <TableHead className="w-24">Level</TableHead>
                      <TableHead className="w-16 text-center">GPA</TableHead>
                      <TableHead className="w-16 text-center">Year</TableHead>
                      <TableHead className="w-24 text-center">Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDegrees.map((degree) => (
                      <TableRow key={degree.token_id}>
                        <TableCell className="font-mono">#{degree.token_id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{degree.student_name}</p>
                            {degree.student_name_ar && (
                              <p className="text-sm text-muted-foreground" dir="rtl">
                                {degree.student_name_ar}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{degree.faculty || "-"}</TableCell>
                        <TableCell className="text-sm">{degree.major || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{DEGREE_LEVELS[degree.degree_level || 0]}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {degree.gpa ? (degree.gpa / 100).toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-center">{degree.graduation_year || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={degree.is_revoked ? "destructive" : "default"} className="gap-1">
                            {degree.is_revoked ? (
                              <>
                                <XCircle className="h-3 w-3" /> Revoked
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Valid
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDegree(degree)}
                              title="View certificate & details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={`https://basescan.org/nft/${PROTOCOL_ADDRESS}/${degree.token_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View on BaseScan"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Degree Detail Sheet – NFT certificate & full info (same as super admin) */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            {selectedDegree && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Degree Certificate #{selectedDegree.token_id}
                  </SheetTitle>
                  <SheetDescription>
                    {universityName || "Your University"}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* NFT Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>NFT Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isLoadingNft ? (
                        <Skeleton className="h-[300px] w-full" />
                      ) : nftMetadata?.imageUrl ? (
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                          <img
                            src={nftMetadata.imageUrl}
                            alt={`Degree NFT #${selectedDegree.token_id}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] border rounded-lg bg-muted/50">
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
                            <p className="text-sm text-muted-foreground">No image available</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPNG(String(selectedDegree.token_id))}
                          disabled={
                            !nftMetadata?.imageUrl ||
                            (isDownloading?.type === "png" && isDownloading?.tokenId === String(selectedDegree.token_id))
                          }
                        >
                          {isDownloading?.type === "png" && isDownloading?.tokenId === String(selectedDegree.token_id) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Download PNG
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadJSON(String(selectedDegree.token_id))}
                          disabled={
                            isDownloading?.type === "json" && isDownloading?.tokenId === String(selectedDegree.token_id)
                          }
                        >
                          {isDownloading?.type === "json" && isDownloading?.tokenId === String(selectedDegree.token_id) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <FileJson className="h-4 w-4 mr-2" />
                              Download Metadata
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Degree Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Degree Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm text-muted-foreground">Student Name (English)</label>
                          <p className="font-medium">{selectedDegree.student_name || "N/A"}</p>
                        </div>
                        {selectedDegree.student_name_ar && (
                          <div>
                            <label className="text-sm text-muted-foreground">Student Name (Arabic)</label>
                            <p className="font-medium" dir="rtl">{selectedDegree.student_name_ar}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm text-muted-foreground">Student Address</label>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm truncate max-w-[200px]">
                              {(selectedDegree as any).student_address || selectedDegree.recipient_wallet || "N/A"}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() =>
                                handleCopy(
                                  (selectedDegree as any).student_address || selectedDegree.recipient_wallet || "",
                                  "Address"
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">University</label>
                          <p className="font-medium">{universityName || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Faculty</label>
                          <p className="font-medium">{selectedDegree.faculty || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Major</label>
                          <p className="font-medium">{selectedDegree.major || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Degree Type / Level</label>
                          <p className="font-medium">
                            {selectedDegree.degree_type ||
                              (selectedDegree.degree_level != null
                                ? DEGREE_LEVELS[selectedDegree.degree_level]
                                : "N/A")}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Graduation Year</label>
                          <p className="font-medium">
                            {selectedDegree.graduation_year ??
                              (selectedDegree.graduation_date
                                ? new Date(selectedDegree.graduation_date).getFullYear()
                                : "N/A")}
                          </p>
                        </div>
                        {selectedDegree.gpa != null && (
                          <div>
                            <label className="text-sm text-muted-foreground">GPA</label>
                            <p className="font-medium">
                              {typeof selectedDegree.gpa === "number"
                                ? (selectedDegree.gpa / 100).toFixed(2)
                                : String(selectedDegree.gpa)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-sm text-muted-foreground">Status</label>
                          <Badge variant={selectedDegree.is_revoked ? "destructive" : "default"}>
                            {selectedDegree.is_revoked ? "Revoked" : "Active"}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <label className="text-sm text-muted-foreground">Issued At</label>
                          <p className="text-sm">{formatDate(selectedDegree.created_at)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* NFT Metadata Attributes */}
                  {nftMetadata?.metadata?.attributes && nftMetadata.metadata.attributes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>NFT Attributes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2">
                          {nftMetadata.metadata.attributes.map((attr: any, idx: number) => (
                            <div key={idx} className="flex justify-between p-2 rounded border">
                              <span className="text-sm text-muted-foreground">
                                {attr.trait_type || attr.name}:
                              </span>
                              <span className="text-sm font-medium">{String(attr.value)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/verify?tokenId=${selectedDegree.token_id}`, "_blank")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verify Page
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `https://basescan.org/nft/${PROTOCOL_ADDRESS}/${selectedDegree.token_id}`,
                          "_blank"
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on BaseScan
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
