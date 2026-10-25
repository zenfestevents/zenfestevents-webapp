'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { VENDORS_HREF } from '../lib/features'
import { DEFAULT_WA_MESSAGE, SITE_FALLBACK, whatsappLink, type SiteSettings } from '../lib/site'
import { hidesChatLauncher } from './ai/AiLink'
import { useAccountSession } from './market/useAccountSession'

/**
 * Sticky bottom bar on phones: WhatsApp / Plan your event / For vendors.
 * The gold middle button opens the event-requirements form (/enquire); the AI
 * entry used to live there and comes back via the header and homepage when
 * FEATURES.ai is switched on.
 */
export function MobileCTABar({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname()
  // Registry pages have their own sticky bar (guest "Plan with Zenfest" banner) or none.
  // Also hidden on /plan (the chat's composer) and /enquire (the form's own buttons).
  const session = useAccountSession()
  if (hidesChatLauncher(pathname) || pathname === '/enquire') return null
  const wa = whatsappLink(settings?.contact?.whatsapp || SITE_FALLBACK.contact.whatsapp, DEFAULT_WA_MESSAGE)
  const standing = session?.standing
  return (
    <div className="mobilebar" role="region" aria-label="Quick actions">
      {/* Logged in: a thin gold line along the top fills toward the next Runs club level. */}
      {standing && (
        <Link
          href={`${session?.kind === 'vendor' ? '/vendors/dashboard' : '/account'}?tab=scorecard`}
          className="mobilebar__runs"
          aria-label={
            standing.next
              ? `${standing.runs} runs, ${standing.tier}. ${standing.toNext} runs to ${standing.next}.`
              : `${standing.runs} runs, ${standing.tier}.`
          }
          style={{ '--runs': standing.progress } as React.CSSProperties}
        />
      )}
      <a className="mobilebar__btn mobilebar__btn--wa" href={wa} target="_blank" rel="noopener">
        <svg className="mobilebar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z" />
        </svg>
        WhatsApp
      </a>
      <Link className="mobilebar__btn mobilebar__btn--enq" href="/enquire">
        Plan your event
      </Link>
      <Link className="mobilebar__btn mobilebar__btn--vendor" href={VENDORS_HREF}>
        For vendors
      </Link>
    </div>
  )
}
