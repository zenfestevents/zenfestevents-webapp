'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Session = { kind: 'vendor' | 'customer' | null; name: string }

/**
 * "Log in" or the person's first name, linking to their account. Fetches the
 * session after paint (and again on navigation, e.g. right after logging in),
 * so the server layout never blocks on auth.
 */
export function AccountButton({ variant = 'header' }: { variant?: 'header' | 'menu' }) {
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let live = true
    fetch('/account/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s: Session) => live && setSession(s))
      .catch(() => live && setSession({ kind: null, name: '' }))
    return () => {
      live = false
    }
  }, [pathname])

  const href = session?.kind === 'vendor' ? '/vendors/dashboard' : session?.kind === 'customer' ? '/account' : '/account/login'
  const label = session?.kind ? session.name || 'My account' : 'Log in'

  if (variant === 'menu') {
    return (
      <Link href={href} className="mobile-menu__link mobile-menu__link--sub">
        {session?.kind ? `${session.kind === 'vendor' ? 'Vendor dashboard' : 'My account'}` : 'Log in / Sign up'}
      </Link>
    )
  }
  return (
    <Link href={href} className="account-btn" aria-label={session?.kind ? `Your account (${label})` : 'Log in'}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="account-btn__label">{session ? label : ' '}</span>
    </Link>
  )
}
