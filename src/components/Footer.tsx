import Link from 'next/link'
import React from 'react'

import { SITE_FALLBACK, telLink, whatsappLink, DEFAULT_WA_MESSAGE, type SiteSettings } from '../lib/site'
import { KolamDivider } from './Kolam'

export function Footer({ settings }: { settings: SiteSettings }) {
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
            <img src="/brand/logo-full.png" alt="Zenfest Events" className="footer-logo" width={190} height={190} />
            <p className="muted">
              Full-service event management across Chennai. We plan, style and run
              weddings, birthdays, corporate functions, housewarmings and sports events.
            </p>
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

          <div className="site-footer__col">
            <h4 className="site-footer__heading">Explore</h4>
            <Link href="/gallery">Our Work</Link>
            <Link href="/services">Services</Link>
            <Link href="/packages">Packages</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/vendors">Enroll as a vendor</Link>
          </div>

          <div className="site-footer__col">
            <h4 className="site-footer__heading">Branches</h4>
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
          <span className="muted">© {year} Zenfest Events. All rights reserved.</span>
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
