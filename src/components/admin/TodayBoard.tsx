import React from 'react'
import type { Payload } from 'payload'

import { hasRole, ROLE_HELP, roleOf } from '../../access/roles'

const DAY_MS = 24 * 60 * 60 * 1000
/** ISO time `ms` ago (0 = now). */
const agoIso = (ms: number) => new Date(Date.now() - ms).toISOString()

type Card = { label: string; count: number; href: string; hint: string }

/** `/admin/collections/<slug>?where[field][op]=value` — opens the list already filtered. */
const listUrl = (slug: string, field?: string, op?: string, value?: string) =>
  `/admin/collections/${slug}` +
  (field ? `?where[${field}][${op}]=${encodeURIComponent(value ?? '')}` : '')

/**
 * "Today" on the admin home (first `beforeDashboard` in payload.config.ts): one card per
 * job waiting, so a new team member knows where to start. Only shows the jobs this
 * person's role can do (access/roles.ts). Server component; styles `zf-today` in
 * app/(payload)/custom.scss.
 */
export async function TodayBoard({ payload, user }: { payload: Payload; user?: unknown }) {
  const role = roleOf(user as never)
  if (!role) return null
  const canManage = hasRole(user as never, 'manager')
  const canWork = hasRole(user as never, 'team')
  const since = agoIso(DAY_MS)

  const [enquiries, wishes, recentChats, repliesSince, applications, listings, decorDrafts] = await Promise.all([
    payload.count({ collection: 'leads', where: { status: { equals: 'new' } } }),
    payload.count({
      collection: 'reminders',
      where: { and: [{ status: { equals: 'pending' } }, { dueDate: { less_than_equal: agoIso(0) } }] },
    }),
    payload.find({
      collection: 'whatsapp-contacts',
      where: { lastInboundAt: { greater_than: since } },
      depth: 0,
      limit: 200,
      select: { lastInboundAt: true },
    }),
    payload.find({
      collection: 'whatsapp-messages',
      where: { and: [{ direction: { equals: 'out' } }, { at: { greater_than: since } }] },
      depth: 0,
      limit: 1000,
      select: { contact: true, at: true },
    }),
    canManage
      ? payload.count({ collection: 'vendor-applications', where: { status: { in: ['new', 'reviewing'] } } })
      : null,
    canManage ? payload.count({ collection: 'vendors', where: { listingStatus: { equals: 'pending' } } }) : null,
    canWork ? payload.count({ collection: 'decor-items', where: { status: { equals: 'draft' } } }) : null,
  ])

  // A chat is waiting when their last message (inside WhatsApp's 24-hour reply window)
  // is newer than our last reply to them.
  const lastReply = new Map<string, number>()
  for (const m of repliesSince.docs) {
    const id = String(typeof m.contact === 'object' ? m.contact?.id : m.contact)
    const at = m.at ? new Date(m.at).getTime() : 0
    if (at > (lastReply.get(id) ?? 0)) lastReply.set(id, at)
  }
  const waiting = recentChats.docs.filter(
    (c) => c.lastInboundAt && new Date(c.lastInboundAt).getTime() > (lastReply.get(String(c.id)) ?? 0),
  ).length

  const cards: Card[] = [
    {
      label: 'New enquiries to call',
      count: enquiries.totalDocs,
      href: listUrl('leads', 'status', 'equals', 'new'),
      hint: 'Call them, then change Status to Contacted.',
    },
    {
      label: 'WhatsApp chats waiting for a reply',
      count: waiting,
      href: listUrl('whatsapp-contacts', 'lastInboundAt', 'greater_than', since),
      hint: 'Reply within 24 hours of their message.',
    },
    {
      label: 'Wishes to send',
      count: wishes.totalDocs,
      href: listUrl('reminders', 'status', 'equals', 'pending'),
      hint: 'Birthdays and anniversaries that are due.',
    },
  ]
  if (applications) {
    cards.push({
      label: 'Vendor applications to check',
      count: applications.totalDocs,
      href: listUrl('vendor-applications', 'status', 'in', 'new,reviewing'),
      hint: 'Approve or reject each one.',
    })
  }
  if (listings) {
    cards.push({
      label: 'Vendor listings to approve',
      count: listings.totalDocs,
      href: listUrl('vendors', 'listingStatus', 'equals', 'pending'),
      hint: 'Set Listing status to Live, or write what to fix.',
    })
  }

  if (decorDrafts) {
    cards.push({
      label: 'Decoration drafts to finish',
      count: decorDrafts.totalDocs,
      href: listUrl('decor-items', 'status', 'equals', 'draft'),
      hint: 'Added with Quick add: give each a title, then set Status to Active.',
    })
  }

  const name = (user as { name?: string | null })?.name?.split(' ')[0]
  const [who, can] = ROLE_HELP[role]
  const todo = cards.reduce((n, c) => n + c.count, 0)

  return (
    <section className="zf-today" aria-labelledby="zf-today-title">
      <div className="zf-today__head">
        <p className="zf-eyebrow">Today</p>
        <h2 id="zf-today-title" className="zf-today__title">
          {name ? `Hi ${name}. ` : ''}
          {todo ? 'Here is what needs doing.' : 'Nothing is waiting right now.'}
        </h2>
        <p className="zf-today__role">
          You are <strong>{who}</strong>: {can}
        </p>
      </div>

      <ul className="zf-today__cards">
        {cards.map((c) => (
          <li key={c.label}>
            <a className={`zf-today__card${c.count ? ' zf-today__card--due' : ''}`} href={c.href}>
              <span className="zf-today__count">{c.count}</span>
              <span className="zf-today__label">{c.label}</span>
              <span className="zf-today__hint">{c.hint}</span>
            </a>
          </li>
        ))}
      </ul>

      <details className="zf-today__help">
        <summary>New here? How this admin works</summary>
        <ol className="zf-steps">
          <li>
            The <strong>menu on the left</strong> holds everything, in groups: Clients, Vendors, WhatsApp,
            Birthdays &amp; anniversaries, Website.
          </li>
          <li>
            <strong>Click a name</strong> in any list to open it. Change what you need and press <strong>Save</strong>{' '}
            (top right).
          </li>
          <li>
            Every page has a <strong>grey line under its title</strong> that says what it is for. If a box is grey and
            won&apos;t change, your role can&apos;t edit it: ask a Manager.
          </li>
        </ol>
      </details>
    </section>
  )
}
