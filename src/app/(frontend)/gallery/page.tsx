import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'

import { getPayloadClient } from '../../../lib/payload'
import { CONTENT_TAGS, cachedContent } from '../../../lib/contentCache'
import { getSiteSettings } from '../../../lib/getSettings'
import { whatsappLink, DEFAULT_WA_MESSAGE } from '../../../lib/site'
import { mediaUrl, mediaAlt } from '../../../lib/media'
import { GalleryGrid, type GalleryItem } from '../../../components/GalleryGrid'
import { KolamRosette } from '../../../components/Kolam'

// A cached page (CLAUDE.md, "Page caching"): rebuilt at most every 5 minutes, at once when /admin saves.
export const revalidate = 300

export const metadata: Metadata = {
  alternates: { canonical: '/gallery' },
  title: 'Our Work',
  description:
    'Browse past weddings, birthdays, corporate functions, housewarmings and sports events managed by Zenfest Events across Tamil Nadu.',
}

// Cached (lib/contentCache.ts): saving a project in /admin clears it, and this page with it.
const readProjects = cachedContent(
  async (): Promise<GalleryItem[]> => {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'projects', depth: 1, limit: 100, sort: '-createdAt' })
    return res.docs.map((p: any): GalleryItem => {
      const cover = mediaUrl(p.coverImage, 'card')
      const photos = [
        { url: mediaUrl(p.coverImage, 'feature'), alt: mediaAlt(p.coverImage, p.title) },
        ...(Array.isArray(p.photos)
          ? p.photos.map((m: any) => ({ url: mediaUrl(m, 'feature'), alt: mediaAlt(m, p.title) }))
          : []),
      ].filter((x) => x.url)
      return {
        id: String(p.id),
        title: p.title,
        category: p.category?.title || 'Event',
        categorySlug: p.category?.slug || 'event',
        branch: p.branch,
        location: p.location,
        cover,
        photos,
      }
    })
  },
  'gallery-projects',
  [CONTENT_TAGS.projects],
)

async function getProjects(): Promise<GalleryItem[]> {
  try {
    return await readProjects()
  } catch {
    return []
  }
}

export default async function GalleryPage() {
  const [items, settings] = await Promise.all([getProjects(), getSiteSettings()])
  const wa = whatsappLink(settings?.contact?.whatsapp, DEFAULT_WA_MESSAGE)

  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="eyebrow">Highlights</p>
          <h1 className="display-l">
            A gallery of <span className="italic accent">celebrations</span>
          </h1>
          <p className="lede">
            Every event tells a story. Filter by occasion and tap any photo to see more —
            this is the work our clients choose us for.
          </p>
        </header>

        {items.length > 0 ? (
          <GalleryGrid items={items} />
        ) : (
          /* No projects uploaded yet. Resolves itself once the first project is
             added in /admin — nothing to switch off here. */
          <div className="coming-soon">
            <KolamRosette size={300} className="coming-soon__kolam" />
            <p className="eyebrow">Coming soon</p>
            <h2 className="display-m">The gallery is being put together</h2>
            <p className="lede">
              We&apos;re selecting the best photographs from hundreds of weddings,
              birthdays, housewarmings and corporate events across Tamil Nadu. They&apos;ll
              be here shortly — in the meantime, tell us what you&apos;re planning and
              we&apos;ll send you photos from events just like it.
            </p>
            <div className="btn-row">
              <Link className="btn btn--primary" href="/contact">
                Request a callback
              </Link>
              {settings?.contact?.whatsapp && (
                <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
                  See recent work on WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
