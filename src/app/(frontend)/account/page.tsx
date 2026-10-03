import React from 'react'
import type { Metadata } from 'next'

import { AccountDashboard } from '../../../components/market/AccountDashboard'
import { param, type SearchParams } from '../../../components/market/AuthShell'
import { dayKey, enquiriesForCustomer, shortlistFor } from '../../../lib/marketplace'
import { requireCustomer } from '../../../lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'My account', robots: { index: false } }

export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const customer = await requireCustomer('/account')
  const [enquiries, shortlist] = await Promise.all([enquiriesForCustomer(customer.id), shortlistFor(customer)])
  return (
    <AccountDashboard
      profile={{
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        phoneVerified: Boolean(customer.phoneVerified),
        city: customer.city ?? '',
        eventDate: customer.eventDate ? dayKey(customer.eventDate) : '',
      }}
      enquiries={enquiries}
      shortlist={shortlist}
      initialTab={param(sp.tab)}
      sentTo={param(sp.sent)}
    />
  )
}
