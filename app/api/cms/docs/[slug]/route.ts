import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const FALLBACK_DOCS: Record<string, any> = {
  "metamask-setup": {
    id: 1,
    title: "How to Create a MetaMask Wallet",
    slug: "metamask-setup",
    description: "Complete step-by-step guide to setting up your MetaMask wallet",
    category: "Getting Started",
    target_audience: "Everyone",
    icon: "Wallet",
    content: `## Introduction

MetaMask is a digital wallet that allows you to interact with the blockchain. This guide will walk you through setting up MetaMask from scratch.

## Step 1: Install MetaMask Extension

![Install MetaMask](/docs/images/metamask-install.jpg)

1. Open your web browser (Chrome, Firefox, Edge, or Brave)
2. Visit [metamask.io/download](https://metamask.io/download)
3. Click **Install MetaMask for Your Browser**
4. Click **Add to Browser** in the extension store
5. Wait for the installation to complete

## Step 2: Create a New Wallet

![Create Wallet](/docs/images/metamask-create.jpg)

1. Click the MetaMask fox icon in your browser toolbar
2. Click **Get Started**
3. Select **Create a Wallet**
4. Read and accept the terms of use

## Step 3: Set a Strong Password

![Set Password](/docs/images/metamask-password.jpg)

1. Enter a strong password (minimum 8 characters)
2. Use a mix of uppercase, lowercase, numbers, and symbols
3. Confirm your password
4. Check the box agreeing to the terms
5. Click **Create**

## Step 4: Secure Your Recovery Phrase

![Recovery Phrase](/docs/images/metamask-recovery.jpg)

**CRITICAL: This is the most important step!**

1. Click **Reveal Secret Words**
2. Write down all 12 words in exact order on paper
3. Store this paper in a secure location (safe, lockbox)
4. **NEVER** share these words with anyone
5. **NEVER** store them digitally (no screenshots, no cloud)

## Step 5: Verify Your Recovery Phrase

1. MetaMask will ask you to confirm your recovery phrase
2. Click the words in the correct order
3. Click **Confirm**

## Step 6: Connect to Base Network

![Add Base Network](/docs/images/metamask-base.jpg)

1. Click the network dropdown (shows Ethereum Mainnet)
2. Click **Add Network**
3. Click **Add a network manually**
4. Enter the following details:
   - **Network Name:** Base
   - **RPC URL:** https://mainnet.base.org
   - **Chain ID:** 8453
   - **Currency Symbol:** ETH
   - **Block Explorer:** https://basescan.org
5. Click **Save**

## Congratulations!

Your MetaMask wallet is now set up and ready to use with the University Degree Protocol.`,
  },
  "university-registration": {
    id: 2,
    title: "University Registration Guide",
    slug: "university-registration",
    description: "How to register your university on the platform",
    category: "Getting Started",
    target_audience: "University Administrators",
    icon: "Building2",
    content: `## Overview

This guide explains how university administrators can register their institution on the University Degree Protocol platform.

## Prerequisites

- A MetaMask wallet set up (see MetaMask Setup Guide)
- University administrator credentials
- Official university email address
- University logo (recommended: 500x500px PNG)

## Step 1: Subscribe to a Plan

![Subscribe](/docs/images/university-subscribe.jpg)

1. Visit the Pricing Page at /subscribe
2. Choose a subscription plan:
   - **Starter:** Up to 500 degrees/year
   - **Professional:** Up to 5,000 degrees/year
   - **Enterprise:** Unlimited degrees
3. Click **Get Started**
4. Complete the payment process

## Step 2: Create University Account

![Create Account](/docs/images/university-account.jpg)

1. Fill in your university details:
   - University Name (English)
   - University Name (Arabic)
   - Official Email Address
   - Contact Phone Number
2. Upload your university logo
3. Click **Submit Registration**

## Step 3: Admin Approval

1. Your registration will be reviewed by platform administrators
2. This typically takes 1-2 business days
3. You will receive an email notification once approved

## Step 4: Connect Your Wallet

![Connect Wallet](/docs/images/university-connect.jpg)

1. Once approved, log in to your university dashboard
2. Navigate to **Settings > Wallet**
3. Click **Connect MetaMask**
4. Approve the connection in MetaMask
5. Sign the verification message

## Step 5: Configure Issuers and Revokers

1. Go to **Issuers** in the sidebar
2. Click **Add Issuer**
3. Enter the wallet address of authorized staff
4. Click **Add on Blockchain**
5. Repeat for revokers in the **Revokers** section`,
  },
  "issuing-degrees": {
    id: 3,
    title: "How to Issue Degree Certificates",
    slug: "issuing-degrees",
    description: "Step-by-step guide for authorized issuers",
    category: "For Issuers",
    target_audience: "Issuers",
    icon: "FileCheck",
    content: `## Overview

This guide shows authorized issuers how to create blockchain-verified degree certificates for graduates.

## Prerequisites

- Authorized issuer role assigned by university admin
- MetaMask wallet connected
- Connected to Base network
- Small amount of ETH for gas fees (~$0.10 per degree)

## Step 1: Access the Issuer Dashboard

![Issuer Dashboard](/docs/images/issuer-dashboard.jpg)

1. Go to the Issuer Panel at /issuer
2. Connect your MetaMask wallet
3. Verify you see **Verified Issuer** status
4. Confirm you are connected to the correct university

## Step 2: Navigate to Issue Degree

![Issue Degree Form](/docs/images/issue-degree-form.jpg)

1. Click **Issue Degree** in the sidebar
2. You will see the degree issuance form

## Step 3: Enter Graduate Information

### Recipient Information
- **Recipient Wallet Address:** The graduate's Ethereum wallet address
- **Student Name (English):** Full name in English
- **Student Name (Arabic):** Full name in Arabic

### Academic Information
- **Faculty (English):** e.g., Faculty of Engineering
- **Faculty (Arabic):** e.g., كلية الهندسة
- **Major (English):** e.g., Computer Science
- **Major (Arabic):** e.g., علوم الحاسوب
- **Degree Level:** Bachelor, Master, or PhD
- **GPA:** On a 5.0 scale
- **Graduation Year:** The year of graduation

## Step 4: Review and Submit

1. Double-check all entered information
2. **Warning:** This action is permanent and cannot be undone
3. Click **Issue Degree Certificate**

## Step 5: Confirm Transaction

1. MetaMask will open with the transaction details
2. Review the gas fee (typically $0.05-0.20)
3. Click **Confirm** to proceed
4. Wait for the transaction to be mined (10-30 seconds)

## Step 6: Success!

1. You will see a success message with the Token ID
2. The degree is now permanently recorded on the blockchain
3. Share the Token ID with the graduate for verification`,
  },
  "verifying-credentials": {
    id: 4,
    title: "Verifying Degree Credentials",
    slug: "verifying-credentials",
    description: "How employers can verify degree authenticity",
    category: "Verification",
    target_audience: "Employers & Institutions",
    icon: "CheckCircle",
    content: `## Overview

This guide explains how to verify the authenticity of blockchain-based degree certificates.

## Who Can Verify?

Anyone can verify degrees - no account or wallet required:
- Employers during hiring
- Educational institutions for admissions
- Government agencies for licensing
- Anyone needing proof of credentials

## Method 1: Using Our Verification Portal

![Verification Portal](/docs/images/verify-portal.jpg)

### Step 1: Get the Token ID

The graduate should provide you with their degree Token ID.

### Step 2: Visit the Verification Page

1. Go to /verify
2. Enter the Token ID in the search box
3. Click **Verify Degree**

### Step 3: Review Results

You will see:
- **Verification Status:** Valid or Revoked
- **Graduate Name:** In English and Arabic
- **Degree Details:** Level, Major, Faculty, GPA
- **Institution:** University name and status
- **Issue Date:** When the degree was minted
- **Blockchain Proof:** Links to BaseScan

## Understanding Verification Results

### Valid Degree
A green **Verified Authentic** badge means the degree is valid and has not been revoked.

### Revoked Degree
A red **Revoked** badge means the credential should NOT be accepted.`,
  },
  "university-admin-guide": {
    id: 5,
    title: "University Admin Dashboard Guide",
    slug: "university-admin-guide",
    description: "Complete guide for university administrators",
    category: "For Administrators",
    target_audience: "University Administrators",
    icon: "Building2",
    content: `## Overview

This guide covers all administrative functions available to university administrators.

## Accessing the Admin Dashboard

1. Go to /university/login
2. Enter your registered email and password
3. Click **Sign In**
4. Connect your MetaMask wallet when prompted

## Managing Issuers

### Adding an Issuer

1. Navigate to **Issuers** in the sidebar
2. Click **+ Add Issuer**
3. Enter the wallet address of the staff member
4. Click **Add Issuer**
5. Confirm the blockchain transaction in MetaMask

### Removing an Issuer

1. Find the issuer in the list
2. Click the **trash icon**
3. Confirm the removal

## Managing Revokers

1. Navigate to **Revokers** in the sidebar
2. Click **+ Add Revoker**
3. Enter the wallet address
4. Confirm on blockchain

## Viewing Issued Degrees

1. Navigate to **Degrees** in the sidebar
2. View all degrees issued by your university
3. Search by student name or token ID`,
  },
  "revoking-degrees": {
    id: 6,
    title: "How to Revoke a Degree",
    slug: "revoking-degrees",
    description: "Guide for authorized revokers",
    category: "For Revokers",
    target_audience: "Revokers",
    icon: "XCircle",
    content: `## Overview

In rare cases, a university may need to revoke a previously issued degree.

## When to Revoke

Degrees should only be revoked for serious reasons:
- Academic fraud discovered
- Degree issued in error
- Court order or legal requirement

**Warning:** Revocation is permanent.

## Prerequisites

- Authorized revoker role from university admin
- MetaMask wallet connected
- Token ID of the degree to revoke

## Revocation Process

1. Go to the Revoker Panel at /revoker
2. Connect your MetaMask wallet
3. Enter the Token ID
4. Review degree information
5. Click **Revoke Degree**
6. Confirm in MetaMask

## After Revocation

- The degree shows **Revoked** status everywhere
- This cannot be undone`,
  },
  "graduate-guide": {
    id: 7,
    title: "Graduate Guide: Your Blockchain Degree",
    slug: "graduate-guide",
    description: "Everything graduates need to know",
    category: "For Graduates",
    target_audience: "Graduates",
    icon: "GraduationCap",
    content: `## Congratulations, Graduate!

Your university has issued you a blockchain-verified degree certificate.

## What is a Blockchain Degree?

Your degree is:
- **Permanent:** Recorded forever on the blockchain
- **Tamper-proof:** Cannot be altered or forged
- **Instantly Verifiable:** Anyone can verify in seconds
- **Globally Accessible:** Works anywhere in the world

## Your Degree Token

You were assigned a unique **Token ID** when your degree was issued.

**Keep this Token ID safe!**

## How to View Your Degree

1. Go to /verify
2. Enter your Token ID
3. Click **Verify Degree**

## Sharing with Employers

Include in your resume:
- Your Token ID
- Verification link: /verify?id=[YOUR_TOKEN_ID]`,
  },
  "platform-admin-guide": {
    id: 8,
    title: "Platform Administrator Guide",
    slug: "platform-admin-guide",
    description: "Guide for site administrators",
    category: "For Administrators",
    target_audience: "Platform Admins",
    icon: "Shield",
    content: `## Overview

This guide is for platform administrators who manage the overall Degree Protocol system.

## Accessing Admin Panel

1. Go to /admin/login
2. Enter your admin credentials
3. Connect your admin wallet

## Managing Universities

### Approving New Universities

1. Go to **Pending Approvals**
2. Review each submission
3. Click **Approve** or **Reject**
4. Confirm the blockchain transaction

### Adding Universities Manually

1. Click **+ Add University**
2. Enter university details
3. Click **Register on Blockchain**
4. Confirm in MetaMask

## Managing Site Content (CMS)

- **FAQ:** Add/edit questions
- **ROI Cases:** Add customer success stories
- **Documentation:** Edit guide content
- **Contact:** View form submissions
- **Newsletter:** Manage subscribers`,
  },
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params

    if (process.env.DATABASE_URL) {
      try {
        const { sql } = await import("@/lib/db")
        const result = await sql`SELECT * FROM documentation_guides WHERE slug = ${slug} AND is_published = true`

        if (result.length > 0) {
          return NextResponse.json(result[0])
        }
      } catch {
        // Database query failed, fall through to fallback
      }
    }

    const doc = FALLBACK_DOCS[slug]
    if (doc) {
      return NextResponse.json(doc)
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch {
    return NextResponse.json({ error: "Failed to fetch doc" }, { status: 500 })
  }
}
