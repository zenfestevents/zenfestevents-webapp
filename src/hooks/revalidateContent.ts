import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'
import { revalidateTag } from 'next/cache'

import type { ContentTag } from '../lib/contentCache'

/** Clear a lib/contentCache.ts tag so the next visit reads fresh content. */
function clear(tag: ContentTag) {
  try {
    // expire 0: the next visitor gets the edit, not one stale copy first.
    revalidateTag(tag, { expire: 0 })
  } catch {
    // Outside a Next request (seed / import scripts) there is no cache to clear.
  }
}

/** afterChange + afterDelete hooks for a collection whose content public pages cache. */
export const revalidateCollection = (tag: ContentTag) => ({
  afterChange: [(({ doc }) => (clear(tag), doc)) as CollectionAfterChangeHook],
  afterDelete: [(({ doc }) => (clear(tag), doc)) as CollectionAfterDeleteHook],
})

export const revalidateGlobal =
  (tag: ContentTag): GlobalAfterChangeHook =>
  ({ doc }) => (clear(tag), doc)
