'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import type { SiteSettings } from '../lib/site'
import { AiLink, hidesChatLauncher } from './ai/ChatLauncher'

/**
 * Sticky bottom bar on mobile: Earn from events / Ask Zenfest AI / Enroll as a vendor.
 * The gold middle button is the phone's Zenfest AI entry (no floating bubble on phones);
 * it falls back to "Enquire" (/contact) when the AI is off.
 */
// `settings` is unused since WhatsApp left the bar; kept so layout.tsx needn't change.
export function MobileCTABar(_props: { settings: SiteSettings }) {
  const pathname = usePathname()
  // Registry pages have their own sticky bar (guest "Plan with Zenfest" banner) or none.
  // Also hidden on /plan, where the chat's own composer sits at the bottom.
  if (hidesChatLauncher(pathname)) return null
  return (
    <div className="mobilebar" role="region" aria-label="Quick actions">
      <Link className="mobilebar__btn mobilebar__btn--earn" href="/earn">
        Earn from events
      </Link>
      <AiLink className="mobilebar__btn mobilebar__btn--enq" fallback="Enquire">
        <span aria-hidden="true">✦</span> Ask Zenfest AI
      </AiLink>
      <Link className="mobilebar__btn mobilebar__btn--vendor" href="/vendors">
        Enroll as a vendor
      </Link>
    </div>
  )
}
