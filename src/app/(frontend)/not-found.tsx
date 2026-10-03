import React from 'react'
import Link from 'next/link'

import { KolamRosette } from '../../components/Kolam'

/** Branded "page not found" for anything under the public site (e.g. a removed vendor listing). */
export default function NotFound() {
  return (
    <section className="section band-ink not-found">
      <div className="container not-found__inner">
        <KolamRosette size={180} className="not-found__kolam" draw />
        <p className="eyebrow">Page not found</p>
        <h1 className="display-l">
          This doorway has <span className="accent">no kolam</span> yet
        </h1>
        <p className="lede">
          The page you were looking for has moved or no longer exists. These will get you back on track.
        </p>
        <div className="btn-row not-found__actions">
          <Link className="btn btn--primary" href="/">
            Go to the homepage
          </Link>
          <Link className="btn btn--ghost" href="/marketplace">
            Browse vendors
          </Link>
          <Link className="btn btn--ghost" href="/contact">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  )
}
