// Client-safe: the services the city and area pages are built for, and their addresses.
//
// "Front door / side door" (owner's SEO spec, 2026-10-29), all under the marketplace (owner,
// 2026-10-30): its menu shows only the 25 cities (lib/locations.ts, /marketplace/cities/<city>);
// every city and area also gets one page per service at /marketplace/<service>-in-<place>, e.g.
// /marketplace/birthday-decorators-in-guduvanchery. Those pages are built for
// every place but only reach Google once they have something real on them (`indexable` in
// lib/areaVendors.ts): Zenfest's own services in the direct zone at once, the rest when
// MIN_VENDORS live vendors serve the place. Many empty look-alike pages read as doorway pages
// to Google, which can sink the whole site.
import type { EnquiryEvent } from './eventRequirements'
import { findPlace, type City, type Place } from './locations'
import type { MarketCategory } from './marketplaceOptions'

export type AreaService = {
  slug: string
  /** Plural, as in "Birthday decorators in …". */
  label: string
  /** Short chip text on the city page's area grid. */
  short: string
  /** The marketplace category whose vendors fill the page; null = Zenfest's team only. */
  market: MarketCategory | null
  /** Zenfest runs this itself, so its direct-zone pages go on Google before any vendor joins. */
  inHouse: boolean
  /** Preselects the /enquire form. */
  event: EnquiryEvent | ''
  /** What Zenfest does for it, completing "Zenfest Events …". */
  zenfest: string
}

export const AREA_SERVICES: AreaService[] = [
  {
    slug: 'event-planners',
    label: 'Event planners',
    short: 'Event planners',
    market: null,
    inHouse: true,
    event: '',
    zenfest: 'plans and runs weddings, birthdays, baby showers, housewarmings and corporate functions end to end',
  },
  {
    slug: 'wedding-planners',
    label: 'Wedding planners',
    short: 'Wedding planners',
    market: null,
    inHouse: true,
    event: 'wedding',
    zenfest: 'plans weddings and receptions: hall, décor, food, photography, music and the day itself',
  },
  {
    slug: 'birthday-decorators',
    label: 'Birthday decorators',
    short: 'Birthday decor',
    market: 'decoration',
    inHouse: true,
    event: 'birthday',
    zenfest: 'designs and sets up themed birthday décor, with cake, food, photography and fun add-ons',
  },
  {
    slug: 'baby-shower-decorators',
    label: 'Baby shower decorators',
    short: 'Baby shower decor',
    market: 'decoration',
    inHouse: true,
    event: 'babyshower',
    zenfest: 'decorates and organises baby showers (valaikaapu / seemantham) with food, photos and return gifts',
  },
  {
    slug: 'wedding-decorators',
    label: 'Wedding decorators',
    short: 'Wedding decor',
    market: 'decoration',
    inHouse: true,
    event: 'wedding',
    zenfest: 'styles wedding and reception stages, mandaps, entrances, flowers and lighting',
  },
  {
    slug: 'caterers',
    label: 'Caterers',
    short: 'Caterers',
    market: 'catering',
    inHouse: true,
    event: '',
    zenfest: 'arranges catering for weddings and functions: banana-leaf meals, buffets and live counters',
  },
  {
    slug: 'photographers',
    label: 'Photographers',
    short: 'Photographers',
    market: 'photography',
    inHouse: true,
    event: '',
    zenfest: 'arranges candid and traditional photography and video for every kind of event',
  },
  {
    slug: 'bridal-makeup-artists',
    label: 'Bridal makeup artists',
    short: 'Bridal makeup',
    market: 'makeup',
    inHouse: false,
    event: 'wedding',
    zenfest: 'arranges bridal, groom and family makeup as part of your event',
  },
  {
    slug: 'mehendi-artists',
    label: 'Mehendi artists',
    short: 'Mehendi',
    market: 'mehendi',
    inHouse: false,
    event: 'wedding',
    zenfest: 'arranges bridal and guest mehendi as part of your event',
  },
  {
    slug: 'cake-makers',
    label: 'Cake makers',
    short: 'Cakes',
    market: 'cake',
    inHouse: false,
    event: 'birthday',
    zenfest: 'arranges birthday, wedding and theme cakes as part of your event',
  },
  {
    slug: 'wedding-halls',
    label: 'Wedding halls',
    short: 'Halls',
    market: 'venue',
    inHouse: false,
    event: 'wedding',
    zenfest: 'finds and books marriage halls and party halls to fit your guest list',
  },
  {
    slug: 'djs',
    label: 'DJs',
    short: 'DJs',
    market: 'dj',
    inHouse: false,
    event: '',
    zenfest: 'arranges DJs, sound, nadaswaram and live music for your event',
  },
  {
    slug: 'wedding-invitations',
    label: 'Wedding invitation makers',
    short: 'Invitations',
    market: 'invitations',
    inHouse: false,
    event: 'wedding',
    zenfest: 'arranges printed and digital invitations as part of your event',
  },
]

/** A place's service page reaches Google once this many live vendors serve it. */
export const MIN_VENDORS = 3

/** Services offered in a city: Zenfest-only services exist only where Zenfest's own team works. */
export const servicesFor = (city: City) => AREA_SERVICES.filter((s) => s.market || city.zone === 'direct')

export const areaPageHref = (service: AreaService, placeSlug: string) => `/marketplace/${service.slug}-in-${placeSlug}`

export const CITIES_HREF = '/marketplace/cities'

export const cityHref = (city: Pick<City, 'slug'>) => `${CITIES_HREF}/${city.slug}`

/** /birthday-decorators-in-guduvanchery → the service and place, or null (→ 404). */
export function parseAreaSlug(slug: string): { service: AreaService; place: Place } | null {
  for (const service of AREA_SERVICES) {
    const prefix = `${service.slug}-in-`
    if (!slug.startsWith(prefix)) continue
    const place = findPlace(slug.slice(prefix.length))
    if (!place || !servicesFor(place.city).includes(service)) return null
    return { service, place }
  }
  return null
}
