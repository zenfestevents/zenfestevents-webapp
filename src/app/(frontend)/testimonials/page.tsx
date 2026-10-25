import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'
import type { Metadata } from 'next'

import { getSiteSettings } from '../../../lib/getSettings'
import { listTestimonials } from '../../../lib/testimonials'
import { Stars, TestimonialCard } from '../../../components/TestimonialCard'
import { LaurelRating } from '../../../components/game'

// A cached page (CLAUDE.md, "Page caching"): rebuilt at most every 5 minutes, at once when /admin saves.
export const revalidate = 300

export const metadata: Metadata = {
  alternates: { canonical: '/testimonials' },
  title: 'Testimonials',
  description:
    'What families and businesses across Tamil Nadu say about Zenfest Events — reviews of our weddings, birthdays, baby showers, housewarmings and corporate events.',
}

/**
 * Client reviews (collections/Testimonials.ts), mostly copied word for word from the
 * Google Business listing, with the live rating and a link to every review on Google.
 * No published reviews → 404, and the menu hides the link (lib/testimonials.ts).
 */
export default async function TestimonialsPage() {
  const [all, settings] = await Promise.all([listTestimonials(), getSiteSettings()])
  if (!all.length) notFound()
  const google = settings.reviews

  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="eyebrow">From the stands</p>
          <h1 className="display-l">
            What families <span className="italic accent">say</span>
          </h1>
          <p className="lede">
            Real reviews from weddings, birthdays, baby showers, housewarmings and business events we&apos;ve run
            across Tamil Nadu, in our clients&apos; own words.
          </p>
        </header>

        {google?.googleRating && (
          <div className="reviews-summary card">
            <LaurelRating
              score={google.googleRating.toFixed(1)}
              caption={google.googleCount ? `${google.googleCount} reviews on Google` : 'Rated on Google'}
            />
            <Stars rating={google.googleRating} className="reviews-summary__stars" />
            {google.googleUrl && (
              <a className="btn btn--ghost reviews-summary__btn" href={google.googleUrl} target="_blank" rel="noopener">
                Read all reviews on Google
              </a>
            )}
          </div>
        )}

        <div className="testimonial-grid">
          {all.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>

        <div className="btn-row testimonial-cta">
          <Link className="btn btn--primary" href="/enquire">
            Plan your event
          </Link>
          <Link className="btn btn--ghost" href="/gallery">
            See our work
          </Link>
        </div>
      </div>
    </section>
  )
}
