import React from 'react'
import type { Payload } from 'payload'

import { formatINR } from '../../lib/registryOptions'

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

/**
 * Gift-registry numbers on the admin dashboard (registered as `beforeDashboard`
 * in payload.config.ts). Server component: Payload passes it the Local API.
 * "Gifts claimed (value)" is the sum of listed prices of claimed gifts — a
 * stand-in for GMV, since purchases happen on the stores' sites.
 */
export async function RegistryStats({ payload }: { payload: Payload }) {
  const since = daysAgo(30)

  const [events, items, claims, clicks, clicks30, leads, newLeads, votes, voters, verifiedVoters, consented] = await Promise.all([
    payload.count({ collection: 'registry-events' }),
    payload.count({ collection: 'registry-items' }),
    payload.find({ collection: 'registry-claims', depth: 1, limit: 0, pagination: false, select: { item: true } }),
    payload.count({ collection: 'registry-clicks' }),
    payload.count({ collection: 'registry-clicks', where: { createdAt: { greater_than: since } } }),
    payload.count({ collection: 'registry-leads' }),
    payload.count({ collection: 'registry-leads', where: { status: { equals: 'new' } } }),
    payload.count({ collection: 'poll-votes' }),
    payload.count({ collection: 'poll-voters' }),
    payload.count({ collection: 'poll-voters', where: { phoneVerified: { equals: true } } }),
    payload.count({ collection: 'poll-voters', where: { marketingConsent: { equals: true } } }),
  ])

  const claimedValue = claims.docs.reduce((sum, c) => {
    const item = c.item
    return sum + (item && typeof item === 'object' ? item.price || 0 : 0)
  }, 0)

  const cards: [string, string, string?][] = [
    ['Registries', String(events.totalDocs)],
    ['Gifts listed', String(items.totalDocs)],
    ['Gifts claimed', String(claims.docs.length), `${formatINR(claimedValue)} listed value`],
    ['Store clicks', String(clicks.totalDocs), `${clicks30.totalDocs} in the last 30 days`],
    ['Registry leads', String(leads.totalDocs), `${newLeads.totalDocs} not yet contacted`],
    ['Poll votes', String(votes.totalDocs)],
    ['Poll voters', String(voters.totalDocs), `${verifiedVoters.totalDocs} verified`],
    ['Opted-in contacts', String(consented.totalDocs), 'agreed to WhatsApp updates'],
  ]

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.8rem' }}>Gift Registry & Polls</h2>
      <div
        style={{
          display: 'grid',
          gap: '0.8rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        }}
      >
        {cards.map(([label, value, sub]) => (
          <div
            key={label}
            style={{
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 8,
              padding: '0.9rem 1rem',
              background: 'var(--theme-elevation-50)',
            }}
          >
            <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>{label}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: 1.2 }}>{value}</div>
            {sub && <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>{sub}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}
