import React from 'react'
import type { Metadata } from 'next'
import { Oswald, Hanken_Grotesk } from 'next/font/google'

import './styles.css'
import './parts.css'
import { Header } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { MobileCTABar } from '../../components/MobileCTABar'
import { getSiteSettings } from '../../lib/getSettings'

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
    default: 'Zenfest Events — Event Management in Chennai',
    template: '%s — Zenfest Events',
  },
  description:
    'Full-service event management in Chennai. Weddings, birthdays, corporate functions, housewarmings and sports events — décor, catering, photography, DJ and complete packages.',
  openGraph: {
    title: 'Zenfest Events — Event Management in Chennai',
    description:
      'Weddings, birthdays, corporate functions and more across Chennai. See our work and request a callback.',
    type: 'website',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header settings={settings} />
        <main id="main">{children}</main>
        <Footer settings={settings} />
        <MobileCTABar settings={settings} />
      </body>
    </html>
  )
}
