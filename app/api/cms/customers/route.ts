import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"

const FALLBACK_CUSTOMERS = [
  { id: 1, name: "RAK University", logo_url: "/rak-university-logo.jpg", country: "UAE", is_featured: true },
  {
    id: 2,
    name: "Dubai Tech University",
    logo_url: "/dubai-tech-university-logo.jpg",
    country: "UAE",
    is_featured: true,
  },
  { id: 3, name: "Cairo University", logo_url: "/cairo-university-logo.jpg", country: "Egypt", is_featured: true },
  {
    id: 4,
    name: "King Saud University",
    logo_url: "/king-saud-university-logo.jpg",
    country: "Saudi Arabia",
    is_featured: true,
  },
  {
    id: 5,
    name: "Abu Dhabi Polytechnic",
    logo_url: "/abu-dhabi-polytechnic-university-logo.jpg",
    country: "UAE",
    is_featured: false,
  },
]

export async function GET() {
  if (!isDatabaseAvailable()) {
    return NextResponse.json(FALLBACK_CUSTOMERS)
  }

  try {
    const result =
      await sql`SELECT * FROM customers WHERE is_published = true ORDER BY sort_order ASC, is_featured DESC`
    if (!result || result.length === 0) {
      return NextResponse.json(FALLBACK_CUSTOMERS)
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(FALLBACK_CUSTOMERS)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    const result = await sql`
      INSERT INTO customers (name, logo_url, website, country, description, is_featured, sort_order)
      VALUES (${body.name}, ${body.logo_url}, ${body.website}, ${body.country}, ${body.description}, ${body.is_featured || false}, ${body.sort_order || 0})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
