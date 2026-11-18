'use server'

// Server Actions behind the owner's Intelligence Hub feed (/admin/intelligence): load older cards
// and the card buttons ("Reel idea", "Revisit"). Each one checks the Owner itself: a Server Action
// is a public POST endpoint, so the page's own check does not protect it.
import { isOwner } from '../../../access/roles'
import { getSessionUser } from '../../../lib/session'
import {
  REGIONS,
  getFeedPage,
  isUuid,
  setMark,
  type FeedCursor,
  type FeedItem,
  type MarkKind,
} from '../../../lib/intelligence'

async function requireOwner(): Promise<void> {
  const user = await getSessionUser()
  if (!isOwner(user as never)) throw new Error('Owner only')
}

export async function loadMoreFeed(
  region: string,
  cursor: FeedCursor | null,
): Promise<{ items: FeedItem[]; next: FeedCursor | null }> {
  await requireOwner()
  const safeRegion = (REGIONS as readonly string[]).includes(region) ? region : 'All'
  const safeCursor =
    cursor && typeof cursor.at === 'string' && isUuid(cursor.id) ? { at: cursor.at.slice(0, 40), id: cursor.id } : null
  return getFeedPage(safeRegion, safeCursor)
}

export async function toggleFeedMark(intelId: string, kind: MarkKind, on: boolean): Promise<boolean> {
  await requireOwner()
  if (!isUuid(intelId) || (kind !== 'reel' && kind !== 'revisit') || typeof on !== 'boolean') {
    throw new Error('Bad request')
  }
  return setMark(intelId, kind, on)
}
