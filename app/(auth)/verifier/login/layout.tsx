import React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Verifier Login | EdChain",
  description: "Sign in as an authorized degree verifier to approve degree and revocation requests",
}

export default function VerifierLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
