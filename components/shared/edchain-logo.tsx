"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface EdChainLogoProps {
  className?: string
  showText?: boolean
  size?: "sm" | "md" | "lg"
}

// Horizontal logo (icon + "EdChain" text): height and width for aspect ~2.8
const sizes = {
  sm: { height: 24, width: 67 },
  md: { height: 32, width: 90 },
  lg: { height: 40, width: 112 },
}

export function EdChainLogo({ className, showText = false, size = "md" }: EdChainLogoProps) {
  const { height, width } = sizes[size]
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/edchain-logo.png"
        alt="EdChain"
        width={width}
        height={height}
        className="flex-shrink-0 object-contain"
        priority
      />
      {showText && (
        <span className="font-semibold text-foreground tracking-tight">
          EdChain
        </span>
      )}
    </div>
  )
}
