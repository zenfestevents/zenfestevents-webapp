import type { MetadataRoute } from 'next'

import { FEATURES, MARKETPLACE_SOON } from '../lib/features'
import { categoryCounts, listVendors } from '../lib/marketplace'
import { SITE_URL } from '../lib/seo'
import { hasTestimonials } from '../lib/testimonials'

// Rebuilt at most hourly: new live vendors and the first published review join on their own.
export const revalidate = 3600

/**
 * /sitemap.xml: the public pages worth finding on Google. Left out on purpose: logins,
 * dashboards, private registries (/r, /dashboard), noindex pages (/refer, /welcome),
 * the unadvertised ₹100 /signup and switched-off features (lib/features.ts). Pages that
 * only say "Coming soon" stay out until they launch.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const page = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'monthly') => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  })

  const none: Record<string, number> = {}
  // While the couples' side is "Coming soon" its pages are left out of the sitemap.
  const browse = FEATURES.marketplace && !MARKETPLACE_SOON
  const [reviews, counts, vendors] = await Promise.all([
    hasTestimonials().catch(() => false),
    browse ? categoryCounts().catch(() => none) : none,
    browse ? listVendors({ sort: 'new' }).catch(() => []) : [],
  ])

  return [
    page('/', 1, 'weekly'),
    page('/enquire', 0.9),
    page('/services', 0.9),
    page('/gallery', 0.8, 'weekly'),
    page('/about', 0.7),
    ...(reviews ? [page('/testimonials', 0.7, 'weekly')] : []),
    page('/contact', 0.7),
    ...(FEATURES.packages ? [page('/packages', 0.8)] : []),
    page('/vendors/partner', 0.6),
    page('/registry', 0.5),
    ...(FEATURES.marketplace
      ? [
          ...(browse ? [page('/marketplace', 0.8, 'daily')] : []),
          // Only categories with live vendors: an empty listing page is thin content.
          ...Object.entries(counts)
            .filter(([, n]) => n > 0)
            .map(([category]) => page(`/marketplace/${category}`, 0.7, 'daily')),
          ...vendors.map((v) => page(`/marketplace/v/${v.slug}`, 0.6, 'weekly')),
          page('/vendors', 0.5),
          page('/vendors/marketplace', 0.5),
          page('/rewards', 0.4),
        ]
      : []),
    ...(FEATURES.ai ? [page('/plan', 0.8)] : []),
    ...(FEATURES.earn ? [page('/earn', 0.5)] : []),
    ...(FEATURES.polls ? [page('/polls', 0.4, 'daily')] : []),
    page('/privacy', 0.2, 'monthly'),
  ]
}
