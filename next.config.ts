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
      // The area pages' only public address is /marketplace/<service>-in-<place> (below).
      { source: '/marketplace/area/:slug', destination: '/marketplace/:slug', permanent: true },
    ]
  },
  // /marketplace/birthday-decorators-in-guduvanchery → the cached area page (lib/areaPages.ts).
  // A rewrite because /marketplace/[category] reads the search filters and so can't be cached;
  // these run before dynamic routes, and category slugs never contain "-in-".
  async rewrites() {
    return [{ source: '/marketplace/:slug(.+-in-.+)', destination: '/marketplace/area/:slug' }]
  },
  // The hero film/stills and the logos keep fixed names, so Vercel serves them with
  // max-age=0 and every visit re-asks for each one. Let browsers keep them for a week
  // (then use the old copy while checking, for a day): returning visitors get them
  // without a round trip. Replacing one under the same name reaches them within a week;
  // a new file name reaches everyone at once.
  async headers() {
    const week = [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }]
    return [
      { source: '/hero/:path*', headers: week },
      { source: '/brand/:path*', headers: week },
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
