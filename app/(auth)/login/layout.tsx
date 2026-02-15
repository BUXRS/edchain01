import React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login | EdChain",
  description: "Sign in to access EdChain - choose your role to manage blockchain-verified academic credentials",
}

export default function LoginPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
