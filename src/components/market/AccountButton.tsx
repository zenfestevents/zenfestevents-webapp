'use client'

import React from 'react'
import Link from 'next/link'

import { useAccountSession } from './useAccountSession'

/**
 * "Log in" or the person's first name, linking to their account, with their runs as a
 * small gold chip. The session is fetched after paint (and again on navigation, e.g.
 * right after logging in), so the server layout never blocks on auth.
 */
export function AccountButton({ variant = 'header' }: { variant?: 'header' | 'menu' }) {
  const session = useAccountSession()

  const href = session?.kind === 'vendor' ? '/vendors/dashboard' : session?.kind === 'customer' ? '/account' : '/account/login'
  const label = session?.kind ? session.name || 'My account' : 'Log in'
  const runs = session?.standing?.runs

  if (variant === 'menu') {
    return (
      <Link href={href} className="mobile-menu__link mobile-menu__link--sub">
        {session?.kind ? `${session.kind === 'vendor' ? 'Vendor dashboard' : 'My account'}` : 'Log in / Sign up'}
        {runs !== undefined && <span className="runs-chip mono">{runs.toLocaleString('en-IN')} runs</span>}
      </Link>
    )
  }
  return (
    <Link
      href={href}
      className="account-btn"
      aria-label={session?.kind ? `Your account (${label}${runs !== undefined ? `, ${runs} runs` : ''})` : 'Log in'}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="account-btn__label">{session ? label : ' '}</span>
      {runs !== undefined && (
        <span className="runs-chip mono" aria-hidden="true">
          {runs.toLocaleString('en-IN')}
        </span>
      )}
    </Link>
  )
}
