import type { MetadataRoute } from 'next'

import { SITE_URL } from '../lib/seo'

/**
 * /robots.txt. Blocks only the back office, host dashboards (their URL holds the manage
 * key) and redirect links. Login, guest-registry and other noindex pages stay crawlable
 * on purpose: Google has to fetch a page to see its "noindex".
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/auth/', '/dashboard/', '/shop/go/', '/r/*/go/', '/invite/', '/plan/chat'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
