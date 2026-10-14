import React from 'react'
import type { Payload } from 'payload'

import { addDays, daysBetween, istYmd, nextOccurrence, todayIst, ymdKey, ymdToIso } from '../../lib/occasions/dates'
import { milestone } from '../../lib/occasions/options'
import { OccasionsBoard, type BoardItem } from './OccasionsBoard'

const COMING_UP_DAYS = 60

/**
 * Occasion reminders on the admin home (registered as `beforeDashboard` in
 * payload.config.ts). Server component — Payload passes it the Local API;
 * the interactive part is OccasionsBoard. Styles: app/(payload)/custom.scss.
 */
export async function UpcomingOccasions({ payload }: { payload: Payload }) {
  const today = todayIst()
  const startOfMonth = new Date(`${ymdKey({ ...today, d: 1 })}T00:00:00+05:30`).toISOString()
  const horizon = ymdToIso(addDays(today, COMING_UP_DAYS))

  const [pending, soon, sent, interested, booked, contacts, unverified] = await Promise.all([
    payload.find({
      collection: 'reminders',
      where: { status: { equals: 'pending' } },
      sort: 'occurrenceDate',
      depth: 1,
      limit: 50,
    }),
    payload.find({
      collection: 'contacts',
      where: {
        and: [{ nextOccasionDate: { less_than_equal: horizon } }, { doNotContact: { not_equals: true } }],
      },
      sort: 'nextOccasionDate',
      depth: 0,
      limit: 200,
    }),
    payload.count({ collection: 'reminders', where: { sentAt: { greater_than_equal: startOfMonth } } }),
    payload.count({
      collection: 'reminders',
      where: { and: [{ status: { in: ['interested', 'booked'] } }, { updatedAt: { greater_than_equal: startOfMonth } }] },
    }),
    payload.count({
      collection: 'reminders',
      where: { and: [{ status: { equals: 'booked' } }, { updatedAt: { greater_than_equal: startOfMonth } }] },
    }),
    payload.count({ collection: 'contacts' }),
    payload.count({ collection: 'contacts', where: { verified: { equals: false } } }),
  ])

  const toSend: BoardItem[] = pending.docs.flatMap((r) => {
    const date = istYmd(r.occurrenceDate)
    if (!date) return []
    const contact = typeof r.contact === 'object' ? r.contact : null
    return [
      {
        key: `r${r.id}`,
        reminderId: r.id,
        name: r.contactName ?? contact?.name ?? '',
        milestone: r.milestone ?? '',
        type: r.occasionType ?? 'other',
        date: ymdKey(date),
        days: daysBetween(today, date),
        relationship: contact?.relationship ?? null,
        phone: r.phone ?? '',
        message: r.message ?? '',
        href: `/admin/collections/reminders/${r.id}`,
      },
    ]
  })

  // Occasions in the next 60 days that don't have a reminder yet (it is created
  // on its lead day) — so the team can see what's coming.
  const reminded = new Set(pending.docs.map((r) => r.occasionId))
  const comingUp: BoardItem[] = soon.docs
    .flatMap((c) =>
      (c.occasions ?? []).flatMap((o) => {
        const original = istYmd(o.date)
        if (!original || o.active === false || !o.id || reminded.has(o.id)) return []
        const next = nextOccurrence(original, today, o.yearKnown !== false)
        const days = daysBetween(today, next.date)
        if (days > COMING_UP_DAYS) return []
        const words = milestone(o.type, next.nth, o.label)
        return [
          {
            key: `o${o.id}`,
            name: c.name,
            milestone: words.charAt(0).toUpperCase() + words.slice(1) + (o.personName ? ` · ${o.personName}` : ''),
            type: o.type,
            date: ymdKey(next.date),
            days,
            relationship: c.relationship,
            href: `/admin/collections/contacts/${c.id}`,
          },
        ]
      }),
    )
    .sort((a, b) => a.days - b.days)

  return (
    <OccasionsBoard
      toSend={toSend}
      comingUp={comingUp}
      stats={{
        sent: sent.totalDocs,
        interested: interested.totalDocs,
        booked: booked.totalDocs,
        contacts: contacts.totalDocs,
        unverified: unverified.totalDocs,
      }}
    />
  )
}
