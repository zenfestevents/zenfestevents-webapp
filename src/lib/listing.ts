// Client-safe: what a vendor listing still needs before it can go for review.
// Used by the dashboard checklist and re-checked by submitForReview.
import { LISTING_MIN } from './marketplaceOptions'

type ListingLike = {
  category: string
  about?: string | null
  areas?: unknown[] | null
  baseArea?: string | null
  priceCard?: unknown[] | null
  gallery?: unknown[] | null
}

export type Gap = { tab: 'listing' | 'prices' | 'photos'; text: string }

export function listingGapList(v: ListingLike): Gap[] {
  const gaps: Gap[] = []
  if ((v.about ?? '').trim().length < LISTING_MIN.aboutChars) {
    gaps.push({ tab: 'listing', text: `Write a few lines about your work (at least ${LISTING_MIN.aboutChars} characters).` })
  }
  // Chennai areas or a base anywhere in Tamil Nadu (lib/locations.ts): either places the listing.
  if ((v.areas ?? []).length < LISTING_MIN.areas && !v.baseArea) {
    gaps.push({ tab: 'listing', text: 'Choose where you are based, or the Chennai areas you serve.' })
  }
  if ((v.priceCard ?? []).length < LISTING_MIN.priceItems) gaps.push({ tab: 'prices', text: 'Add at least one price.' })
  if ((v.gallery ?? []).length < LISTING_MIN.photos) {
    gaps.push({ tab: 'photos', text: `Upload at least ${LISTING_MIN.photos} photos of your work.` })
  }
  return gaps
}

export const listingGaps = (v: ListingLike) => listingGapList(v).map((g) => g.text)

// The partner questions (VendorForm) are not part of a marketplace listing: they belong
// to the separate "Partner with Zenfest" application at /vendors/partner.
