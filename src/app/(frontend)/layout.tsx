import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Oswald, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'

import './styles.css'
import './parts.css'
import './registry.css'
import './polls.css'
import './ai.css'
import './marketplace.css'
import './shop.css'
import './game.css'
import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { MobileCTABar } from '../../components/MobileCTABar'
import { NavProgress } from '../../components/NavProgress'
import { getSiteSettings } from '../../lib/getSettings'
import { hasTestimonials } from '../../lib/testimonials'
import { aiAvailable } from '../../lib/ai/status'
import { getAgentProfiles } from '../../lib/ai/knowledge'
import { AiShell } from '../../components/ai/AiShell'

const display = Oswald({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const body = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

// Scoreboards, the ticker and runs only — not preloaded, so it never competes with the
// hero image for the first paint.
const mono = JetBrains_Mono({
  weight: ['500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
})

// The browser chrome matches the night-match ground on phones.
export const viewport: Viewport = {
  themeColor: '#0b0907',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  title: {
    default: 'Zenfest Events — Event Management Company in Tamil Nadu',
    template: '%s — Zenfest Events',
  },
  description:
    'Full-service event management company in Tamil Nadu — Chennai, Coimbatore, Madurai, Trichy, Salem and beyond. Weddings, birthdays, corporate functions, housewarmings and sports events — décor, catering, photography, DJ and complete packages.',
  // No og:title / og:description here: pages inherit this object whole (Next merges
  // metadata shallowly), so a fixed title made every shared link read like the homepage.
  // Left out, Next fills them from each page's own title and description.
  // Pages that set their own `openGraph` (polls, vendors, products) replace all of it.
  openGraph: {
    type: 'website',
    siteName: 'Zenfest Events',
    locale: 'en_IN',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'A wedding reception stage decorated by Zenfest Events' }],
  },
  twitter: { card: 'summary_large_image' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Both cached (lib/contentCache.ts); Testimonials joins the menu once a review is published.
  const [settings, testimonials] = await Promise.all([getSiteSettings(), hasTestimonials()])
  const ai = aiAvailable(settings)
  // The intake form offers the enabled specialists as services.
  const agents = ai ? await getAgentProfiles() : []

  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <NavProgress />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AiShell
          enabled={ai}
          agents={agents}
          greeting={settings.ai?.greeting || ''}
          whatsapp={settings.contact?.whatsapp || ''}
          phone={settings.contact?.phonePrimary || ''}
        >
          <Header settings={settings} hasTestimonials={testimonials} />
          <main id="main">{children}</main>
          <Footer settings={settings} hasTestimonials={testimonials} />
          <MobileCTABar settings={settings} />
        </AiShell>
      </body>
    </html>
  )
}
