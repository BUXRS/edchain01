import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"

const FALLBACK_ROI_CASES = [
  {
    id: 1,
    university_name: "RAK University",
    logo_url: "/rak-university-logo.jpg",
    country: "UAE",
    students_count: 5000,
    degrees_issued: 1200,
    cost_savings_percent: 75,
    time_savings_percent: 90,
    verification_time_reduction: "From 2 weeks to 30 seconds",
    annual_savings_amount: 150000,
    testimonial_quote:
      "Implementing blockchain credentials has transformed how we issue and verify degrees. The efficiency gains have been remarkable.",
    testimonial_author: "Dr. Ahmed Hassan",
    testimonial_role: "Registrar",
    is_featured: true,
  },
  {
    id: 2,
    university_name: "Dubai Tech University",
    logo_url: "/dubai-tech-university-logo.jpg",
    country: "UAE",
    students_count: 8000,
    degrees_issued: 2500,
    cost_savings_percent: 80,
    time_savings_percent: 95,
    verification_time_reduction: "From 10 days to instant",
    annual_savings_amount: 280000,
    testimonial_quote:
      "Our graduates love having instant, verifiable credentials. Employers trust our blockchain-verified degrees.",
    testimonial_author: "Prof. Sarah Al-Maktoum",
    testimonial_role: "Vice Chancellor",
    is_featured: true,
  },
  {
    id: 3,
    university_name: "Global Business School",
    logo_url: "/global-business-school-logo.jpg",
    country: "Singapore",
    students_count: 3500,
    degrees_issued: 800,
    cost_savings_percent: 70,
    time_savings_percent: 85,
    verification_time_reduction: "From 1 week to 1 minute",
    annual_savings_amount: 95000,
    testimonial_quote: "The ROI was evident within the first quarter. We've eliminated credential fraud completely.",
    testimonial_author: "Michael Chen",
    testimonial_role: "Dean of Administration",
    is_featured: false,
  },
]

export async function GET() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(FALLBACK_ROI_CASES)
    }

    const result =
      await sql`SELECT * FROM roi_case_studies WHERE is_published = true ORDER BY is_featured DESC, created_at DESC`

    if (!result || result.length === 0) {
      return NextResponse.json(FALLBACK_ROI_CASES)
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(FALLBACK_ROI_CASES)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    const result = await sql`
      INSERT INTO roi_case_studies (
        university_name, logo_url, country, students_count, degrees_issued, 
        cost_savings_percent, time_savings_percent, verification_time_reduction, annual_savings_amount,
        testimonial_quote, testimonial_author, testimonial_role, is_featured
      )
      VALUES (
        ${body.university_name}, ${body.logo_url}, ${body.country}, ${body.students_count}, ${body.degrees_issued},
        ${body.cost_savings_percent}, ${body.time_savings_percent}, ${body.verification_time_reduction}, ${body.annual_savings_amount},
        ${body.testimonial_quote}, ${body.testimonial_author}, ${body.testimonial_role}, ${body.is_featured || false}
      ) 
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating ROI case:", error)
    return NextResponse.json({ error: "Failed to create ROI case" }, { status: 500 })
  }
}
