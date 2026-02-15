import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"

const FALLBACK_DOCS = [
  {
    id: 1,
    title: "How to Create a MetaMask Wallet",
    slug: "metamask-setup",
    description: "Complete step-by-step guide to setting up your MetaMask wallet",
    category: "Getting Started",
    target_audience: "Everyone",
    icon: "Wallet",
  },
  {
    id: 2,
    title: "University Registration Guide",
    slug: "university-registration",
    description: "How to register your university on the platform",
    category: "Getting Started",
    target_audience: "University Administrators",
    icon: "Building2",
  },
  {
    id: 3,
    title: "How to Issue Degree Certificates",
    slug: "issuing-degrees",
    description: "Step-by-step guide for authorized issuers",
    category: "For Issuers",
    target_audience: "Issuers",
    icon: "FileCheck",
  },
  {
    id: 4,
    title: "Verifying Degree Credentials",
    slug: "verifying-credentials",
    description: "How employers can verify degree authenticity",
    category: "Verification",
    target_audience: "Employers & Institutions",
    icon: "CheckCircle",
  },
  {
    id: 5,
    title: "University Admin Dashboard Guide",
    slug: "university-admin-guide",
    description: "Complete guide for university administrators",
    category: "For Administrators",
    target_audience: "University Administrators",
    icon: "Building2",
  },
  {
    id: 6,
    title: "How to Revoke a Degree",
    slug: "revoking-degrees",
    description: "Guide for authorized revokers",
    category: "For Revokers",
    target_audience: "Revokers",
    icon: "XCircle",
  },
  {
    id: 7,
    title: "Graduate Guide: Your Blockchain Degree",
    slug: "graduate-guide",
    description: "Everything graduates need to know",
    category: "For Graduates",
    target_audience: "Graduates",
    icon: "GraduationCap",
  },
  {
    id: 8,
    title: "Platform Administrator Guide",
    slug: "platform-admin-guide",
    description: "Guide for site administrators",
    category: "For Administrators",
    target_audience: "Platform Admins",
    icon: "Shield",
  },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    if (!isDatabaseAvailable()) {
      if (category) {
        return NextResponse.json(FALLBACK_DOCS.filter((d) => d.category === category))
      }
      return NextResponse.json(FALLBACK_DOCS)
    }

    let result
    if (category) {
      result =
        await sql`SELECT * FROM documentation_guides WHERE is_published = true AND category = ${category} ORDER BY sort_order ASC`
    } else {
      result = await sql`SELECT * FROM documentation_guides WHERE is_published = true ORDER BY category, sort_order ASC`
    }

    if (!result || result.length === 0) {
      if (category) {
        return NextResponse.json(FALLBACK_DOCS.filter((d) => d.category === category))
      }
      return NextResponse.json(FALLBACK_DOCS)
    }

    return NextResponse.json(result)
  } catch (error) {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    if (category) {
      return NextResponse.json(FALLBACK_DOCS.filter((d) => d.category === category))
    }
    return NextResponse.json(FALLBACK_DOCS)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    const result = await sql`
      INSERT INTO documentation_guides (title, slug, description, content, category, target_audience, icon, sort_order)
      VALUES (${body.title}, ${body.slug}, ${body.description}, ${body.content}, ${body.category}, ${body.target_audience}, ${body.icon}, ${body.sort_order || 0})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating doc:", error)
    return NextResponse.json({ error: "Failed to create doc" }, { status: 500 })
  }
}
