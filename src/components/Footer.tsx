import Link from 'next/link'
import React from 'react'

import { ANNOUNCE_COMING_SOON, FEATURES } from '../lib/features'
import { MAJOR_CITIES, SITE_FALLBACK, telLink, whatsappLink, DEFAULT_WA_MESSAGE, type SiteSettings } from '../lib/site'
import { KolamDivider } from './Kolam'

export function Footer({ settings, hasTestimonials = false }: { settings: SiteSettings; hasTestimonials?: boolean }) {
  const contact = { ...SITE_FALLBACK.contact, ...(settings?.contact || {}) }
  const branches = settings?.branches?.length ? settings.branches : SITE_FALLBACK.branches
  const social = settings?.social || {}
  const wa = whatsappLink(contact.whatsapp, DEFAULT_WA_MESSAGE)
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer band-ink">
      <div className="container">
        <KolamDivider className="site-footer__kolam" />

        <div className="site-footer__grid">
          <div className="site-footer__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-footer.webp"
              alt="Zenfest Events"
              className="footer-logo"
              width={190}
              height={190}
              loading="lazy"
              decoding="async"
            />
            <p className="muted">
              Full-service event management across Tamil Nadu. We plan, style and run
              weddings, birthdays, corporate functions, housewarmings and sports events.
            </p>
            <p className="site-footer__cities">{MAJOR_CITIES.join(' · ')} — and towns across the state.</p>
            <div className="btn-row">
              {contact.phonePrimary && (
                <a className="btn btn--ghost" href={telLink(contact.phonePrimary)}>
                  Call {contact.phonePrimary}
                </a>
              )}
              <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
                WhatsApp
              </a>
            </div>
          </div>

          {/* The same groups as the header menu: About Zenfest / Services / Contact. */}
          <div className="site-footer__col">
            <h4 className="site-footer__heading">About Zenfest</h4>
            <Link href="/gallery">Our Work</Link>
            <Link href="/about">About</Link>
            {hasTestimonials && <Link href="/testimonials">Testimonials</Link>}
            <Link href="/vendors/partner">Partner with Zenfest</Link>
          </div>

          <div className="site-footer__col">
            <h4 className="site-footer__heading">Services</h4>
            <Link href="/services">Services</Link>
            <Link href="/packages">Packages{!FEATURES.packages && <Soon />}</Link>
            <Link href="/enquire">Plan your event</Link>
            {FEATURES.shop && <Link href="/shop">Zenfest Shop</Link>}
            <Link href="/registry">Gift registry</Link>
            {/* Switched-off features (lib/features.ts) are listed, marked "soon", only with
                ANNOUNCE_COMING_SOON; polls are hidden either way. */}
            {(FEATURES.ai || ANNOUNCE_COMING_SOON) && <Link href="/plan">Zenfest AI planner{!FEATURES.ai && <Soon />}</Link>}
            {(FEATURES.marketplace || ANNOUNCE_COMING_SOON) && (
              <Link href="/marketplace">Vendor marketplace{!FEATURES.marketplace && <Soon />}</Link>
            )}
            {(FEATURES.earn || ANNOUNCE_COMING_SOON) && <Link href="/earn">Earn from events{!FEATURES.earn && <Soon />}</Link>}
            {FEATURES.polls && <Link href="/polls">Polls</Link>}
            {FEATURES.marketplace && <Link href="/account">My account</Link>}
          </div>

          <div className="site-footer__col">
            <h4 className="site-footer__heading">Contact</h4>
            <Link href="/contact">Contact us</Link>
            {branches.map((b, i) => (
              <div key={b.id || i} className="site-footer__branch">
                <strong>{b.name}</strong>
                {b.addressLine && <span className="muted">{b.addressLine}</span>}
                {b.mapUrl && (
                  <a href={b.mapUrl} target="_blank" rel="noopener" className="accent">
                    View on map
                  </a>
                )}
              </div>
            ))}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="site-footer__email">
                {contact.email}
              </a>
            )}
          </div>
        </div>

        <div className="site-footer__bar">
          <span className="muted">
            © {year} Zenfest Events. All rights reserved. · <Link href="/privacy">Privacy policy</Link>
          </span>
          <div className="site-footer__social">
            {social.instagram && (
              <a href={social.instagram} target="_blank" rel="noopener">
                Instagram
              </a>
            )}
            {social.facebook && (
              <a href={social.facebook} target="_blank" rel="noopener">
                Facebook
              </a>
            )}
            {social.youtube && (
              <a href={social.youtube} target="_blank" rel="noopener">
                YouTube
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}

const Soon = () => <span className="site-footer__soon"> · soon</span>
