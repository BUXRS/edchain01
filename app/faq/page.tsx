"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Search, HelpCircle, BookOpen, MessageCircle } from "lucide-react"
import { SiteHeader } from "@/components/shared/site-header"
import { SiteFooter } from "@/components/shared/site-footer"

interface FAQItem {
  id: number
  question: string
  answer: string
  category: string
  sort_order: number
}

const staticFAQs: FAQItem[] = [
  {
    id: 1,
    question: "What is EdChain?",
    answer:
      "EdChain is a blockchain-based platform for issuing, managing, and verifying university degrees. Using NFT technology on Base Mainnet, we create tamper-proof, instantly verifiable academic credentials.",
    category: "General",
    sort_order: 1,
  },
  {
    id: 2,
    question: "How does blockchain verification work?",
    answer:
      "When a university issues a degree, it's minted as a Soulbound NFT on the blockchain. This creates a permanent, immutable record that anyone can verify instantly by checking the smart contract. No more waiting for paper transcripts or dealing with document fraud.",
    category: "General",
    sort_order: 2,
  },
  {
    id: 3,
    question: "What is a Soulbound NFT?",
    answer:
      "A Soulbound NFT is a non-transferable token that is permanently linked to a specific wallet address. Unlike regular NFTs, Soulbound tokens cannot be sold, traded, or transferred, making them perfect for credentials like degrees.",
    category: "Technical",
    sort_order: 3,
  },
  {
    id: 4,
    question: "Do I need cryptocurrency to verify a degree?",
    answer:
      "No! Verification is completely free and doesn't require any cryptocurrency or even a wallet. Anyone can verify a degree by entering the Token ID on our verification page.",
    category: "Verification",
    sort_order: 4,
  },
  {
    id: 5,
    question: "How much does it cost for universities?",
    answer:
      "We offer three plans: Starter ($99/month for up to 500 degrees/year), Professional ($299/month for up to 5,000 degrees/year), and Enterprise (custom pricing for unlimited degrees). Gas fees on Base are minimal, typically under $0.10 per degree.",
    category: "Pricing",
    sort_order: 5,
  },
  {
    id: 6,
    question: "What happens if a degree needs to be revoked?",
    answer:
      "Authorized revokers at the university can revoke a degree through our platform. The revocation is permanently recorded on the blockchain, and anyone verifying the degree will see its revoked status.",
    category: "Technical",
    sort_order: 6,
  },
  {
    id: 7,
    question: "Is my personal information secure?",
    answer:
      "Yes. Only your name and degree details are stored on the blockchain. No sensitive personal information like date of birth, address, or identification numbers are ever recorded on-chain.",
    category: "Security",
    sort_order: 7,
  },
  {
    id: 8,
    question: "What is MetaMask and do I need it?",
    answer:
      "MetaMask is a cryptocurrency wallet browser extension. Universities and issuers need MetaMask to issue degrees. Graduates need it to receive their degree NFT. Verifiers don't need any wallet - verification is free and open.",
    category: "Technical",
    sort_order: 8,
  },
]

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>(staticFAQs)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchFAQs()
  }, [])

  const fetchFAQs = async () => {
    try {
      const response = await fetch("/api/cms/faq")
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        setFaqs(data)
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error)
      // Keep static FAQs as fallback
    } finally {
      setLoading(false)
    }
  }

  const categories = Array.from(new Set(faqs.map((faq) => faq.category)))

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === null || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedFAQs = filteredFAQs.reduce(
    (acc, faq) => {
      if (!acc[faq.category]) {
        acc[faq.category] = []
      }
      acc[faq.category].push(faq)
      return acc
    },
    {} as Record<string, FAQItem[]>,
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="container relative">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-6">
              <HelpCircle className="h-4 w-4" />
              Frequently Asked Questions
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Got Questions?
              <span className="text-primary block">We Have Answers</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Find answers to common questions about blockchain credentials, verification, and EdChain.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mt-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 h-14 text-lg bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="py-8 border-b border-border">
        <div className="container max-w-4xl">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? "bg-primary" : ""}
            >
              All Questions
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-primary" : ""}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16 flex-1">
        <div className="container max-w-4xl">
          <div className="mx-auto">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredFAQs.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
                  <p className="text-muted-foreground mb-6">Try different search terms or browse all categories.</p>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedFAQs).map(([category, items]) => (
                  <div key={category}>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                      <div className="w-2 h-6 bg-primary rounded-full" />
                      {category}
                    </h2>
                    <Accordion type="single" collapsible className="space-y-2">
                      {items.map((faq) => (
                        <AccordionItem
                          key={faq.id}
                          value={`faq-${faq.id}`}
                          className="bg-card border border-border rounded-lg px-6"
                        >
                          <AccordionTrigger className="text-left hover:no-underline py-4">
                            <span className="font-medium">{faq.question}</span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-4">{faq.answer}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 bg-card/50">
        <div className="container max-w-4xl">
          <Card className="bg-card border-border mx-auto">
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Still Have Questions?</h3>
              <p className="text-muted-foreground mb-6">
                Can't find what you're looking for? Our team is here to help.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/docs">
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <BookOpen className="h-4 w-4" />
                    View Documentation
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button className="bg-primary hover:bg-primary/90 gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Contact Support
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
