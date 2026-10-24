'use client'

import React, { useState, useSyncExternalStore } from 'react'

import type { InviteLinks } from '../../lib/rewards'

const inr = (n: number) => n.toLocaleString('en-IN')
const noSubscribe = () => () => {}

const INVITES = [
  {
    key: 'client' as const,
    title: 'Invite a client',
    hint: 'Friends and family planning a wedding, birthday or any celebration.',
    message: (link: string) =>
      `Planning a wedding, birthday or any celebration? Zenfest Events plans it end to end across Tamil Nadu. Have a look: ${link}`,
  },
  {
    key: 'vendor' as const,
    title: 'Invite a vendor',
    hint: 'Photographers, decorators, bakers, caterers, makeup artists and more.',
    message: (link: string) =>
      `Are you an event vendor? Join Zenfest Events and get event work across Tamil Nadu. It's free: ${link}`,
  },
]

/**
 * The two invite links (client / vendor), each with WhatsApp, copy and the phone's own
 * share sheet. Used on Refer & earn and in the dashboards' Scorecard tab.
 */
export function InviteShare({
  links,
  runs,
  compact = false,
}: {
  links: InviteLinks
  /** Run values to show under each card: the small award, and the big one per audience. */
  runs?: { small: number; client: number; vendor: number }
  compact?: boolean
}) {
  const [copied, setCopied] = useState<'client' | 'vendor' | null>(null)
  // Known only in the browser: false while server-rendering and hydrating, so the HTML matches.
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === 'function',
    () => false,
  )

  async function copy(key: 'client' | 'vendor') {
    try {
      await navigator.clipboard.writeText(links[key])
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Clipboard blocked: the link is selectable in its field.
    }
  }

  return (
    <div className={`invite-share ${compact ? 'invite-share--compact' : ''}`}>
      {INVITES.map((inv) => {
        const link = links[inv.key]
        const text = inv.message(link)
        return (
          <section key={inv.key} className={`invite-card invite-card--${inv.key}`}>
            <h3 className="invite-card__title">{inv.title}</h3>
            {!compact && <p className="muted invite-card__hint">{inv.hint}</p>}
            {runs && (
              <p className="invite-card__runs mono">
                +{inr(runs.small)} when they {inv.key === 'client' ? 'join or enquire' : 'join or apply'} · +
                {inr(inv.key === 'client' ? runs.client : runs.vendor)} when they{' '}
                {inv.key === 'client' ? 'book' : 'are approved'}
              </p>
            )}
            <input
              className="invite-card__link mono"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={`${inv.title}: your link`}
            />
            <div className="btn-row">
              <a
                className="btn btn--whatsapp btn--small"
                href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noopener"
              >
                WhatsApp
              </a>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => copy(inv.key)}>
                {copied === inv.key ? 'Copied' : 'Copy link'}
              </button>
              {canShare && (
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => navigator.share({ title: 'Zenfest Events', text, url: link }).catch(() => {})}
                >
                  Share
                </button>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
