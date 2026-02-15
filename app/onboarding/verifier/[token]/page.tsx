"use client"

import { useParams } from "next/navigation"
import { RoleOnboardingPage } from "@/components/onboarding/role-onboarding-page"

export default function VerifierOnboardingPage() {
  const params = useParams()
  const token = params.token as string

  return (
    <RoleOnboardingPage
      role="verifier"
      token={token}
      apiBasePath="/api/onboarding/verifier"
      loginPath="/verifier/login"
    />
  )
}
