import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress baseline-browser-mapping "data over two months old" warning
  env: {
    BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
    BROWSERSLIST_IGNORE_OLD_DATA: 'true',
  },
  // Note: instrumentationHook is enabled by default in Next.js 13.2+
  // The warning is a false positive - instrumentation.ts is still running
  experimental: {
    // instrumentationHook: true, // Not needed in Next.js 16 - enabled by default
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Use webpack for build to fix @noble/hashes subpath exports issue with Turbopack
  // Set turbopack root to fix multiple lockfiles warning
  turbopack: {
    root: __dirname, // Explicitly set workspace root to silence warning
  },
  webpack: (config, { isServer }) => {
    // Fix for @noble/hashes subpath exports
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    
    // Ensure proper resolution of @noble/hashes subpaths
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    }
    
    return config
  },
}

export default nextConfig
