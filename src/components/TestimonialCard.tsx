import React from 'react'

import type { PublicTestimonial } from '../lib/testimonials'

/** Gold stars for a 1–5 rating, read out as "4 out of 5 stars". */
export function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  const full = Math.round(rating)
  return (
    <span className={`stars ${className}`} role="img" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(full)}
      <span className="stars__empty">{'★'.repeat(Math.max(0, 5 - full))}</span>
    </span>
  )
}

/** One review, word for word. `clamp` shortens it to a few lines (homepage strip). */
export function TestimonialCard({ t, clamp = false }: { t: PublicTestimonial; clamp?: boolean }) {
  return (
    <figure className="testimonial card">
      <Stars rating={t.rating} />
      <blockquote className={`testimonial__text ${clamp ? 'testimonial__text--clamp' : ''}`}>{t.text}</blockquote>
      <figcaption className="testimonial__by">
        <strong>{t.name}</strong>
        {t.event && <span> · {t.event}</span>}
        {t.source === 'google' && <span className="testimonial__source">Google review</span>}
      </figcaption>
    </figure>
  )
}
