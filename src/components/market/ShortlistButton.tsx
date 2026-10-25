'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

import { toggleShortlist } from '../../app/(frontend)/account/actions'
import { useAccountSession } from './useAccountSession'

/**
 * ♡ / ♥ — saves a vendor to the couple's shortlist; logged-out visitors are sent to log in.
 * Without `initial` (cached pages such as the homepage can't read the login), the heart
 * fills in from the browser's session once it loads; that needs `vendorId`.
 */
export function ShortlistButton({
  slug,
  vendorId,
  initial,
  variant = 'icon',
}: {
  slug: string
  vendorId?: number
  initial?: boolean
  variant?: 'icon' | 'button'
}) {
  const router = useRouter()
  const session = useAccountSession()
  // null until the visitor clicks; until then the heart shows what the server or session knows.
  const [mine, setMine] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const on = mine ?? initial ?? (vendorId !== undefined && Boolean(session?.shortlist?.includes(vendorId)))

  async function click(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const was = on
    setBusy(true)
    setMine(!was)
    const res = await toggleShortlist(slug).catch(() => null)
    setBusy(false)
    if (!res?.ok) {
      setMine(was)
      if (res && 'login' in res && res.login) {
        router.push(`/account/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      }
      return
    }
    setMine(res.shortlisted)
  }

  return (
    <button
      type="button"
      className={variant === 'icon' ? `heart ${on ? 'is-on' : ''}` : `btn btn--ghost heart-btn ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      aria-label={on ? 'Remove from shortlist' : 'Save to shortlist'}
      onClick={click}
      disabled={busy}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.6 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
          fill={on ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {variant === 'button' && <span>{on ? 'Shortlisted' : 'Shortlist'}</span>}
    </button>
  )
}
