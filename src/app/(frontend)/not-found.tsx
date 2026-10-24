import React from 'react'
import Link from 'next/link'

import { KolamRosette } from '../../components/Kolam'

/** Branded "page not found" for anything under the public site (e.g. a removed vendor listing). */
export default function NotFound() {
  return (
    <section className="section band-ink not-found">
      <div className="container not-found__inner">
        <KolamRosette size={180} className="not-found__kolam" draw />
        <p className="howzat not-found__howzat" aria-hidden="true">
          Clean bowled
        </p>
        <p className="eyebrow">Page not found</p>
        <h1 className="display-l">
          This page is <span className="accent">out</span>, back to the pavilion
        </h1>
        <p className="lede">
          The page you were looking for has moved or no longer exists. These will get you back on track.
        </p>
        <div className="btn-row not-found__actions">
          <Link className="btn btn--primary" href="/">
            Go to the homepage
          </Link>
          <Link className="btn btn--ghost" href="/enquire">
            Plan your event
          </Link>
          <Link className="btn btn--ghost" href="/contact">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  )
}
