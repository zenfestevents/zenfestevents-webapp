import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { ZenfestChat } from '../../../components/ai/ZenfestChat'
import { aiAvailable } from '../../../lib/ai/status'
import { getSiteSettings } from '../../../lib/getSettings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Plan your event with Zenfest AI',
  description:
    'Chat with Zenfest AI and its décor, catering, photography and entertainment specialists. Get a draft plan with estimates, confirmed by the Zenfest Events team.',
}

/** The full-screen Zenfest AI chat — the shareable link for promotions. */
export default async function PlanPage() {
  const settings = await getSiteSettings()
  if (!aiAvailable(settings)) {
    return (
      <section className="section">
        <div className="container zai-off">
          <p className="eyebrow">Zenfest AI</p>
          <h1 className="display-l">Our AI planner is taking a break</h1>
          <p className="lede">Our team is here though — tell us about your event and we&apos;ll call you back.</p>
          <div className="btn-row">
            <Link className="btn btn--primary" href="/contact">
              Get a callback
            </Link>
          </div>
        </div>
      </section>
    )
  }
  return (
    <section className="zai-page">
      <div className="container zai-page__inner">
        <ZenfestChat variant="page" />
      </div>
    </section>
  )
}
