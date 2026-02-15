import React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Graduate Login | EdChain",
  description: "Access your blockchain-verified academic credentials, share them with employers, and download certificates",
}

export default function GraduateLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
