import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Solutions | Training Centers & Universities | EdChain",
  description:
    "See how EdChain helps training centers and universities: benefits, process, methodology, ROI, and step-by-step guidance for issuing and verifying credentials.",
}

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
