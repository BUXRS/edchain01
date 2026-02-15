import { NextResponse } from "next/server"
import { sql, isDatabaseAvailable } from "@/lib/db"

const FALLBACK_FAQ = [
  // General Questions
  {
    id: 1,
    question: "What is a blockchain-verified degree?",
    answer:
      "A blockchain-verified degree is a digital credential stored as a soulbound NFT on the blockchain. It cannot be transferred, forged, or tampered with, providing instant verification of academic credentials. This technology eliminates the need for paper certificates and traditional verification processes.",
    category: "General",
    sort_order: 1,
  },
  {
    id: 2,
    question: "What is a soulbound NFT?",
    answer:
      "A soulbound NFT is a non-transferable token permanently linked to a wallet address. Unlike regular NFTs, they cannot be sold or transferred, making them perfect for credentials, certifications, and identity verification. Once issued to a student, the degree remains with them forever.",
    category: "General",
    sort_order: 2,
  },
  {
    id: 3,
    question: "What blockchain network do you use?",
    answer:
      "We use Base Mainnet, an Ethereum Layer 2 network built by Coinbase. It offers low transaction costs (typically $0.01-0.10 per transaction), fast confirmation times (2-4 seconds), and enterprise-grade security while maintaining full Ethereum compatibility.",
    category: "General",
    sort_order: 3,
  },
  {
    id: 4,
    question: "Is this technology legally recognized?",
    answer:
      "Blockchain credentials are increasingly recognized globally. The immutable, verifiable nature of blockchain records makes them legally defensible as proof of qualification. Many countries and international organizations are adopting blockchain for credential verification.",
    category: "General",
    sort_order: 4,
  },

  // For Universities
  {
    id: 10,
    question: "How do universities get started with the platform?",
    answer:
      "Universities can register through our platform in 4 simple steps: 1) Choose a subscription plan, 2) Complete the registration form with university details, 3) Wait for admin verification (1-2 business days), 4) Connect your MetaMask wallet and start issuing degrees. Our team provides full onboarding support.",
    category: "For Universities",
    sort_order: 10,
  },
  {
    id: 11,
    question: "What are the subscription plans and pricing?",
    answer:
      "We offer three tiers: Starter ($99/month for up to 500 degrees/year), Professional ($299/month for up to 5,000 degrees/year), and Enterprise (custom pricing for unlimited degrees). All plans include unlimited issuers, 24/7 support, and analytics dashboard. Gas fees (~$0.05-0.20 per degree) are additional.",
    category: "For Universities",
    sort_order: 11,
  },
  {
    id: 12,
    question: "What is required to issue a degree on blockchain?",
    answer:
      "To issue a degree, you need: 1) An authorized issuer wallet address, 2) Student's wallet address (they must have MetaMask set up), 3) Student information (name in English/Arabic, faculty, major, GPA, graduation year), 4) Small amount of ETH for gas fees. The entire process takes about 2 minutes.",
    category: "For Universities",
    sort_order: 12,
  },
  {
    id: 13,
    question: "Can we integrate this with our existing student information system?",
    answer:
      "Yes! We offer API integration for enterprise customers. You can automate degree issuance directly from your SIS, bulk upload graduate data, and sync verification records. Our team provides technical documentation and integration support.",
    category: "For Universities",
    sort_order: 13,
  },
  {
    id: 14,
    question: "How do we manage who can issue degrees?",
    answer:
      "University admins can add or remove issuers through the dashboard. Each issuer is identified by their wallet address and added to the blockchain. Only authorized wallets can issue degrees on behalf of your university. You can grant and revoke issuer permissions at any time.",
    category: "For Universities",
    sort_order: 14,
  },
  {
    id: 15,
    question: "Can we customize the degree certificate design?",
    answer:
      "Yes, Enterprise plan customers can customize the certificate template with their university logo, colors, and branding. The certificate metadata stored on-chain remains standardized for compatibility, but the visual representation can be tailored to your institution.",
    category: "For Universities",
    sort_order: 15,
  },
  {
    id: 16,
    question: "What happens if we issue a degree by mistake?",
    answer:
      "Blockchain transactions are immutable, so issued degrees cannot be 'deleted'. However, authorized revokers can revoke a degree with a documented reason. The revocation is recorded on-chain, and verification will show the degree as revoked with the revocation date.",
    category: "For Universities",
    sort_order: 16,
  },

  // For Students
  {
    id: 20,
    question: "How do I receive my blockchain degree?",
    answer:
      "Your university will need your MetaMask wallet address to issue your degree. Once issued, the degree NFT appears in your wallet automatically. You'll receive a Token ID which you can use for verification. No action is needed on your part - just share your wallet address with your registrar.",
    category: "For Students",
    sort_order: 20,
  },
  {
    id: 21,
    question: "Do I need to pay for anything?",
    answer:
      "No! Students do not pay any fees. The university covers all costs including subscription and blockchain gas fees. You only need a free MetaMask wallet to receive and hold your degree credential.",
    category: "For Students",
    sort_order: 21,
  },
  {
    id: 22,
    question: "How do I set up a MetaMask wallet?",
    answer:
      "Setting up MetaMask is free and takes 5 minutes: 1) Install the MetaMask browser extension from metamask.io, 2) Create a new wallet with a strong password, 3) Write down your 12-word recovery phrase and store it securely, 4) Your wallet address (starting with 0x) is ready to receive your degree.",
    category: "For Students",
    sort_order: 22,
  },
  {
    id: 23,
    question: "What if I lose access to my wallet?",
    answer:
      "If you saved your 12-word recovery phrase, you can restore your wallet on any device. If you lost both the wallet and recovery phrase, the degree still exists on the blockchain linked to that address. Contact your university to verify ownership through other means or request a new issuance to a new wallet.",
    category: "For Students",
    sort_order: 23,
  },
  {
    id: 24,
    question: "How do I share my degree with employers?",
    answer:
      "There are several ways: 1) Share your Token ID and direct them to our verification page, 2) Send them the verification link (degreeprotocol.io/verify?id=YOUR_TOKEN_ID), 3) Add the verification link to your LinkedIn profile or resume, 4) Show the NFT in your MetaMask wallet. Verification is instant and free.",
    category: "For Students",
    sort_order: 24,
  },
  {
    id: 25,
    question: "Can I transfer my degree to someone else?",
    answer:
      "No, and that's by design! Your degree is a 'soulbound' NFT, meaning it's permanently linked to your wallet and cannot be transferred. This prevents credential fraud and ensures only the rightful owner can claim the degree.",
    category: "For Students",
    sort_order: 25,
  },
  {
    id: 26,
    question: "Will my degree work internationally?",
    answer:
      "Yes! Blockchain degrees are globally accessible and verifiable. Anyone, anywhere can verify your credentials instantly without contacting your university. This is especially valuable for international job applications and immigration where traditional verification can take weeks.",
    category: "For Students",
    sort_order: 26,
  },

  // For Employers & Verifiers
  {
    id: 30,
    question: "How does the verification process work?",
    answer:
      "Verification is instant and free: 1) Visit our verification page, 2) Enter the Token ID or wallet address provided by the candidate, 3) View the complete credential details including university, degree, major, GPA, and graduation date, 4) Confirm authenticity with blockchain proof links.",
    category: "For Employers",
    sort_order: 30,
  },
  {
    id: 31,
    question: "Is verification really free?",
    answer:
      "Yes, verification is completely free for everyone. We believe in open access to credential verification. You don't need an account, wallet, or subscription to verify degrees - just visit our verification page and enter the Token ID.",
    category: "For Employers",
    sort_order: 31,
  },
  {
    id: 32,
    question: "How do I know the verification is legitimate?",
    answer:
      "Our verification reads data directly from the immutable blockchain - it cannot be faked. Each verification shows: the issuing university (verified on-chain), the degree details, issue timestamp, and links to view the transaction on BaseScan (the official block explorer).",
    category: "For Employers",
    sort_order: 32,
  },
  {
    id: 33,
    question: "What if a degree shows as 'revoked'?",
    answer:
      "A revoked status means the issuing university has invalidated the credential (possibly due to academic misconduct or administrative error). The revocation date is recorded, and you should not accept this credential. Contact the university for more information if needed.",
    category: "For Employers",
    sort_order: 33,
  },
  {
    id: 34,
    question: "Can I verify multiple degrees at once (bulk verification)?",
    answer:
      "Yes! Enterprise API access allows HR departments to verify credentials in bulk. Contact us for API documentation and pricing. This is ideal for large-scale hiring or educational institutions verifying transfer credits.",
    category: "For Employers",
    sort_order: 34,
  },

  // For Platform Admins
  {
    id: 40,
    question: "How do I approve new university registrations?",
    answer:
      "As a platform admin, you review pending registrations in the Admin Dashboard. Verify the university's legitimacy (check official website, accreditation), review their submitted details, then click 'Approve' to register them on the blockchain or 'Reject' with a reason.",
    category: "For Admins",
    sort_order: 40,
  },
  {
    id: 41,
    question: "Can I deactivate a university?",
    answer:
      "Yes, platform admins can deactivate universities through the admin panel. Deactivation prevents new degree issuance but doesn't affect existing degrees. This may be necessary if a university's subscription lapses or for compliance reasons.",
    category: "For Admins",
    sort_order: 41,
  },
  {
    id: 42,
    question: "How do I manage platform content (FAQ, documentation)?",
    answer:
      "The Admin CMS section allows you to manage all public content: FAQ items, ROI case studies, documentation guides, and customer testimonials. Changes are reflected immediately on the public-facing pages.",
    category: "For Admins",
    sort_order: 42,
  },

  // Security & Technical
  {
    id: 50,
    question: "Is my personal data secure?",
    answer:
      "Only essential credential data is stored on-chain: name, degree details, and university ID. Sensitive personal data (student ID, contact info, grades breakdown) remains in your university's secure systems. The blockchain stores only what's needed for verification.",
    category: "Security",
    sort_order: 50,
  },
  {
    id: 51,
    question: "Can blockchain degrees be hacked or forged?",
    answer:
      "No. Blockchain technology makes forgery virtually impossible. Each degree is signed cryptographically by the issuing university's wallet, and the transaction is verified by thousands of nodes on the network. Altering a record would require controlling 51% of the network - essentially impossible.",
    category: "Security",
    sort_order: 51,
  },
  {
    id: 52,
    question: "What happens if the platform shuts down?",
    answer:
      "Your degrees live on the blockchain independently of our platform. Even if our company ceased to exist, the credentials remain permanently recorded and verifiable through any Ethereum/Base block explorer. The blockchain is decentralized and cannot be shut down.",
    category: "Security",
    sort_order: 52,
  },
  {
    id: 53,
    question: "Do you comply with GDPR and data protection laws?",
    answer:
      "Yes. We minimize on-chain data storage to only what's necessary for credential verification. For GDPR 'right to erasure' requests, while blockchain data cannot be deleted, it can be effectively made inaccessible through our systems. We provide data processing agreements for universities.",
    category: "Security",
    sort_order: 53,
  },

  // Support
  {
    id: 60,
    question: "How do I get technical support?",
    answer:
      "We offer multiple support channels: 1) Email support at support@degreeprotocol.io, 2) Live chat on our website during business hours, 3) Comprehensive documentation at /docs, 4) Priority phone support for Enterprise customers. Response time is typically under 4 hours.",
    category: "Support",
    sort_order: 60,
  },
  {
    id: 61,
    question: "Do you offer training for university staff?",
    answer:
      "Yes! All subscription plans include basic onboarding training. Professional and Enterprise plans include comprehensive training sessions for issuers, revokers, and administrators. We also provide video tutorials, documentation, and a sandbox environment for practice.",
    category: "Support",
    sort_order: 61,
  },
  {
    id: 62,
    question: "What are your support hours?",
    answer:
      "Standard support is available Monday-Friday, 9 AM - 6 PM (Gulf Standard Time). Enterprise customers have access to 24/7 emergency support for critical issues. Our documentation and verification services are available 24/7.",
    category: "Support",
    sort_order: 62,
  },
]

export async function GET() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(FALLBACK_FAQ)
    }

    const result = await sql`SELECT * FROM faq_items WHERE is_published = true ORDER BY sort_order ASC, created_at DESC`

    if (!result || result.length === 0) {
      return NextResponse.json(FALLBACK_FAQ)
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(FALLBACK_FAQ)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, answer, category, sort_order } = body

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    const result = await sql`
      INSERT INTO faq_items (question, answer, category, sort_order) 
      VALUES (${question}, ${answer}, ${category || "General"}, ${sort_order || 0}) 
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating FAQ:", error)
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 })
  }
}
