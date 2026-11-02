import React from 'react'
import type { Payload } from 'payload'

import { accessSummary, hasLevel, isStaff, LEVELS } from '../../access/roles'

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
 * job waiting, so a new team member knows where to start. Only shows the jobs in modules
 * this person can open, and only runs those queries (access/roles.ts). Server component; styles `zf-today` in
 * app/(payload)/custom.scss.
 */
export async function TodayBoard({ payload, user }: { payload: Payload; user?: unknown }) {
  if (!isStaff(user as never)) return null
  const seeClients = hasLevel(user as never, 'clients', 'read')
  const seeWhatsApp = hasLevel(user as never, 'whatsapp', 'read')
  const seeWishes = hasLevel(user as never, 'occasions', 'read')
  const canApprove = hasLevel(user as never, 'vendors', 'full')
  const canDecor = hasLevel(user as never, 'decorations', 'edit')
  const since = agoIso(DAY_MS)

  const [enquiries, wishes, recentChats, repliesSince, applications, listings, decorDrafts] = await Promise.all([
    seeClients ? payload.count({ collection: 'leads', where: { status: { equals: 'new' } } }) : null,
    seeWishes
      ? payload.count({
          collection: 'reminders',
          where: { and: [{ status: { equals: 'pending' } }, { dueDate: { less_than_equal: agoIso(0) } }] },
        })
      : null,
    seeWhatsApp
      ? payload.find({
          collection: 'whatsapp-contacts',
          where: { lastInboundAt: { greater_than: since } },
          depth: 0,
          limit: 200,
          select: { lastInboundAt: true },
        })
      : null,
    seeWhatsApp
      ? payload.find({
          collection: 'whatsapp-messages',
          where: { and: [{ direction: { equals: 'out' } }, { at: { greater_than: since } }] },
          depth: 0,
          limit: 1000,
          select: { contact: true, at: true },
        })
      : null,
    canApprove
      ? payload.count({ collection: 'vendor-applications', where: { status: { in: ['new', 'reviewing'] } } })
      : null,
    canApprove ? payload.count({ collection: 'vendors', where: { listingStatus: { equals: 'pending' } } }) : null,
    canDecor ? payload.count({ collection: 'decor-items', where: { status: { equals: 'draft' } } }) : null,
  ])

  // A chat is waiting when their last message (inside WhatsApp's 24-hour reply window)
  // is newer than our last reply to them.
  const lastReply = new Map<string, number>()
  for (const m of repliesSince?.docs ?? []) {
    const id = String(typeof m.contact === 'object' ? m.contact?.id : m.contact)
    const at = m.at ? new Date(m.at).getTime() : 0
    if (at > (lastReply.get(id) ?? 0)) lastReply.set(id, at)
  }
  const waiting = (recentChats?.docs ?? []).filter(
    (c) => c.lastInboundAt && new Date(c.lastInboundAt).getTime() > (lastReply.get(String(c.id)) ?? 0),
  ).length

  const cards: Card[] = []
  if (enquiries) {
    cards.push({
      label: 'New enquiries to call',
      count: enquiries.totalDocs,
      href: listUrl('leads', 'status', 'equals', 'new'),
      hint: 'Call them, then change Status to Contacted.',
    })
  }
  if (recentChats) {
    cards.push({
      label: 'WhatsApp chats waiting for a reply',
      count: waiting,
      href: listUrl('whatsapp-contacts', 'lastInboundAt', 'greater_than', since),
      hint: 'Reply within 24 hours of their message.',
    })
  }
  if (wishes) {
    cards.push({
      label: 'Wishes to send',
      count: wishes.totalDocs,
      href: listUrl('reminders', 'status', 'equals', 'pending'),
      hint: 'Birthdays and anniversaries that are due.',
    })
  }
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
  const summary = accessSummary(user as never)
  const levelWord = (v: string) => LEVELS.find((l) => l.value === v)?.label.split(' — ')[0] ?? v
  const open = summary.lines.filter((l) => l.level !== 'none')
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
          {summary.owner ? (
            <>
              You are <strong>the Owner</strong>: you can do everything, including adding team members and deleting.
            </>
          ) : open.length ? (
            <>
              Your access:{' '}
              {open.map((l, i) => (
                <React.Fragment key={l.label}>
                  {i > 0 ? ' · ' : ''}
                  <strong>{l.label}</strong> ({levelWord(l.level).toLowerCase()})
                </React.Fragment>
              ))}
              . Anything else is hidden: ask the Owner if you need more.
            </>
          ) : (
            <>You do not have access to any module yet. Ask the Owner.</>
          )}
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
            The <strong>menu on the left</strong> holds what you can open, in groups such as Clients, Vendors,
            WhatsApp, Decorations and Website.
          </li>
          <li>
            <strong>Click a name</strong> in any list to open it. Change what you need and press <strong>Save</strong>{' '}
            (top right).
          </li>
          <li>
            Every page has a <strong>grey line under its title</strong> that says what it is for. If a box is grey and
            won&apos;t change, your access to that module is Read only: ask the Owner.
          </li>
        </ol>
      </details>
    </section>
  )
}
