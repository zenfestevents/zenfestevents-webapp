'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { ANNOUNCE_COMING_SOON, COMING_SOON, FEATURES, VENDORS_HREF } from '../lib/features'
import { DEFAULT_WA_MESSAGE, SITE_FALLBACK, whatsappLink, type SiteSettings } from '../lib/site'
import { AiLink } from './ai/ChatLauncher'
import { AccountButton } from './market/AccountButton'

const SIGNUP_ENABLED = false

type NavItem = { href: string; label: string; also?: string[]; soon?: boolean }
/** A dropdown on laptops, a headed group in the phone menu. */
type NavGroup = { label: string; items: NavItem[] }
/** A plain link. `group` is its heading in the phone menu, which shows only groups. */
type NavLink = NavItem & { group: string }
type NavEntry = NavGroup | NavLink

const isGroup = (e: NavEntry): e is NavGroup => 'items' in e

/**
 * The menu, kept short so new pages slot into a group instead of widening the bar (owner,
 * 2026-10-22): About Zenfest ▾ · Services ▾ · Contact. Switched-off features
 * (lib/features.ts) drop out; with ANNOUNCE_COMING_SOON they reappear in the phone menu's
 * "Coming soon" group. Testimonials shows once a review is published.
 */
function buildNav(hasTestimonials: boolean): NavEntry[] {
  return [
    ...(FEATURES.marketplace ? [{ href: '/marketplace', label: 'Marketplace', group: 'Book vendors' }] : []),
    {
      label: 'About Zenfest',
      items: [
        { href: '/', label: 'Home' },
        { href: '/gallery', label: 'Our Work' },
        { href: '/about', label: 'About' },
        ...(hasTestimonials ? [{ href: '/testimonials', label: 'Testimonials' }] : []),
        ...(FEATURES.polls ? [{ href: '/polls', label: 'Polls' }] : []),
      ],
    },
    {
      label: 'Services',
      items: [
        { href: '/services', label: 'Services' },
        { href: '/packages', label: 'Packages', soon: !FEATURES.packages },
        // The gift registry is part of the shop now; its pages light up "Shop".
        ...(FEATURES.shop ? [{ href: '/shop', label: 'Shop', also: ['/registry'] }] : []),
        ...(FEATURES.earn ? [{ href: '/earn', label: 'Earn from events' }] : []),
      ],
    },
    { href: '/contact', label: 'Contact', group: 'Contact' },
  ]
}

const SOON = ANNOUNCE_COMING_SOON ? COMING_SOON.filter((f) => !FEATURES[f.key]) : []

// Home ('/') matches only itself, not every page.
const isActive = (pathname: string, item: NavItem) =>
  [item.href, ...(item.also ?? [])].some((h) => pathname === h || (h !== '/' && pathname.startsWith(`${h}/`)))

/** Laptop dropdown: opens on hover or click, closes on Escape, a click outside or leaving it. */
function NavDropdown({
  group,
  pathname,
  open,
  onOpen,
  onClose,
}: {
  group: NavGroup
  pathname: string
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const id = `nav-${group.label.toLowerCase().replace(/\W+/g, '-')}`
  const active = group.items.some((i) => isActive(pathname, i))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose()
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, onClose])

  return (
    <div
      ref={ref}
      className="site-nav__group"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onBlur={(e) => !ref.current?.contains(e.relatedTarget as Node) && onClose()}
    >
      <button
        type="button"
        className={`site-nav__link site-nav__toggle ${active ? 'is-active' : ''}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? onClose() : onOpen())}
      >
        {group.label}
        <span className="site-nav__caret" aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className="site-nav__menu">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`site-nav__item ${isActive(pathname, item) ? 'is-active' : ''}`}
              aria-current={isActive(pathname, item) ? 'page' : undefined}
            >
              {item.label}
              {item.soon && <span className="site-nav__soon">Soon</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function Header({ settings, hasTestimonials = false }: { settings: SiteSettings; hasTestimonials?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const wa = whatsappLink(settings?.contact?.whatsapp || SITE_FALLBACK.contact.whatsapp, DEFAULT_WA_MESSAGE)
  const nav = buildNav(hasTestimonials)
  /** A short bar (everything optional switched off) fits on a small laptop. */
  const compact = nav.length <= 6
  const closeMenu = useCallback(() => setMenu(null), [])

  useEffect(() => {
    setOpen(false)
    setMenu(null)
  }, [pathname])
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
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''} ${compact ? 'site-header--compact' : ''}`}>
      <div className="container site-header__inner">
        <Link href="/" className="wordmark" aria-label="Zenfest Events home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.webp" alt="" className="wordmark__mark" width={44} height={44} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wordmark.webp"
            alt="Zenfest Events"
            className="wordmark__lockup"
            width={278}
            height={90}
          />
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {nav.map((entry) =>
            isGroup(entry) ? (
              <NavDropdown
                key={entry.label}
                group={entry}
                pathname={pathname}
                open={menu === entry.label}
                onOpen={() => setMenu(entry.label)}
                onClose={closeMenu}
              />
            ) : (
              <Link
                key={entry.href}
                href={entry.href}
                className={`site-nav__link ${isActive(pathname, entry) ? 'is-active' : ''}`}
              >
                {entry.label}
              </Link>
            ),
          )}
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
          <Link className="btn btn--gold" href={VENDORS_HREF}>
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
            {/* The same groups as the laptop dropdowns. */}
            <AiLink className="mobile-menu__link mobile-menu__link--ai" fallback={false} onOpen={() => setOpen(false)}>
              ✦ Plan with Zenfest AI
            </AiLink>
            {nav.map((entry) => (
              <React.Fragment key={entry.label}>
                <p className="mobile-menu__group">{isGroup(entry) ? entry.label : entry.group}</p>
                {(isGroup(entry) ? entry.items : [entry]).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mobile-menu__link ${item.soon ? 'mobile-menu__link--soon' : ''}`}
                    aria-current={isActive(pathname, item) ? 'page' : undefined}
                  >
                    {item.label} {item.soon && <span className="mobile-menu__soon">Soon</span>}
                  </Link>
                ))}
              </React.Fragment>
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
            {/* Only once it's open: one way to join until then (see VENDORS_HREF). */}
            {FEATURES.marketplace && (
              <Link href="/vendors/marketplace" className="mobile-menu__link">
                List on the marketplace — free
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
