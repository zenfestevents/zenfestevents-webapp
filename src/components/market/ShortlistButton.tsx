'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

import { toggleShortlist } from '../../app/(frontend)/account/actions'

/** ♡ / ♥ — saves a vendor to the couple's shortlist; logged-out visitors are sent to log in. */
export function ShortlistButton({
  slug,
  initial = false,
  variant = 'icon',
}: {
  slug: string
  initial?: boolean
  variant?: 'icon' | 'button'
}) {
  const router = useRouter()
  const [on, setOn] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function click(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setBusy(true)
    setOn((v) => !v)
    const res = await toggleShortlist(slug).catch(() => null)
    setBusy(false)
    if (!res?.ok) {
      setOn(initial)
      if (res && 'login' in res && res.login) {
        router.push(`/account/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      }
      return
    }
    setOn(res.shortlisted)
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
