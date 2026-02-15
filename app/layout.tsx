import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { Web3Provider } from "@/components/providers/web3-provider"
import { AuthProvider } from "@/components/providers/auth-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EdChain | Blockchain-Verified University Credentials",
  description:
    "EdChain is an enterprise-grade blockchain platform for issuing, managing, and verifying university degree certificates on Base L2. Tamper-proof, globally accessible credentials.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/edchain-logo.png", type: "image/png" },
      { url: "/edchain-icon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/edchain-logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased min-h-screen">
        <AuthProvider>
          <Web3Provider>
            {children}
            <Toaster />
          </Web3Provider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
