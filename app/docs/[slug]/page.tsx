"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Clock, User, ExternalLink } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { SiteHeader } from "@/components/shared/site-header"
import { SiteFooter } from "@/components/shared/site-footer"

interface DocGuide {
  id: number
  title: string
  slug: string
  description: string
  content: string
  category: string
  target_audience: string
  icon: string
}

const staticDocsContent: Record<string, DocGuide> = {
  "metamask-setup": {
    id: 1,
    title: "How to Create a MetaMask Wallet",
    slug: "metamask-setup",
    description: "Complete step-by-step guide to setting up your MetaMask wallet for blockchain credentials",
    category: "Getting Started",
    target_audience: "Everyone",
    icon: "Wallet",
    content: `## Introduction

MetaMask is a digital wallet that allows you to interact with the blockchain. This guide will walk you through setting up MetaMask from scratch.

## Step 1: Install MetaMask Extension

![Install MetaMask](/placeholder.svg?height=300&width=600&query=MetaMask browser extension installation screen)

1. Open your web browser (Chrome, Firefox, Edge, or Brave)
2. Visit [metamask.io/download](https://metamask.io/download)
3. Click **"Install MetaMask for Your Browser"**
4. Click **"Add to Browser"** in the extension store
5. Wait for the installation to complete

## Step 2: Create a New Wallet

![Create Wallet](/placeholder.svg?height=300&width=600&query=MetaMask create new wallet screen)

1. Click the MetaMask fox icon in your browser toolbar
2. Click **"Get Started"**
3. Select **"Create a Wallet"**
4. Read and accept the terms of use

## Step 3: Set a Strong Password

![Set Password](/placeholder.svg?height=300&width=600&query=MetaMask password setup screen)

1. Enter a strong password (minimum 8 characters)
2. Use a mix of uppercase, lowercase, numbers, and symbols
3. Confirm your password
4. Check the box agreeing to the terms
5. Click **"Create"**

## Step 4: Secure Your Recovery Phrase

![Recovery Phrase](/placeholder.svg?height=300&width=600&query=MetaMask secret recovery phrase backup screen)

**⚠️ CRITICAL: This is the most important step!**

1. Click **"Reveal Secret Words"**
2. Write down all 12 words in exact order on paper
3. Store this paper in a secure location (safe, lockbox)
4. **NEVER** share these words with anyone
5. **NEVER** store them digitally (no screenshots, no cloud)

> Your recovery phrase is the ONLY way to recover your wallet if you lose access. Treat it like a bank vault key.

## Step 5: Verify Your Recovery Phrase

![Verify Phrase](/placeholder.svg?height=300&width=600&query=MetaMask verify recovery phrase screen)

1. MetaMask will ask you to confirm your recovery phrase
2. Click the words in the correct order
3. Click **"Confirm"**

## Step 6: Connect to Base Network

![Add Base Network](/placeholder.svg?height=300&width=600&query=MetaMask add Base network configuration screen)

Your wallet is created on Ethereum Mainnet by default. To use our platform, you need to add the Base network:

1. Click the network dropdown (shows "Ethereum Mainnet")
2. Click **"Add Network"**
3. Click **"Add a network manually"**
4. Enter the following details:

| Setting | Value |
|---------|-------|
| **Network Name** | Base |
| **RPC URL** | https://mainnet.base.org |
| **Chain ID** | 8453 |
| **Currency Symbol** | ETH |
| **Block Explorer** | https://basescan.org |

5. Click **"Save"**

## Congratulations! 🎉

Your MetaMask wallet is now set up and ready to use with EdChain. You can now:

- Connect your wallet to our platform
- Receive blockchain-verified degree certificates
- Verify credentials instantly

## Troubleshooting

**Q: I forgot my password**
A: Use your 12-word recovery phrase to restore your wallet.

**Q: MetaMask is not showing in my browser**
A: Make sure the extension is enabled in your browser settings.

**Q: Transaction is stuck**
A: Try increasing the gas fee or wait for network congestion to clear.

## Next Steps

- [University Registration Guide](/docs/university-registration) - For university administrators
- [Verify Credentials](/docs/verifying-credentials) - For employers
- [Graduate Guide](/docs/graduate-guide) - For degree holders`,
  },
  "university-registration": {
    id: 2,
    title: "University Registration Guide",
    slug: "university-registration",
    description: "How to register your university on the EdChain platform",
    category: "Getting Started",
    target_audience: "University Administrators",
    icon: "Building2",
    content: `## Overview

This guide explains how university administrators can register their institution on the EdChain platform.

## Prerequisites

Before you begin, ensure you have:

- ✅ A MetaMask wallet set up (see [MetaMask Setup Guide](/docs/metamask-setup))
- ✅ University administrator credentials
- ✅ Official university email address
- ✅ University logo (recommended: 500x500px PNG)

## Step 1: Subscribe to a Plan

![Subscribe](/placeholder.svg?height=300&width=600&query=University subscription pricing plans page)

1. Visit the [Pricing Page](/subscribe)
2. Choose a subscription plan:
   - **Starter:** Up to 500 degrees/year - $99/month
   - **Professional:** Up to 5,000 degrees/year - $299/month
   - **Enterprise:** Unlimited degrees - Custom pricing
3. Click **"Get Started"**
4. Complete the payment process via Stripe

## Step 2: Create University Account

![Create Account](/placeholder.svg?height=300&width=600&query=University registration form with fields)

Fill in your university details:

1. **University Name (English):** Official name in English
2. **University Name (Arabic):** Official name in Arabic (optional)
3. **Official Email Address:** Must be a valid university domain
4. **Contact Phone Number:** For support purposes
5. Upload your university logo
6. Click **"Submit Registration"**

## Step 3: Admin Approval

![Admin Approval](/placeholder.svg?height=300&width=600&query=Pending approval status screen)

1. Your registration will be reviewed by platform administrators
2. This typically takes **1-2 business days**
3. You will receive an email notification once approved
4. Check the **Pending Approvals** status in your dashboard

## Step 4: Connect Your Wallet

![Connect Wallet](/placeholder.svg?height=400&width=600&query=University dashboard connect MetaMask wallet button)

Once approved:

1. Log in to your university dashboard at [/university/login](/university/login)
2. Navigate to **Settings > Wallet**
3. Click **"Connect MetaMask"**
4. Approve the connection in MetaMask popup
5. Sign the verification message to prove wallet ownership

> **Important:** The wallet you connect becomes your university's admin wallet. Keep it secure!

## Step 5: Configure Issuers and Revokers

![Manage Roles](/placeholder.svg?height=400&width=600&query=University issuers management dashboard)

### Adding Issuers

Issuers are staff members authorized to mint degree certificates:

1. Go to **Issuers** in the sidebar
2. Click **"+ Add Issuer"**
3. Enter the wallet address of authorized staff member
4. Click **"Add on Blockchain"**
5. Confirm the transaction in MetaMask
6. Wait for blockchain confirmation (~30 seconds)

### Adding Revokers

Revokers can invalidate degrees if needed:

1. Go to **Revokers** in the sidebar
2. Click **"+ Add Revoker"**
3. Enter the wallet address
4. Confirm on blockchain

> **Best Practice:** Only grant revoker access to highly trusted staff (e.g., Registrar, Dean)

## Your University is Ready!

You can now:
- ✅ Issue blockchain-verified degree certificates
- ✅ Manage issuers and revokers
- ✅ View issued degrees
- ✅ Monitor verification requests

## Best Practices

### Security
- Use hardware wallets for admin accounts
- Enable 2FA on your email
- Regularly audit issuer/revoker lists
- Never share your recovery phrase

### Operations
- Train new issuers before granting access
- Document your internal processes
- Keep graduate records synchronized
- Review issued degrees monthly`,
  },
  "issuing-degrees": {
    id: 3,
    title: "How to Issue Degree Certificates",
    slug: "issuing-degrees",
    description: "Step-by-step guide for authorized issuers to mint degree NFTs",
    category: "For Issuers",
    target_audience: "Issuers",
    icon: "FileCheck",
    content: `## Overview

This guide shows authorized issuers how to create blockchain-verified degree certificates for graduates.

## Prerequisites

Before issuing degrees, ensure you have:

- ✅ Authorized issuer role from university admin
- ✅ MetaMask wallet connected
- ✅ Connected to Base network (Chain ID: 8453)
- ✅ Small amount of ETH for gas fees (~$0.10 per degree)

## Step 1: Access the Issuer Dashboard

![Issuer Dashboard](/placeholder.svg?height=400&width=600&query=Issuer dashboard showing verified status and university info)

1. Go to the Issuer Panel at [/issuer](/issuer)
2. Connect your MetaMask wallet
3. Verify you see **"Verified Issuer"** status with green checkmark
4. Confirm you are connected to the correct university

> If you see "Not Authorized", contact your university admin to grant issuer permissions.

## Step 2: Navigate to Issue Degree

![Issue Degree](/placeholder.svg?height=300&width=600&query=Issue degree menu item selected in sidebar)

1. Click **"Issue Degree"** in the sidebar
2. You will see the degree issuance form

## Step 3: Enter Graduate Information

![Issue Degree Form](/placeholder.svg?height=500&width=600&query=Degree issuance form with all fields filled)

### Recipient Information

| Field | Description | Example |
|-------|-------------|---------|
| **Recipient Wallet Address** | Graduate's Ethereum wallet | 0x1234...5678 |
| **Student Name (English)** | Full name in English | Ahmed Mohammed Ali |
| **Student Name (Arabic)** | Full name in Arabic | أحمد محمد علي |

### Academic Information

| Field | Description | Example |
|-------|-------------|---------|
| **Faculty (English)** | Department/Faculty name | Faculty of Engineering |
| **Faculty (Arabic)** | Department in Arabic | كلية الهندسة |
| **Major (English)** | Field of study | Computer Science |
| **Major (Arabic)** | Field in Arabic | علوم الحاسوب |
| **Degree Level** | Academic level | Bachelor / Master / PhD |
| **GPA** | Grade point average (0-5) | 3.75 |
| **Graduation Year** | Year of completion | 2025 |

## Step 4: Review and Submit

![Review](/placeholder.svg?height=300&width=600&query=Degree review confirmation dialog with warning)

1. Double-check **ALL** entered information
2. Read the warning carefully

> ⚠️ **WARNING:** This action is permanent and cannot be undone. The degree will be permanently recorded on the blockchain.

3. Click **"Issue Degree Certificate"**

## Step 5: Confirm Transaction

![MetaMask Confirm](/placeholder.svg?height=400&width=600&query=MetaMask transaction confirmation popup)

1. MetaMask will open with the transaction details
2. Review the gas fee (typically $0.05-0.20 on Base)
3. Click **"Confirm"** to proceed
4. Wait for the transaction to be mined (10-30 seconds)

## Step 6: Success!

![Success](/placeholder.svg?height=300&width=600&query=Degree issued success message with token ID)

1. You will see a success message with the **Token ID**
2. The degree is now permanently recorded on the blockchain
3. Share the Token ID with the graduate for verification
4. The graduate can view their degree at \`/verify?id=[TOKEN_ID]\`

## Viewing Issued Degrees

![History](/placeholder.svg?height=400&width=600&query=Issuer history page showing list of issued degrees)

1. Go to **"My Issued"** in the sidebar
2. View all degrees you have issued
3. Click on any degree to see details
4. Use the Token ID to verify on blockchain explorers

## Common Issues

### Transaction Failed
- Ensure you have enough ETH for gas (at least 0.001 ETH)
- Check you are on Base network (Chain ID: 8453)
- Try increasing gas limit

### Wallet Not Recognized as Issuer
- Contact your university admin
- Verify your wallet address is registered
- Refresh the page and reconnect wallet

### Wrong Information Entered
- Once issued, degrees cannot be modified
- Contact your university admin about revocation if needed`,
  },
  "verifying-credentials": {
    id: 4,
    title: "Verifying Degree Credentials",
    slug: "verifying-credentials",
    description: "How employers and institutions can verify degree authenticity",
    category: "Verification",
    target_audience: "Employers & Institutions",
    icon: "CheckCircle",
    content: `## Overview

This guide explains how to verify the authenticity of blockchain-based degree certificates issued through our platform.

## Who Can Verify?

Anyone can verify degrees - **no account or wallet required**:

- 👔 Employers during hiring
- 🎓 Educational institutions for admissions
- 🏛️ Government agencies for licensing
- 🔍 Anyone needing proof of credentials

## Method 1: Using Our Verification Portal

![Verification Portal](/placeholder.svg?height=400&width=600&query=Degree verification portal with search input)

### Step 1: Get the Token ID

The graduate should provide you with their degree **Token ID**. This is a unique number like \`1\`, \`42\`, or \`1337\`.

### Step 2: Visit the Verification Page

1. Go to the [EdChain verification page](/verify)
2. Enter the Token ID in the search box
3. Click **"Verify Degree"**

### Step 3: Review Results

![Verification Results](/placeholder.svg?height=500&width=600&query=Verified degree result showing all details and green checkmark)

You will see:

| Information | Description |
|-------------|-------------|
| **Verification Status** | Valid ✅ or Revoked ❌ |
| **Graduate Name** | In English and Arabic |
| **Degree Details** | Level, Major, Faculty, GPA |
| **Institution** | University name and status |
| **Issue Date** | When the degree was minted |
| **Blockchain Proof** | Links to BaseScan and OpenSea |

## Understanding Verification Results

### ✅ Valid Degree

![Valid](/placeholder.svg?height=200&width=400&query=Green verified authentic badge)

A green **"Verified Authentic"** badge means:

- The degree exists on the blockchain
- It was issued by an authorized university
- It has **NOT** been revoked
- All information is immutable and tamper-proof

### ❌ Revoked Degree

![Revoked](/placeholder.svg?height=200&width=400&query=Red revoked degree warning badge)

A red **"Revoked"** badge means:

- The degree was previously valid
- It has been revoked by the university
- The revocation date is recorded
- **The credential should NOT be accepted**

## Method 2: Direct Blockchain Verification

![BaseScan](/placeholder.svg?height=400&width=600&query=BaseScan contract read function interface)

For technical users who want to verify directly on the blockchain:

1. Go to [BaseScan](https://basescan.org)
2. Search for our contract: \`0xA9C83Ade889a07A4e28d1f6A0d1Cc30412C2C1A5\`
3. Go to **Read Contract**
4. Use \`getDegree\` function with the Token ID
5. View the raw blockchain data

## Sharing Verification Links

![Share](/placeholder.svg?height=200&width=400&query=Copy verification link button)

You can share verification results:

1. Click **"Copy Link"** on the results page
2. Send the link: \`edchain.io/verify?id=123\`
3. Recipients can instantly see the verification

## API Verification (For Developers)

\`\`\`javascript
// Example: Verify degree via smart contract
const degree = await contract.getDegree(tokenId);
const isValid = await contract.isValidDegree(tokenId);

if (isValid) {
  console.log("Degree is authentic!");
  console.log("Student:", degree.nameEn);
  console.log("University ID:", degree.universityId);
}
\`\`\`

## Frequently Asked Questions

**Q: Is verification free?**
A: Yes, verification is completely free for everyone.

**Q: Can verification results be faked?**
A: No. Data is read directly from the immutable blockchain.

**Q: What if the token ID doesn't exist?**
A: You'll see an error - the degree was never issued.

**Q: How fast is verification?**
A: Instant - typically under 2 seconds.`,
  },
  "university-admin-guide": {
    id: 5,
    title: "University Admin Dashboard Guide",
    slug: "university-admin-guide",
    description: "Complete guide for university administrators to manage their institution",
    category: "For Administrators",
    target_audience: "University Administrators",
    icon: "Building2",
    content: `## Overview

This guide covers all administrative functions available to university administrators in the EdChain platform.

## Accessing the Admin Dashboard

![University Login](/placeholder.svg?height=400&width=600&query=University admin login page with email and password fields)

1. Go to [/university/login](/university/login)
2. Enter your registered email and password
3. Click **"Sign In"**
4. Connect your MetaMask wallet when prompted

## Dashboard Overview

![Dashboard](/placeholder.svg?height=500&width=600&query=University dashboard with stats cards and recent activity)

The dashboard shows:

- 📊 Total degrees issued
- 👥 Active issuers count
- 💳 Subscription status
- 📈 Recent activity
- ⚡ Quick action buttons

## Managing Issuers

![Issuers](/placeholder.svg?height=400&width=600&query=University issuers management page with add issuer button)

### Adding an Issuer

1. Navigate to **Issuers** in the sidebar
2. Click **"+ Add Issuer"**
3. Enter the wallet address of the staff member
4. Click **"Add Issuer"**
5. Confirm the blockchain transaction in MetaMask
6. Wait for confirmation (~10-30 seconds)

### Removing an Issuer

1. Find the issuer in the list
2. Click the **trash icon** next to their address
3. Confirm the removal
4. The change is recorded on blockchain

## Managing Revokers

![Revokers](/placeholder.svg?height=400&width=600&query=University revokers management page)

Revokers can invalidate degrees if needed:

1. Navigate to **Revokers** in the sidebar
2. Click **"+ Add Revoker"**
3. Enter the wallet address
4. Confirm on blockchain

> ⚠️ **Note:** Only grant revoker access to highly trusted staff.

## Viewing Issued Degrees

![Degrees](/placeholder.svg?height=400&width=600&query=University degrees list with search and filter)

1. Navigate to **Degrees** in the sidebar
2. View all degrees issued by your university
3. Search by student name or token ID
4. Click on any degree for details

## Subscription Management

![Subscription](/placeholder.svg?height=400&width=600&query=University subscription management page with usage stats)

1. Navigate to **Subscription** in the sidebar
2. View your current plan
3. See usage statistics
4. Upgrade or manage billing

## Best Practices for Administrators

### Security
- 🔐 Use hardware wallets for admin accounts
- 📱 Enable 2FA on your email
- 📋 Regularly audit issuer/revoker lists
- 🔑 Never share your recovery phrase

### Operations
- 📚 Train new issuers before granting access
- 📝 Document your internal processes
- 🔄 Keep graduate records synchronized
- 📊 Review issued degrees monthly

### Compliance
- 🇪🇺 Ensure GDPR compliance for EU graduates
- ✅ Maintain internal approval workflows
- 📁 Keep audit logs of all actions
- 🚨 Report any security incidents`,
  },
  "revoking-degrees": {
    id: 6,
    title: "How to Revoke a Degree",
    slug: "revoking-degrees",
    description: "Guide for authorized revokers to invalidate degree certificates",
    category: "For Revokers",
    target_audience: "Revokers",
    icon: "XCircle",
    content: `## Overview

In rare cases, a university may need to revoke a previously issued degree. This guide explains the revocation process.

## When to Revoke

Degrees should only be revoked for serious reasons:

- 🚫 Academic fraud discovered
- ❌ Degree issued in error
- ⚖️ Court order or legal requirement
- 📛 Severe academic misconduct

> ⚠️ **Warning:** Revocation is **permanent** and publicly visible on the blockchain.

## Prerequisites

- ✅ Authorized revoker role from university admin
- ✅ MetaMask wallet connected
- ✅ Token ID of the degree to revoke
- ✅ Documented reason for revocation

## Step 1: Access Revoker Dashboard

![Revoker Dashboard](/placeholder.svg?height=400&width=600&query=Revoker dashboard with verified status)

1. Go to the Revoker Panel at [/revoker](/revoker)
2. Connect your MetaMask wallet
3. Verify your revoker status shows as authorized

## Step 2: Find the Degree

![Find Degree](/placeholder.svg?height=400&width=600&query=Revoke degree search by token ID)

1. Navigate to **"Revoke Degree"** in sidebar
2. Enter the Token ID of the degree
3. Click **"Search"** to load degree details

## Step 3: Review Degree Information

![Review](/placeholder.svg?height=400&width=600&query=Degree details review before revocation)

Before revoking, verify:

- ✅ Student name matches your records
- ✅ University ID is correct
- ✅ Degree details are accurate
- ✅ You have proper authorization

## Step 4: Revoke the Degree

![Confirm](/placeholder.svg?height=300&width=600&query=Revocation confirmation dialog with warning)

1. Click **"Revoke Degree"**
2. Read the warning carefully
3. Confirm you understand this is **permanent**
4. Click **"Confirm Revocation"**

## Step 5: Blockchain Confirmation

![MetaMask](/placeholder.svg?height=400&width=600&query=MetaMask revocation transaction confirmation)

1. MetaMask will open with transaction details
2. Review the gas fee
3. Click **"Confirm"**
4. Wait for transaction to complete

## After Revocation

![Revoked Status](/placeholder.svg?height=300&width=600&query=Degree showing revoked status in red)

- The degree shows **"Revoked"** status everywhere
- Verification shows revocation date
- The blockchain records who revoked it
- **This cannot be undone**

## Viewing Revocation History

![History](/placeholder.svg?height=400&width=600&query=Revoker history showing revoked degrees)

1. Go to **"My Revocations"** in sidebar
2. View all degrees you have revoked
3. Each entry shows date and token ID

## Legal Considerations

- 📋 Document all revocations internally
- 📧 Notify the degree holder
- 📁 Keep records of the reason
- ⚖️ Consult legal team if needed`,
  },
  "graduate-guide": {
    id: 7,
    title: "Graduate Guide: Your Blockchain Degree",
    slug: "graduate-guide",
    description: "Everything graduates need to know about their blockchain-verified credentials",
    category: "For Graduates",
    target_audience: "Graduates",
    icon: "GraduationCap",
    content: `## Congratulations, Graduate! 🎓

Your university has issued you a blockchain-verified degree certificate. This guide explains what this means and how to use it.

## What is a Blockchain Degree?

![Blockchain Degree](/placeholder.svg?height=300&width=600&query=Blockchain verified degree certificate NFT)

Your degree is:

| Feature | Benefit |
|---------|---------|
| **Permanent** | Recorded forever on the blockchain |
| **Tamper-proof** | Cannot be altered or forged |
| **Instantly Verifiable** | Anyone can verify in seconds |
| **Globally Accessible** | Works anywhere in the world |
| **Soulbound** | Cannot be transferred to others |

## Your Degree Token

![Token ID](/placeholder.svg?height=200&width=400&query=Degree token ID number display)

You were assigned a unique **Token ID** when your degree was issued. This number (e.g., #42) is your credential's identifier.

> **Keep this Token ID safe!** You'll share it with employers and institutions for verification.

## How to View Your Degree

### Option 1: Verification Portal

![View Degree](/placeholder.svg?height=400&width=600&query=Graduate viewing their degree on verification portal)

1. Go to [/verify](/verify)
2. Enter your Token ID
3. Click **"Verify Degree"**
4. See your complete credential information

### Option 2: OpenSea (NFT Marketplace)

![OpenSea](/placeholder.svg?height=300&width=600&query=Degree NFT displayed on OpenSea marketplace)

1. Visit [OpenSea](https://opensea.io)
2. Connect your wallet
3. View your degree as an NFT
4. See the metadata and certificate image

### Option 3: BaseScan (Blockchain Explorer)

![BaseScan](/placeholder.svg?height=300&width=600&query=Degree transaction on BaseScan explorer)

1. Visit [BaseScan](https://basescan.org)
2. Search your wallet address
3. View the NFT in your tokens
4. See the blockchain transaction

## Sharing with Employers

![Share](/placeholder.svg?height=300&width=600&query=Sharing degree verification link with employer)

When applying for jobs:

1. **Include your Token ID** in your resume/CV
2. **Provide the verification link:** \`edchain.io/verify?id=[YOUR_TOKEN_ID]\`
3. **Explain the technology:** "My degree is blockchain-verified and can be instantly validated"

### Sample Resume Text

\`\`\`
Education:
Bachelor of Science in Computer Science
RAK University - 2025
Blockchain-Verified Credential: edchain.io/verify?id=42
\`\`\`

## Advantages for Your Career

### For Job Applications
- ✅ No waiting for transcripts
- ✅ No notarized copies needed
- ✅ Instant verification = faster hiring

### For Further Education
- ✅ Easy transfer credit validation
- ✅ Simplified admissions process
- ✅ International recognition

### For Immigration
- ✅ Accepted proof of education
- ✅ Reduces document fraud concerns
- ✅ Faster processing times

## Frequently Asked Questions

**Q: Do I need to keep my wallet connected?**
A: No, your degree is permanently recorded. The wallet just proves ownership.

**Q: What if I lose access to my wallet?**
A: Your degree still exists on the blockchain. Contact your university for re-verification.

**Q: Can I sell or transfer my degree?**
A: No, it's a "soulbound" token - permanently linked to your wallet.

**Q: Is my personal information public?**
A: Only your name and degree details are on-chain. No private data.

**Q: What if my university loses data?**
A: Your degree exists independently on the blockchain forever.`,
  },
  "platform-admin-guide": {
    id: 8,
    title: "Platform Administrator Guide",
    slug: "platform-admin-guide",
    description: "Guide for site administrators to manage universities and the platform",
    category: "For Administrators",
    target_audience: "Platform Admins",
    icon: "Shield",
    content: `## Overview

This guide is for platform administrators who manage the overall EdChain system, including university approvals and platform settings.

## Accessing Admin Panel

![Admin Login](/placeholder.svg?height=400&width=600&query=Platform admin login page)

1. Go to [/admin/login](/admin/login)
2. Enter your admin credentials
3. Connect your admin wallet
4. Access the admin dashboard

## Dashboard Overview

![Dashboard](/placeholder.svg?height=500&width=600&query=Platform admin dashboard with university stats)

The admin dashboard shows:

- 🏛️ Total universities registered
- ⏳ Pending approvals count
- 📜 Total degrees issued
- 📊 Platform statistics
- 📋 Recent activity log

## Managing Universities

### Viewing All Universities

![Universities](/placeholder.svg?height=400&width=600&query=Admin universities list with filters)

1. Navigate to **Universities** in sidebar
2. View all registered universities
3. Filter by status (Active/Inactive)
4. Search by name or ID

### Approving New Universities

![Pending](/placeholder.svg?height=400&width=600&query=Pending university approvals queue)

1. Go to **Pending Approvals**
2. Review each submission:
   - University name and details
   - Admin wallet address
   - Contact information
   - Subscription plan
3. Verify legitimacy (website, accreditation)
4. Click **"Approve"** or **"Reject"**
5. Confirm the blockchain transaction

### Adding Universities Manually

![Add](/placeholder.svg?height=400&width=600&query=Add university form with wallet address)

For manual onboarding:

1. Click **"+ Add University"**
2. Enter university details:
   - Name (English/Arabic)
   - Admin wallet address
3. Click **"Register on Blockchain"**
4. Confirm in MetaMask

### Activating/Deactivating Universities

1. Find the university in the list
2. Click the status toggle
3. Confirm the action
4. Deactivated universities cannot issue new degrees

## Managing Site Content (CMS)

### FAQ Management

![FAQ](/placeholder.svg?height=300&width=600&query=CMS FAQ management interface)

1. Go to **CMS > FAQ**
2. Add/edit/delete questions
3. Organize by category
4. Set display order

### ROI Case Studies

![ROI](/placeholder.svg?height=300&width=600&query=CMS ROI case studies management)

1. Go to **CMS > ROI Cases**
2. Add customer success stories
3. Include metrics and testimonials
4. Mark featured case studies

### Documentation

![Docs](/placeholder.svg?height=300&width=600&query=CMS documentation editor)

1. Go to **CMS > Documentation**
2. Edit guide content (Markdown)
3. Add images to \`/public/docs/images/\`
4. Set target audience and category

### Contact Submissions

![Contact](/placeholder.svg?height=300&width=600&query=Contact form submissions inbox)

1. Go to **CMS > Contact**
2. View all form submissions
3. Mark as responded
4. Add internal notes

### Newsletter Subscribers

![Newsletter](/placeholder.svg?height=300&width=600&query=Newsletter subscribers list with export)

1. Go to **CMS > Newsletter**
2. View subscriber list
3. Export for email campaigns
4. Manage unsubscribes

## Security Best Practices

- 🔐 **Use Hardware Wallet:** For admin account
- 📱 **Enable 2FA:** On all related accounts
- 📋 **Audit Regularly:** Check all admin actions
- 🔑 **Backup Keys:** Secure recovery phrase
- 👥 **Limit Access:** Minimal admin accounts`,
  },
}

const staticDocsList = Object.values(staticDocsContent)

export default function DocPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const [doc, setDoc] = useState<DocGuide | null>(staticDocsContent[slug] || null)
  const [loading, setLoading] = useState(true)
  const [allDocs, setAllDocs] = useState<DocGuide[]>(staticDocsList)

  useEffect(() => {
    fetchDoc()
    fetchAllDocs()
  }, [slug])

  const fetchDoc = async () => {
    try {
      const response = await fetch(`/api/cms/docs/${slug}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.content) {
          setDoc(data)
        }
      }
    } catch (error) {
      console.error("Error fetching doc:", error)
      // Keep static content as fallback
    } finally {
      setLoading(false)
    }
  }

  const fetchAllDocs = async () => {
    try {
      const response = await fetch("/api/cms/docs")
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        setAllDocs(data)
      }
    } catch (error) {
      console.error("Error fetching all docs:", error)
    }
  }

  const currentIndex = allDocs.findIndex((d) => d.slug === slug)
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null

  if (loading && !doc) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container py-20">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-12 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-96 bg-muted rounded mt-8" />
          </div>
        </div>
      </div>
    )
  }

  if (!doc) {
    router.push("/docs")
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      {/* Breadcrumb */}
      <section className="border-b border-border py-4">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{doc.category}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{doc.title}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 flex-1">
        <div className="container max-w-4xl">
          <div className="mx-auto">
            {/* Article Header */}
            <div className="mb-12">
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Documentation
              </Link>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">{doc.category}</span>
                <span className="text-xs bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {doc.target_audience}
                </span>
              </div>

              <h1 className="text-4xl font-bold mb-4">{doc.title}</h1>
              <p className="text-xl text-muted-foreground">{doc.description}</p>

              <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ~5 min read
                </span>
              </div>
            </div>

            {/* Article Content */}
            <Card className="bg-card border-border">
              <CardContent className="p-8 md:p-12">
                <article className="prose prose-invert prose-primary max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground flex items-center gap-3">
                          <div className="w-1 h-6 bg-primary rounded-full" />
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">{children}</h3>
                      ),
                      p: ({ children }) => <div className="text-muted-foreground leading-relaxed mb-4">{children}</div>,
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-4 ml-4">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                      a: ({ href, children }) => (
                        <Link
                          href={href || "#"}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {children}
                          {href?.startsWith("http") && <ExternalLink className="h-3 w-3" />}
                        </Link>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children }) => (
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-primary">{children}</code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4 border border-border">
                          {children}
                        </pre>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="w-full border-collapse border border-border">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border px-4 py-2 text-muted-foreground">{children}</td>
                      ),
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      img: ({ src, alt }) => (
                        <span className="block my-6 rounded-lg overflow-hidden border border-border">
                          <img src={src || "/placeholder.svg"} alt={alt || ""} className="w-full" />
                          {alt && (
                            <span className="block text-xs text-muted-foreground text-center py-2 bg-muted">{alt}</span>
                          )}
                        </span>
                      ),
                    }}
                  >
                    {doc.content}
                  </ReactMarkdown>
                </article>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              {prevDoc ? (
                <Link href={`/docs/${prevDoc.slug}`}>
                  <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                    <ChevronLeft className="h-4 w-4" />
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">Previous</div>
                      <div className="text-sm">{prevDoc.title}</div>
                    </div>
                  </Button>
                </Link>
              ) : (
                <div />
              )}
              {nextDoc ? (
                <Link href={`/docs/${nextDoc.slug}`}>
                  <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Next</div>
                      <div className="text-sm">{nextDoc.title}</div>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-12 bg-card/50">
        <div className="container">
          <Card className="bg-card border-border max-w-4xl mx-auto">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Need More Help?</h3>
              <p className="text-muted-foreground mb-6">
                Can't find what you're looking for? Our support team is ready to assist you.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/faq">
                  <Button variant="outline">Browse FAQ</Button>
                </Link>
                <Link href="/contact">
                  <Button className="bg-primary hover:bg-primary/90">Contact Support</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
