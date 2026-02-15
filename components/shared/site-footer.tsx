import Link from "next/link"
import { EdChainLogo } from "@/components/shared/edchain-logo"

const footerLinks = {
  product: [
    { href: "/solutions", label: "Solutions" },
    { href: "/roi", label: "ROI Calculator" },
    { href: "/subscribe", label: "Pricing" },
    { href: "/verify", label: "Verify Degree" },
    { href: "/customers", label: "Customers" },
  ],
  resources: [
    { href: "/docs", label: "Documentation" },
    { href: "/docs/metamask-setup", label: "MetaMask Guide" },
    { href: "/docs/issuing-degrees", label: "Issuing Guide" },
    { href: "/faq", label: "FAQ" },
  ],
  company: [
    { href: "/contact", label: "Contact Us" },
    { href: "/about", label: "About" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
  connect: [
    { href: "/connect", label: "Connect Wallet" },
    { href: "/university/login", label: "University Login" },
    { href: "/admin/login", label: "Admin Login" },
  ],
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-card/50">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <EdChainLogo size="lg" />
            </Link>
            <p className="text-sm text-muted-foreground">
              Blockchain-verified university degree certificates on Base Mainnet.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Access</h3>
            <ul className="space-y-2">
              {footerLinks.connect.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} EdChain. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built on <span className="text-primary">Base Mainnet</span> (Chain ID: 8453)
          </p>
        </div>
      </div>
    </footer>
  )
}
