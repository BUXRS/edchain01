import React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Revoker Login | EdChain",
  description: "Sign in as an authorized degree revoker to manage certificate revocations",
}

export default function RevokerLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
