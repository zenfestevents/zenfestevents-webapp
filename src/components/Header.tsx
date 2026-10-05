'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { SiteSettings } from '../lib/site'
import { AiLink } from './ai/ChatLauncher'
import { AccountButton } from './market/AccountButton'

const SIGNUP_ENABLED = false

const NAV: { href: string; label: string; also?: string[] }[] = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/gallery', label: 'Our Work' },
  { href: '/services', label: 'Services' },
  { href: '/packages', label: 'Packages' },
  { href: '/earn', label: 'Earn from events' },
  // The gift registry is part of the shop now; its pages light up "Shop".
  { href: '/shop', label: 'Shop', also: ['/registry'] },
  { href: '/polls', label: 'Polls' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

const isActive = (pathname: string, item: (typeof NAV)[number]) =>
  [item.href, ...(item.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`))

// `settings` is unused since WhatsApp left the menu; kept so layout.tsx needn't change.
export function Header(_props: { settings: SiteSettings }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
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
              second "Get a callback" — the hero already owns that action. */}
          <AiLink className="btn btn--primary site-header__ai" fallback={false}>
            ✦ Zenfest AI
          </AiLink>
          <Link className="btn btn--gold" href="/vendors">
            For Vendors
          </Link>
          <AccountButton />
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
            <Link href="/vendors" className="mobile-menu__link mobile-menu__link--sub">
              For vendors — list your business free
            </Link>
            <AccountButton variant="menu" />
            {SIGNUP_ENABLED && (
              <Link href="/signup" className="mobile-menu__link mobile-menu__link--sub">
                Sign up — ₹100 off your total bill
              </Link>
            )}
          </nav>
          <div className="mobile-menu__cta btn-row">
            <AiLink className="btn btn--primary" fallback="Get a callback" onOpen={() => setOpen(false)}>
              ✦ Ask Zenfest AI
            </AiLink>
            <Link className="btn btn--gold" href="/earn">
              Earn from events
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
