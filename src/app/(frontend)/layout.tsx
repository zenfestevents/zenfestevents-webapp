import React from 'react'
import type { Metadata } from 'next'
import { Oswald, Hanken_Grotesk } from 'next/font/google'

import './styles.css'
import './parts.css'
import './registry.css'
import './polls.css'
import './ai.css'
import './marketplace.css'
import './shop.css'
import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { MobileCTABar } from '../../components/MobileCTABar'
import { getSiteSettings } from '../../lib/getSettings'
import { hasTestimonials } from '../../lib/testimonials'
import { aiAvailable } from '../../lib/ai/status'
import { getAgentProfiles } from '../../lib/ai/knowledge'
import { ZenfestAIProvider } from '../../components/ai/ZenfestAIProvider'
import { ChatLauncher } from '../../components/ai/ChatLauncher'

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  title: {
    default: 'Zenfest Events — Event Management Company in Tamil Nadu',
    template: '%s — Zenfest Events',
  },
  description:
    'Full-service event management company in Tamil Nadu — Chennai, Coimbatore, Madurai, Trichy, Salem and beyond. Weddings, birthdays, corporate functions, housewarmings and sports events — décor, catering, photography, DJ and complete packages.',
  openGraph: {
    title: 'Zenfest Events — Event Management Company in Tamil Nadu',
    description:
      'Weddings, birthdays, corporate functions and more across Tamil Nadu. See our work and plan your event.',
    type: 'website',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Both cached (lib/contentCache.ts); Testimonials joins the menu once a review is published.
  const [settings, testimonials] = await Promise.all([getSiteSettings(), hasTestimonials()])
  const ai = aiAvailable(settings)
  // The intake form offers the enabled specialists as services.
  const agents = ai ? await getAgentProfiles() : []

  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <ZenfestAIProvider
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
          <ChatLauncher />
        </ZenfestAIProvider>
      </body>
    </html>
  )
}
