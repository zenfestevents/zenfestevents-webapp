import Link from 'next/link'
import React from 'react'
import type { Metadata } from 'next'

import { HostDashboard } from '../../../../components/registry/HostDashboard'
import { getSiteSettings } from '../../../../lib/getSettings'
import { findEventForHost, getHostRegistry } from '../../../../lib/registry'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Manage your registry',
  robots: { index: false, follow: false },
  // The manage key is in this page's URL — never leak it to stores via Referer.
  referrer: 'no-referrer',
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ key?: string; new?: string }>
}

export default async function DashboardPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { key, new: isNew } = await searchParams
  const event = await findEventForHost(slug, key)

  if (!event || !key) {
    return (
      <section className="section">
        <div className="container reg-denied">
          <p className="eyebrow">Gift registry</p>
          <h1 className="display-m">This manage link isn’t valid</h1>
          <p className="lede">
            Please open the exact link you saved when you created the registry (it ends in <code>?key=…</code>).
            Lost it? Message us from the phone number you registered with and we’ll help.
          </p>
          <div className="btn-row">
            <Link className="btn btn--primary" href="/contact">
              Contact Zenfest
            </Link>
            <Link className="btn btn--ghost" href="/registry/create">
              Create a new registry
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const [data, settings] = await Promise.all([getHostRegistry(event), getSiteSettings()])

  return (
    <section className="section--tight reg-dash-page">
      <div className="container">
        <div className="reg-dash__head">
          <div>
            <p className="eyebrow">Your gift registry</p>
            <h1 className="display-m">{data.event.title}</h1>
          </div>
          <Link className="btn btn--gold" href={`/r/${data.event.slug}`} target="_blank">
            View guest page
          </Link>
        </div>
        <HostDashboard
          data={data}
          manageKey={key}
          isNew={isNew === '1'}
          zenfestWhatsapp={settings?.contact?.whatsapp}
        />
      </div>
    </section>
  )
}
