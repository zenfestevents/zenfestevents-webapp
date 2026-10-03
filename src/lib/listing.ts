// Client-safe: what a vendor listing still needs before it can go for review.
// Used by the dashboard checklist and re-checked by submitForReview.
import { LISTING_MIN } from './marketplaceOptions'

type ListingLike = {
  category: string
  about?: string | null
  areas?: unknown[] | null
  priceCard?: unknown[] | null
  gallery?: unknown[] | null
  application?: unknown
}

export type Gap = { tab: 'listing' | 'prices' | 'photos' | 'questions'; text: string }

export function listingGapList(v: ListingLike): Gap[] {
  const gaps: Gap[] = []
  if ((v.about ?? '').trim().length < LISTING_MIN.aboutChars) {
    gaps.push({ tab: 'listing', text: `Write a few lines about your work (at least ${LISTING_MIN.aboutChars} characters).` })
  }
  if ((v.areas ?? []).length < LISTING_MIN.areas) gaps.push({ tab: 'listing', text: 'Choose the areas you serve.' })
  if ((v.priceCard ?? []).length < LISTING_MIN.priceItems) gaps.push({ tab: 'prices', text: 'Add at least one price.' })
  if ((v.gallery ?? []).length < LISTING_MIN.photos) {
    gaps.push({ tab: 'photos', text: `Upload at least ${LISTING_MIN.photos} photos of your work.` })
  }
  if (needsQuestionnaire(v.category) && !v.application) {
    gaps.push({
      tab: 'questions',
      text:
        v.category === 'cake'
          ? 'Answer the cake questions (FSSAI, flavours, delivery).'
          : 'Answer the photography questions (services, cameras, editing).',
    })
  }
  return gaps
}

export const listingGaps = (v: ListingLike) => listingGapList(v).map((g) => g.text)

/** Photo and cake vendors answer the same detailed questions as the public vendor form. */
export const needsQuestionnaire = (category: string) => category === 'photography' || category === 'cake'
