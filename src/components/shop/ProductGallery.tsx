'use client'

import React, { useState } from 'react'

import type { PublicPhoto } from '../../lib/marketplace'

/** Main photo + thumbnails on a product page. */
export function ProductGallery({ images, title }: { images: PublicPhoto[]; title: string }) {
  const [i, setI] = useState(0)
  const main = images[i]
  if (!main) return <div className="sp-gallery__main sp-card__noimg" aria-hidden="true" />
  return (
    <div className="sp-gallery">
      <div className="sp-gallery__main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main.url} alt={main.alt || title} referrerPolicy="no-referrer" />
      </div>
      {images.length > 1 && (
        <div className="sp-gallery__thumbs">
          {images.map((img, n) => (
            <button
              key={`${img.id}-${n}`}
              type="button"
              className={n === i ? 'is-active' : ''}
              onClick={() => setI(n)}
              aria-label={`Photo ${n + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumb} alt="" referrerPolicy="no-referrer" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
