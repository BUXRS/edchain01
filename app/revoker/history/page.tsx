"use client"

import { Suspense, useState, useEffect } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileX, Search, ExternalLink, Calendar, Loader2, Wallet, AlertTriangle } from "lucide-react"
import { fetchRevokedDegrees, findUniversitiesWhereRevoker } from "@/lib/blockchain"

interface Revocation {
  tokenId: number
  universityId: number
  revokedAt: Date
  txHash: string
  studentName?: string
  degreeName?: string
}

function RevocationHistoryContent() {
  const { isConnected, isCorrectChain, address, connect, switchChain } = useWeb3()

  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [revocations, setRevocations] = useState<Revocation[]>([])

  useEffect(() => {
    if (isConnected && isCorrectChain && address) {
      loadRevocations()
    } else {
      setIsLoading(false)
    }
  }, [isConnected, isCorrectChain, address])

  const loadRevocations = async () => {
    setIsLoading(true)
    try {
      // Find universities where user is revoker
      const universities = await findUniversitiesWhereRevoker(address!)

      // Fetch revocations for those universities
      const allRevocations: Revocation[] = []
      for (const uni of universities) {
        const uniRevocations = await fetchRevokedDegrees(Number(uni.id))
        for (const rev of uniRevocations) {
          allRevocations.push({
            tokenId: rev.tokenId,
            universityId: rev.universityId,
            revokedAt: rev.revokedAt,
            txHash: rev.txHash,
            studentName: rev.degree?.nameEn,
            degreeName: rev.degree
              ? `${["Bachelor", "Master", "PhD"][rev.degree.level] || "Degree"} in ${rev.degree.majorEn}`
              : undefined,
          })
        }
      }

      setRevocations(allRevocations)
    } catch (error) {
      console.error("Error loading revocations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredRevocations = revocations.filter(
    (rev) =>
      rev.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false ||
      rev.tokenId.toString().includes(searchQuery) ||
      rev.degreeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false,
  )

  if (!isConnected) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Revocation History</h1>
          <p className="text-muted-foreground mt-1">View all degrees revoked by your university</p>
        </div>
        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Connect your wallet to view revocation history.</span>
            <Button onClick={connect} size="sm" className="ml-4">
              Connect Wallet
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!isCorrectChain) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Revocation History</h1>
          <p className="text-muted-foreground mt-1">View all degrees revoked by your university</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Please switch to Base Mainnet.</span>
            <Button onClick={switchChain} variant="outline" size="sm" className="ml-4 bg-transparent">
              Switch Network
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Revocation History</h1>
        <p className="text-muted-foreground mt-1">View all degrees revoked - fetched from Base Mainnet</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revoked Degrees</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading..."
                  : `${filteredRevocations.length} revocation${filteredRevocations.length !== 1 ? "s" : ""} found`}
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or degree..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading revocations from blockchain...</p>
            </div>
          ) : filteredRevocations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Degree</TableHead>
                  <TableHead>Revoked Date</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRevocations.map((revocation) => (
                  <TableRow key={revocation.tokenId}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        #{revocation.tokenId}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{revocation.studentName || "Unknown"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{revocation.degreeName || "Unknown"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {revocation.revokedAt.toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1" asChild>
                        <a
                          href={`https://basescan.org/tx/${revocation.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <FileX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No Revocations Found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? "No revocations match your search criteria" : "No degrees have been revoked yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revocation Statistics</CardTitle>
          <CardDescription>Overview of revocation activity from blockchain</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-foreground">{revocations.length}</p>
              <p className="text-sm text-muted-foreground">Total Revocations</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-foreground">
                {revocations.filter((r) => r.revokedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
              </p>
              <p className="text-sm text-muted-foreground">Last 30 Days</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-foreground">
                {revocations.length > 0 ? revocations[0].revokedAt.toLocaleDateString() : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">Most Recent</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RevocationHistoryPage() {
  return (
    <Suspense fallback={null}>
      <RevocationHistoryContent />
    </Suspense>
  )
}
