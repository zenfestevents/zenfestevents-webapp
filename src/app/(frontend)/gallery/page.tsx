import React from 'react'
import type { Metadata } from 'next'

import { getPayloadClient } from '../../../lib/payload'
import { mediaUrl, mediaAlt } from '../../../lib/media'
import { GalleryGrid, type GalleryItem } from '../../../components/GalleryGrid'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Our Work',
  description:
    'Browse past weddings, birthdays, corporate functions, housewarmings and sports events managed by Zenfest Events across Chennai.',
}

async function getProjects(): Promise<GalleryItem[]> {
  try {
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
  } catch {
    return []
  }
}

export default async function GalleryPage() {
  const items = await getProjects()

  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="eyebrow">Our Work</p>
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
          <div className="empty">
            <p className="muted">
              Our gallery is being prepared. Please check back soon, or contact us to see
              recent work directly.
            </p>
            <a className="btn btn--primary" href="/contact">
              Contact us
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
