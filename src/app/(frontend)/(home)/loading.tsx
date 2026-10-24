import React from 'react'

import { KolamRosette } from '../../../components/Kolam'

/**
 * Shown the moment someone clicks Home, while the homepage renders on the server — the
 * old page used to just sit there (2026-10-22). It also lets Next prefetch Home up to
 * this point. Only the homepage gets it (the `(home)` group): a loading screen makes a
 * page stream, and a streamed notFound() answers 200 instead of 404 (/shop, /polls).
 */
export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <KolamRosette size={120} className="page-loading__kolam" />
      <span className="page-loading__text mono" aria-hidden="true">
        Taking guard…
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
