import React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Issuer Login | EdChain",
  description: "Sign in as an authorized degree issuer to create blockchain-verified academic credentials",
}

export default function IssuerLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
