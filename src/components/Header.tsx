'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { COMING_SOON, FEATURES } from '../lib/features'
import { DEFAULT_WA_MESSAGE, SITE_FALLBACK, whatsappLink, type SiteSettings } from '../lib/site'
import { AiLink } from './ai/ChatLauncher'
import { AccountButton } from './market/AccountButton'

const SIGNUP_ENABLED = false

type NavItem = { href: string; label: string; also?: string[] }

/**
 * The live links, in order. Switched-off features (lib/features.ts) drop out here
 * and appear in the phone menu's "Coming soon" group instead. Packages lives on the
 * Services page and in the footer (it's "coming soon" itself, see PACKAGES_READY).
 */
const NAV: NavItem[] = [
  ...(FEATURES.marketplace ? [{ href: '/marketplace', label: 'Marketplace' }] : []),
  { href: '/gallery', label: 'Our Work' },
  { href: '/services', label: 'Services', also: ['/packages'] },
  ...(FEATURES.earn ? [{ href: '/earn', label: 'Earn from events' }] : []),
  // The gift registry is part of the shop now; its pages light up "Shop".
  { href: '/shop', label: 'Shop', also: ['/registry'] },
  ...(FEATURES.polls ? [{ href: '/polls', label: 'Polls' }] : []),
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

const SOON = COMING_SOON.filter((f) => !FEATURES[f.key])

/** A short bar (everything optional switched off) fits on a small laptop. */
const COMPACT = NAV.length <= 6

const isActive = (pathname: string, item: NavItem) =>
  [item.href, ...(item.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`))

export function Header({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const wa = whatsappLink(settings?.contact?.whatsapp || SITE_FALLBACK.contact.whatsapp, DEFAULT_WA_MESSAGE)

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''} ${COMPACT ? 'site-header--compact' : ''}`}>
      <div className="container site-header__inner">
        <Link href="/" className="wordmark" aria-label="Zenfest Events home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.png" alt="" className="wordmark__mark" width={44} height={44} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wordmark.png"
            alt="Zenfest Events"
            className="wordmark__lockup"
            width={525}
            height={170}
          />
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`site-nav__link ${isActive(pathname, item) ? 'is-active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-header__cta">
          {/* Zenfest AI is the headline feature. With the AI off it's hidden rather than a
              second "Plan your event" — the button beside it owns that action. */}
          <AiLink className="btn btn--primary site-header__ai" fallback={false}>
            ✦ Zenfest AI
          </AiLink>
          <Link className="btn btn--primary site-header__plan" href="/enquire">
            Plan your event
          </Link>
          <Link className="btn btn--gold" href="/vendors">
            For Vendors
          </Link>
          {FEATURES.marketplace && <AccountButton />}
          {SIGNUP_ENABLED && (
            <Link className="btn btn--primary btn--stack" href="/signup">
              <span className="btn__main">Sign Up</span>
              <span className="btn__sub">₹100 off your total bill</span>
            </Link>
          )}
        </div>

        <button
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`nav-toggle__bars ${open ? 'is-open' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="mobile-menu">
          <nav className="mobile-menu__nav" aria-label="Mobile">
            <p className="mobile-menu__group">Explore</p>
            <Link href="/" className="mobile-menu__link">
              Home
            </Link>
            <AiLink className="mobile-menu__link mobile-menu__link--ai" fallback={false} onOpen={() => setOpen(false)}>
              ✦ Plan with Zenfest AI
            </AiLink>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="mobile-menu__link">
                {item.label}
              </Link>
            ))}

            {SOON.length > 0 && (
              <>
                <p className="mobile-menu__group">Coming soon</p>
                {SOON.map((f) => (
                  <Link key={f.key} href={f.href} className="mobile-menu__link mobile-menu__link--soon">
                    {f.label} <span className="mobile-menu__soon">Soon</span>
                  </Link>
                ))}
              </>
            )}

            <p className="mobile-menu__group">For vendors</p>
            <Link href="/vendors/partner" className="mobile-menu__link">
              Partner with Zenfest
            </Link>
            {FEATURES.marketplace ? (
              <Link href="/vendors/marketplace" className="mobile-menu__link">
                List on the marketplace — free
              </Link>
            ) : (
              <Link href="/vendors" className="mobile-menu__link mobile-menu__link--soon">
                List on the marketplace <span className="mobile-menu__soon">Soon</span>
              </Link>
            )}
            {FEATURES.marketplace && <AccountButton variant="menu" />}
            {SIGNUP_ENABLED && (
              <Link href="/signup" className="mobile-menu__link mobile-menu__link--sub">
                Sign up — ₹100 off your total bill
              </Link>
            )}
          </nav>
          <div className="mobile-menu__cta btn-row">
            <Link className="btn btn--primary" href="/enquire">
              Plan your event
            </Link>
            <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
