// Server-only: which live vendors serve a city or area page, and which of those pages are
// worth Google's time (see lib/areaPages.ts). Reads go through lib/marketplace.ts, so only
// PublicVendors leave this file.
import type { Vendor } from '../payload-types'
import { MIN_VENDORS, areaPageHref, cityHref, servicesFor, type AreaService } from './areaPages'
import { FEATURES, MARKETPLACE_SOON } from './features'
import { CITIES, distanceKm, findPlace, placesOf, type City, type Place } from './locations'
import { listVendors, type PublicVendor } from './marketplace'
import { ALL_CHENNAI } from './marketplaceOptions'
import { getPayloadClient } from './payload'

/** Vendors are shown (and counted) only once the couples' side of the marketplace is open. */
export const showVendors = FEATURES.marketplace && !MARKETPLACE_SOON

/** "All over Chennai" in a vendor's area list covers these cities' areas. */
const CHENNAI_METRO = new Set(['chennai', 'tambaram', 'avadi'])

type Reach = Pick<Vendor, 'areas' | 'baseArea' | 'travelKm'>

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

/**
 * How far the vendor's base is from `place` (0 when they listed it among their Chennai
 * areas), or null when they don't serve it. A city counts as served when its centre or any
 * of its areas is.
 */
export function reachKm(v: Reach, place: Place): number | null {
  const targets = place.kind === 'city' ? placesOf(place.city) : [place]
  const base = findPlace(v.baseArea)
  let best: number | null = null
  for (const t of targets) {
    const listed = (v.areas ?? []).some(
      (a) =>
        (a === ALL_CHENNAI && CHENNAI_METRO.has(t.city.slug)) ||
        norm(a) === norm(t.kind === 'area' ? t.area.name : t.city.name) ||
        norm(a) === norm(t.city.name),
    )
    const km = base && v.travelKm ? distanceKm(base, t) : null
    const d = km != null && km <= v.travelKm! ? km : listed ? (km ?? 0) : null
    if (d != null && (best == null || d < best)) best = d
  }
  return best
}

export type AreaVendor = PublicVendor & { km: number | null }

/** Live vendors of the service's category who serve the place, nearest first. */
export async function vendorsFor(service: AreaService, place: Place): Promise<AreaVendor[]> {
  if (!showVendors || !service.market) return []
  const vendors = await listVendors({ category: service.market })
  return vendors
    .map((v) => ({ ...v, km: reachKm(v, place) }))
    .filter((v) => v.km != null)
    .sort((a, b) => a.km! - b.km!)
    .map((v) => ({ ...v, km: v.baseArea ? Math.round(v.km!) : null }))
}

/** Every live vendor serving any service in the city, nearest first (the city page). */
export async function vendorsInCity(city: City): Promise<AreaVendor[]> {
  if (!showVendors) return []
  const place: Place = { kind: 'city', city, slug: city.slug }
  return (await listVendors())
    .map((v) => ({ ...v, km: reachKm(v, place) }))
    .filter((v) => v.km != null)
    .sort((a, b) => a.km! - b.km!)
    .map((v) => ({ ...v, km: v.baseArea ? Math.round(v.km!) : null }))
}

/** Should Google index this page? (Direct-zone in-house services: yes; the rest need vendors.) */
export function indexable(service: AreaService | null, place: Place, vendorCount: number) {
  if (place.city.zone === 'direct' && (!service || service.inHouse)) return true
  return showVendors && vendorCount >= MIN_VENDORS
}

/** Every indexable city and area page, for the sitemap. */
export async function indexablePaths(): Promise<string[]> {
  let reach: (Reach & { category: Vendor['category'] })[] = []
  if (showVendors) {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'vendors',
      where: { listingStatus: { equals: 'published' } },
      select: { category: true, areas: true, baseArea: true, travelKm: true },
      depth: 0,
      limit: 2000,
      overrideAccess: true,
    })
    reach = docs as typeof reach
  }
  const paths: string[] = []
  for (const city of CITIES) {
    const cityPlace: Place = { kind: 'city', city, slug: city.slug }
    const inCity = reach.filter((v) => reachKm(v, cityPlace) != null).length
    if (indexable(null, cityPlace, inCity)) paths.push(cityHref(city))
    for (const place of placesOf(city)) {
      for (const service of servicesFor(city)) {
        const n = service.market
          ? reach.filter((v) => v.category === service.market && reachKm(v, place) != null).length
          : 0
        if (indexable(service, place, n)) paths.push(areaPageHref(service, place.slug))
      }
    }
  }
  return paths
}
