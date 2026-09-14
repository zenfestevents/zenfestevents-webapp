'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { whatsappLink, DEFAULT_WA_MESSAGE, type SiteSettings } from '../lib/site'

const SIGNUP_ENABLED = false

const NAV = [
  { href: '/gallery', label: 'Our Work' },
  { href: '/services', label: 'Services' },
  { href: '/packages', label: 'Packages' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function Header({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const wa = whatsappLink(settings?.contact?.whatsapp, DEFAULT_WA_MESSAGE)

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
              className={`site-nav__link ${pathname === item.href ? 'is-active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-header__cta">
          {/* Not a second "Get a callback" — the hero already owns that action. */}
          <Link className="btn btn--gold" href="/vendors">
            Enroll as a Vendor
          </Link>
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
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="mobile-menu__link">
                {item.label}
              </Link>
            ))}
            <Link href="/vendors" className="mobile-menu__link mobile-menu__link--sub">
              Enroll as a vendor
            </Link>
            {SIGNUP_ENABLED && (
              <Link href="/signup" className="mobile-menu__link mobile-menu__link--sub">
                Sign up — ₹100 off your total bill
              </Link>
            )}
          </nav>
          <div className="mobile-menu__cta btn-row">
            <a className="btn btn--primary" href="/contact">
              Get a callback
            </a>
            <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
              WhatsApp us
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
