// Search-engine helpers: the site's absolute address and the business's structured data
// (schema.org LocalBusiness, read by Google for the knowledge panel and local results).
import { MAJOR_CITIES, type SiteSettings } from './site'

/** The live address (no trailing slash), for sitemap.xml, robots.txt and JSON-LD. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.zenfestevents.in').replace(/\/$/, '')

type Branch = NonNullable<SiteSettings['branches']>[number]

const place = (b: Branch) => ({
  '@type': 'PostalAddress',
  streetAddress: b.addressLine,
  addressLocality: b.name,
  addressRegion: 'Tamil Nadu',
  addressCountry: 'IN',
})

/**
 * Zenfest as a LocalBusiness: a Tamil Nadu company serving the major cities, with the
 * first branch as its address and the others as departments. Only facts from Site
 * Settings: no review stars (Google ignores self-served ratings and may penalise them).
 */
export function businessJsonLd(settings: SiteSettings) {
  const [main, ...others] = settings.branches ?? []
  const sameAs = [settings.social?.instagram, settings.social?.facebook, settings.social?.youtube].filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#business`,
    name: 'Zenfest Events',
    description:
      'Event management company in Tamil Nadu: weddings, receptions, birthdays, baby showers, corporate functions and housewarmings — décor, catering, photography, DJ and complete planning.',
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo-full.png`,
    image: `${SITE_URL}/og.jpg`,
    telephone: settings.contact?.phonePrimary || undefined,
    email: settings.contact?.email || undefined,
    areaServed: [
      { '@type': 'State', name: 'Tamil Nadu' },
      ...MAJOR_CITIES.map((name) => ({ '@type': 'City', name })),
    ],
    ...(main ? { address: place(main), hasMap: main.mapUrl || undefined } : {}),
    ...(others.length
      ? {
          department: others.map((b) => ({
            '@type': 'LocalBusiness',
            name: `Zenfest Events — ${b.name}`,
            address: place(b),
            telephone: b.phone || undefined,
            hasMap: b.mapUrl || undefined,
          })),
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

/** A JSON-LD object as <script> text, with `<` escaped so content can't close the tag. */
export const jsonLdText = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c')
