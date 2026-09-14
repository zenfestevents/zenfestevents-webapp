'use client'

import React, { useEffect, useMemo, useState } from 'react'

export type GalleryItem = {
  id: string
  title: string
  category: string
  categorySlug: string
  branch?: string
  location?: string
  cover: string
  photos: { url: string; alt: string }[]
}

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState<string>('all')
  const [lightbox, setLightbox] = useState<{ item: GalleryItem; index: number } | null>(null)

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach((i) => map.set(i.categorySlug, i.category))
    return [['all', 'All events'], ...Array.from(map.entries())] as [string, string][]
  }, [items])

  const filtered = active === 'all' ? items : items.filter((i) => i.categorySlug === active)

  return (
    <>
      <div className="gal-filter" role="tablist" aria-label="Filter by event type">
        {categories.map(([slug, label]) => (
          <button
            key={slug}
            role="tab"
            aria-selected={active === slug}
            className={`chip ${active === slug ? 'is-active' : ''}`}
            onClick={() => setActive(slug)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="muted text-center">No projects here yet — check back soon.</p>
      ) : (
        <div className="gal-grid">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              className={`gal-card ${i % 5 === 0 ? 'gal-card--tall' : ''}`}
              onClick={() => setLightbox({ item, index: 0 })}
              aria-label={`View ${item.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.cover} alt={item.title} loading="lazy" />
              <span className="gal-card__meta">
                <span className="gal-card__cat">{item.category}</span>
                <span className="gal-card__title">{item.title}</span>
                {item.location && <span className="gal-card__loc">{item.location}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox
          item={lightbox.item}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndex={(index) => setLightbox({ item: lightbox.item, index })}
        />
      )}
    </>
  )
}

function Lightbox({
  item,
  index,
  onClose,
  onIndex,
}: {
  item: GalleryItem
  index: number
  onClose: () => void
  onIndex: (i: number) => void
}) {
  const photos = item.photos.length ? item.photos : [{ url: item.cover, alt: item.title }]
  const count = photos.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % count)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + count) % count)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [index, count, onClose, onIndex])

  const current = photos[index]

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={item.title} onClick={onClose}>
      <button className="lightbox__close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="lightbox__stage" onClick={(e) => e.stopPropagation()}>
        {count > 1 && (
          <button
            className="lightbox__nav lightbox__nav--prev"
            aria-label="Previous photo"
            onClick={() => onIndex((index - 1 + count) % count)}
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.alt || item.title} />
        {count > 1 && (
          <button
            className="lightbox__nav lightbox__nav--next"
            aria-label="Next photo"
            onClick={() => onIndex((index + 1) % count)}
          >
            ›
          </button>
        )}
        <div className="lightbox__caption">
          <strong>{item.title}</strong>
          <span className="muted">
            {item.category}
            {count > 1 ? ` · ${index + 1} / ${count}` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
