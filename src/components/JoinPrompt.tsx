'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { FEATURES } from '../lib/features'
import { BallDots } from './game'
import { useAccountSession } from './market/useAccountSession'

/** Shown at most once per browser session (owner, 2026-10-25: back on the next visit). */
const SEEN_KEY = 'zenfest-join-prompt'
const DELAY_MS = 8000

/** Pages where it would get in the way: sign-up/login and dashboards, forms, the chat,
 *  invite landings, the Runs club pages themselves and the registry's own pages. */
const QUIET = ['/account', '/vendors', '/enquire', '/plan', '/welcome', '/invite', '/rewards', '/refer', '/r/', '/dashboard']
const isQuiet = (path: string) => QUIET.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`))

function seen() {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Private mode or blocked storage: it may show again on the next page, nothing worse.
  }
}

/**
 * The sign-up popup: 8 s into a page, a visitor who isn't logged in is invited to join
 * (couple account by WhatsApp number) with the runs it earns, from Reward Settings via
 * /account/session. Never while signing up is closed (FEATURES.marketplace off).
 */
export function JoinPrompt() {
  const pathname = usePathname()
  const session = useAccountSession()
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  const eligible = FEATURES.marketplace && session !== null && session.kind === null && !isQuiet(pathname)

  useEffect(() => {
    setOpen(false)
    if (!eligible || seen()) return
    const timer = window.setTimeout(() => {
      // Not over another dialog (registry claim sheet, voter sheet…), and only once.
      if (seen() || document.querySelector('dialog[open]')) return
      markSeen()
      setOpen(true)
    }, DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [eligible, pathname])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  if (!eligible) return null

  const join = session?.join
  const loginHref = `/account/login?next=${encodeURIComponent(pathname)}`

  return (
    <dialog
      ref={ref}
      className="join"
      aria-labelledby="join-title"
      onClose={() => setOpen(false)}
      // A click on the backdrop lands on the dialog itself.
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="join__inner">
        <button type="button" className="join__close" aria-label="Close" onClick={() => setOpen(false)}>
          ×
        </button>
        <BallDots done={1} total={6} className="join__balls" />
        <p className="eyebrow">Zenfest Runs club · Free</p>
        <h2 id="join-title" className="display-m join__title">
          Join Zenfest and <span className="accent">score runs</span>
        </h2>
        <ul className="join__runs">
          {join?.joined ? (
            <li>
              <b>+{join.joined} runs</b> when you sign up
            </li>
          ) : (
            <li>Score runs from the day you sign up</li>
          )}
          {join?.enquiry ? (
            <li>
              <b>+{join.enquiry} runs</b> when you plan your first event with us
            </li>
          ) : null}
          <li>Climb the levels: each one takes ₹ off your next event quote</li>
        </ul>
        <p className="muted join__how">Sign up with your WhatsApp number. No password to remember.</p>
        <Link className="btn btn--primary join__cta" href="/account/signup" onClick={() => setOpen(false)}>
          Sign up free
        </Link>
        <p className="join__login">
          Already a member?{' '}
          <Link href={loginHref} onClick={() => setOpen(false)}>
            Log in
          </Link>
        </p>
        <p className="join__vendor">
          <Link href="/vendors/signup" onClick={() => setOpen(false)}>
            Are you a vendor? List your business free →
          </Link>
        </p>
      </div>
    </dialog>
  )
}
