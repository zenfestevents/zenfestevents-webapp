'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { FeedCursor, FeedItem } from '../../../lib/intelligence'
import { loadMoreFeed } from './actions'
import { FeedCard } from './FeedCard'
import { dayLabel } from './feedUtils'

/**
 * The owner's feed: cards newest first with day dividers (Today, Yesterday, Mon 16 Nov…). With a
 * `next` cursor it loads older cards by itself as you near the end, like Instagram.
 */
export function FeedList({
  initial,
  next: firstNext,
  region,
  dayDividers = true,
  empty,
}: {
  initial: FeedItem[]
  next: FeedCursor | null
  region: string
  dayDividers?: boolean
  empty: string
}) {
  const [items, setItems] = useState(initial)
  const [next, setNext] = useState(firstNext)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (!next || loading) return
    setLoading(true)
    setError(false)
    try {
      const page = await loadMoreFeed(region, next)
      setItems((old) => {
        const seen = new Set(old.map((i) => i.id))
        return [...old, ...page.items.filter((i) => !seen.has(i.id))]
      })
      setNext(page.next)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [next, loading, region])

  useEffect(() => {
    const el = sentinel.current
    if (!el || !next || error) return undefined
    const near = () => el.getBoundingClientRect().top < window.innerHeight + 900
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), {
      rootMargin: '900px 0px',
    })
    io.observe(el)
    // Belt and braces: some browsers pause the observer in background tabs.
    const onScroll = () => near() && loadMore()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [loadMore, next, error])

  if (items.length === 0) return <p className="zf-feed__empty">{empty}</p>

  const days = items.map((i) => dayLabel(i.published_at))
  return (
    <div className="zf-feed">
      {items.map((item, n) => {
        const day = days[n]
        const divider = dayDividers && (n === 0 || day !== days[n - 1])
        return (
          <React.Fragment key={item.id}>
            {divider && <h2 className="zf-feed__day">{day}</h2>}
            <FeedCard item={item} />
          </React.Fragment>
        )
      })}
      <div ref={sentinel} className="zf-feed__end">
        {next ? (
          <button type="button" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading older stories…' : error ? 'Could not load. Try again' : 'Show older stories'}
          </button>
        ) : (
          <p className="zf-feed__muted">You’re all caught up.</p>
        )}
      </div>
    </div>
  )
}
