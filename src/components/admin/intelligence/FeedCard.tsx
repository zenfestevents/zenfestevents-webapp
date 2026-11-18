'use client'

import React, { useState, useTransition } from 'react'

import type { FeedItem, MarkKind } from '../../../lib/intelligence'
import { toggleFeedMark } from './actions'
import { hostOf, safeUrl, timeAgo } from './feedUtils'

/** One story in the owner's feed, like an Instagram post: picture, buttons, simple text. */

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.4-9.3-9.2C1.4 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.4 0 5.6 3.3 4.3 6.8-1.8 4.8-9.3 9.2-9.3 9.2z"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Bookmark({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M6 3.5h12v17l-6-4.2-6 4.2z"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FeedCard({ item }: { item: FeedItem }) {
  const [marks, setMarks] = useState({ reel: item.reel, revisit: item.revisit })
  const [failed, setFailed] = useState<string | null>(null)
  const [imageOk, setImageOk] = useState(true)
  const [more, setMore] = useState(false)
  const [, startTransition] = useTransition()

  const toggle = (kind: MarkKind) => {
    const next = !marks[kind]
    setMarks((m) => ({ ...m, [kind]: next }))
    setFailed(null)
    startTransition(async () => {
      try {
        await toggleFeedMark(item.id, kind, next)
      } catch {
        setMarks((m) => ({ ...m, [kind]: !next }))
        setFailed('Could not save. Check you are still logged in, then try again.')
      }
    })
  }

  const source = safeUrl(item.source_url)
  const image = imageOk ? safeUrl(item.image_url) : null
  const insta = (item.source_label || '').startsWith('Instagram')

  return (
    <article className="zf-feed__card">
      <header className="zf-feed__head">
        <span className="zf-feed__region">{item.region}</span>
        <span className="zf-feed__by">
          {insta ? item.source_label : item.source_label || (source ? hostOf(source) : '')} · {timeAgo(item.published_at)}
        </span>
      </header>

      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- outside news pictures; next/image only allows our own media
        <img
          className="zf-feed__pic"
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageOk(false)}
        />
      ) : (
        <div className="zf-feed__pic is-blank" aria-hidden="true">
          <span>{item.category || item.region}</span>
        </div>
      )}

      <div className="zf-feed__actions">
        <button
          type="button"
          className={marks.reel ? 'is-on' : undefined}
          aria-pressed={marks.reel}
          onClick={() => toggle('reel')}
          title={marks.reel ? 'Added to reel ideas (tap to remove)' : 'Add to reel ideas'}
        >
          <Heart on={marks.reel} />
          <span>{marks.reel ? 'Reel idea added' : 'Reel idea'}</span>
        </button>
        <button
          type="button"
          className={marks.revisit ? 'is-on' : undefined}
          aria-pressed={marks.revisit}
          onClick={() => toggle('revisit')}
          title={marks.revisit ? 'Saved to Revisit (tap to remove)' : 'Save to Revisit'}
        >
          <Bookmark on={marks.revisit} />
          <span>{marks.revisit ? 'Saved' : 'Revisit'}</span>
        </button>
        {source && (
          <a href={source} target="_blank" rel="noopener noreferrer" className="zf-feed__open">
            Open source ↗
          </a>
        )}
      </div>
      {failed && (
        <p className="zf-feed__error" role="alert">
          {failed}
        </p>
      )}

      <div className="zf-feed__body">
        <h3>{item.headline}</h3>
        <p>{item.story}</p>
        {item.example && (
          <p className="zf-feed__example">
            <strong>Real-life example</strong>
            {item.example}
          </p>
        )}
        <button type="button" className="zf-feed__more" aria-expanded={more} onClick={() => setMore((v) => !v)}>
          {more ? 'Less' : 'More: reel hook, proof, brand check'}
        </button>
        {more && (
          <div className="zf-feed__extra">
            {item.hook_idea && (
              <p>
                <strong>Reel hook</strong> {item.hook_idea}
              </p>
            )}
            {item.exact_source_quote && (
              <figure>
                <figcaption>✓ This sentence was found in the source</figcaption>
                <blockquote>“{item.exact_source_quote}”</blockquote>
              </figure>
            )}
            {item.brand_note && (
              <p>
                <strong>Brand check</strong> {item.brand_note}
              </p>
            )}
            <p className="zf-feed__muted">
              {item.category} · {item.scores}
            </p>
          </div>
        )}
      </div>
    </article>
  )
}
