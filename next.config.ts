import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Dev only: lets a phone on the office Wi-Fi test the local server at this address.
  // Without it Next blocks the page's JavaScript there (menu dead, sections never
  // reveal). Update it if the computer's LAN address changes; production ignores it.
  allowedDevOrigins: ['192.168.1.3'],
  // The old Firebase polls site (polls.zenfestevents.in) now lives at /polls.
  // Works once that subdomain is added to this Vercel project.
  async redirects() {
    const fromPolls = [{ type: 'host' as const, value: 'polls.zenfestevents.in' }]
    const to = 'https://www.zenfestevents.in'
    return [
      { source: '/closed-polls', has: fromPolls, destination: `${to}/polls/closed`, permanent: true },
      { source: '/login', has: fromPolls, destination: `${to}/polls`, permanent: true },
      { source: '/', has: fromPolls, destination: `${to}/polls`, permanent: true },
      { source: '/polls/:path*', has: fromPolls, destination: `${to}/polls/:path*`, permanent: true },
      { source: '/:path*', has: fromPolls, destination: `${to}/polls`, permanent: true },
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
