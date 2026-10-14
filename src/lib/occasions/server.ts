// Server-only logic for occasion reminders (Local API). Don't import from client
// components — use options/dates/message.ts there.
import type { Payload, PayloadRequest } from 'payload'

import type { Contact, Lead, Reminder, ReminderSetting } from '../../payload-types'
import {
  type Ymd,
  addDays,
  daysBetween,
  formatDay,
  formatFull,
  istYmd,
  nextOccurrence,
  relativeDays,
  ymdToIso,
} from './dates'
import { DEFAULT_CLIENT_MESSAGE, DEFAULT_LEAD_MESSAGE, fillMessage, formatPhone, reminderWaLink, toWaNumber } from './message'
import { DEFAULT_LEAD_DAYS, type OccasionType, type Relationship, milestone } from './options'

type OccasionRow = NonNullable<Contact['occasions']>[number]
type OccasionInput = Omit<OccasionRow, 'id' | 'nextDate'>

export type ResolvedReminderSettings = {
  leadDays: Record<OccasionType, number>
  clientMessage: string
  leadMessage: string
  overrides: NonNullable<NonNullable<ReminderSetting['messages']>['overrides']>
  digestEnabled: boolean
  digestRecipients: string[]
  ingestWebsite: boolean
}

/** Reminder Settings with every blank filled from the code defaults. */
export async function getReminderSettings(payload: Payload, req?: PayloadRequest): Promise<ResolvedReminderSettings> {
  let s: Partial<ReminderSetting> = {}
  try {
    s = await payload.findGlobal({ slug: 'reminder-settings', depth: 0, overrideAccess: true, req })
  } catch {
    // Missing global (fresh DB) → defaults.
  }
  const leadDays = { ...DEFAULT_LEAD_DAYS }
  for (const key of Object.keys(leadDays) as OccasionType[]) {
    const v = s.leadDays?.[key]
    if (typeof v === 'number' && v > 0) leadDays[key] = v
  }
  const fallbackTo = process.env.LEAD_NOTIFICATION_EMAIL || 'zenfestevents@gmail.com'
  const recipients = (s.digest?.recipients || fallbackTo)
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  return {
    leadDays,
    clientMessage: s.messages?.client?.trim() || DEFAULT_CLIENT_MESSAGE,
    leadMessage: s.messages?.lead?.trim() || DEFAULT_LEAD_MESSAGE,
    overrides: s.messages?.overrides ?? [],
    digestEnabled: s.digest?.enabled !== false,
    digestRecipients: recipients,
    ingestWebsite: s.ingestWebsite === true,
  }
}

function pickTemplate(settings: ResolvedReminderSettings, type: string, relationship: string | null | undefined) {
  const audience = relationship === 'client' ? 'client' : 'lead'
  const special =
    settings.overrides.find((o) => o.occasionType === type && o.audience === audience) ??
    settings.overrides.find((o) => o.occasionType === type && o.audience === 'any')
  return special?.message || (audience === 'client' ? settings.clientMessage : settings.leadMessage)
}

/** Each occasion's next date, and the soonest active one for the contact. */
export function withNextDates<T extends Partial<OccasionRow>>(rows: T[] | null | undefined, today: Ymd) {
  let soonest: Ymd | null = null
  const occasions = (rows ?? []).map((row) => {
    const original = istYmd(row.date)
    if (!original) return { ...row, nextDate: null }
    const { date } = nextOccurrence(original, today, row.yearKnown !== false)
    if (row.active !== false && (!soonest || daysBetween(date, soonest) > 0)) soonest = date
    return { ...row, nextDate: ymdToIso(date) }
  })
  return { occasions, nextOccasionDate: soonest ? ymdToIso(soonest) : null }
}

/**
 * Creates the reminder for every occasion of `contact` whose next date is within
 * its lead time and that has none yet for that year. Returns how many it made.
 */
export async function ensureReminders(
  payload: Payload,
  contact: Contact,
  settings: ResolvedReminderSettings,
  today: Ymd,
  req?: PayloadRequest,
): Promise<number> {
  if (contact.doNotContact) return 0
  let created = 0
  for (const row of contact.occasions ?? []) {
    if (row.active === false || !row.id) continue
    const original = istYmd(row.date)
    if (!original) continue
    const { date, nth } = nextOccurrence(original, today, row.yearKnown !== false)
    const days = daysBetween(today, date)
    if (days > (row.leadTimeDays || settings.leadDays[row.type])) continue

    const existing = await payload.count({
      collection: 'reminders',
      where: { and: [{ occasionId: { equals: row.id } }, { occurrenceYear: { equals: date.y } }] },
      overrideAccess: true,
      req,
    })
    if (existing.totalDocs > 0) continue

    const words = milestone(row.type, nth, row.label)
    const message = fillMessage(pickTemplate(settings, row.type, contact.relationship), {
      name: contact.name,
      personName: row.personName,
      milestone: words,
      date: formatDay(date),
      days: relativeDays(days),
    })
    const whose = row.personName?.trim() ? ` (${row.personName.trim()})` : ''
    const ownerId = typeof contact.owner === 'object' ? contact.owner?.id : contact.owner
    await payload.create({
      collection: 'reminders',
      data: {
        title: `${contact.name}${whose} — ${words} · ${formatFull(date)}`,
        contact: contact.id,
        contactName: contact.name,
        phone: contact.phone,
        occasionId: row.id,
        occasionType: row.type,
        milestone: words.charAt(0).toUpperCase() + words.slice(1) + whose,
        occurrenceDate: ymdToIso(date),
        occurrenceYear: date.y,
        nthYear: nth,
        dueDate: ymdToIso(addDays(date, -(row.leadTimeDays || settings.leadDays[row.type]))),
        status: 'pending',
        channel: 'wa_manual',
        assignedTo: ownerId ?? undefined,
        message,
      },
      overrideAccess: true,
      req,
    })
    created++
  }
  return created
}

/**
 * The daily run: roll every contact's dates forward, create the reminders now
 * inside their lead time, mark unsent ones whose date has passed as missed,
 * and email the team the list still to send.
 */
export async function runDailyReminders(payload: Payload, opts: { today: Ymd; sendDigest?: boolean }) {
  const { today } = opts
  const todayIso = ymdToIso(today)
  const settings = await getReminderSettings(payload)
  const contacts = await payload.find({
    collection: 'contacts',
    where: { doNotContact: { not_equals: true } },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })

  const iso = (v?: string | null) => (v ? new Date(v).toISOString() : null)
  let rolled = 0
  let created = 0
  for (const contact of contacts.docs) {
    const { occasions, nextOccasionDate } = withNextDates(contact.occasions, today)
    const stale =
      nextOccasionDate !== iso(contact.nextOccasionDate) ||
      occasions.some((o, i) => o.nextDate !== iso(contact.occasions?.[i]?.nextDate))
    if (stale) {
      await payload.update({
        collection: 'contacts',
        id: contact.id,
        data: { occasions, nextOccasionDate },
        overrideAccess: true,
        context: { skipReminderSync: true },
      })
      rolled++
    }
    created += await ensureReminders(payload, contact, settings, today)
  }

  const missed = await payload.update({
    collection: 'reminders',
    where: { and: [{ status: { equals: 'pending' } }, { occurrenceDate: { less_than: todayIso } }] },
    data: { status: 'missed' },
    overrideAccess: true,
  })

  let digestSent = false
  if (opts.sendDigest !== false && settings.digestEnabled) {
    digestSent = await sendDigest(payload, settings, today, created)
  }
  return { today: formatFull(today), contacts: contacts.docs.length, rolled, created, missed: missed.docs.length, digestSent }
}

async function sendDigest(payload: Payload, settings: ResolvedReminderSettings, today: Ymd, created: number) {
  const pending = await payload.find({
    collection: 'reminders',
    where: { status: { equals: 'pending' } },
    sort: 'occurrenceDate',
    depth: 0,
    limit: 100,
    overrideAccess: true,
  })
  if (pending.docs.length === 0) return false

  const lines = pending.docs.map((r: Reminder) => {
    const date = istYmd(r.occurrenceDate)
    const when = date ? `${formatDay(date)} (${relativeDays(daysBetween(today, date))})` : ''
    return `• ${r.contactName} — ${r.milestone} — ${when}\n  ${formatPhone(r.phone)} · ${reminderWaLink(r.phone, r.message)}`
  })
  const listUrl = `${payload.config.serverURL}/admin/collections/reminders?where[status][equals]=pending&sort=occurrenceDate`
  const text = [
    `${pending.docs.length} occasion reminder(s) to send${created ? ` (${created} new today)` : ''}.`,
    '',
    'Each link opens WhatsApp with the message ready. After sending, mark it Sent in the admin:',
    listUrl,
    '',
    ...lines,
  ].join('\n')

  try {
    await payload.sendEmail({
      to: settings.digestRecipients.join(', '),
      subject: `Occasion reminders: ${pending.docs.length} to send (${formatFull(today)})`,
      text,
    })
    return true
  } catch (err) {
    payload.logger.warn(`[reminders] Digest email failed: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

const LEAD_EVENT_TYPE: Record<OccasionType, Lead['eventType']> = {
  birthday: 'birthday',
  kid_birthday: 'birthday',
  wedding_anniversary: 'other',
  engagement_anniversary: 'other',
  housewarming_anniversary: 'other',
  corporate_annual: 'corporate',
  other: 'other',
}

/** A Lead for a reminder that turned into interest, so it's followed up like any enquiry. */
export async function createLeadForReminder(
  payload: Payload,
  reminder: Partial<Reminder>,
  req?: PayloadRequest,
): Promise<number | undefined> {
  const contactId = typeof reminder.contact === 'object' ? reminder.contact?.id : reminder.contact
  if (!contactId) return undefined
  const contact = await payload.findByID({ collection: 'contacts', id: contactId, depth: 0, overrideAccess: true, req })
  const lead = await payload.create({
    collection: 'leads',
    data: {
      name: contact.name,
      phone: formatPhone(contact.phone),
      email: contact.email || undefined,
      eventType: LEAD_EVENT_TYPE[(reminder.occasionType as OccasionType) ?? 'other'] ?? 'other',
      eventDate: reminder.occurrenceDate || undefined,
      branch: contact.branch || undefined,
      message: `From an occasion reminder: ${reminder.title ?? reminder.milestone ?? ''}${
        reminder.outcomeNotes ? `\n\n${reminder.outcomeNotes}` : ''
      }`,
      status: reminder.status === 'booked' ? 'booked' : 'contacted',
      source: 'occasion-reminder',
    },
    overrideAccess: true,
    req,
    context: { skipNotify: true, fromReminder: true },
  })
  return lead.id
}

const RANK: Record<Relationship, number> = { cold: 0, lead: 1, client: 2 }

/**
 * Adds (or updates) the contact for a website enquiry / sign-up. Never lowers
 * what staff already set: a verified client stays verified and a client.
 */
export async function upsertWebsiteContact(
  payload: Payload,
  req: PayloadRequest,
  input: {
    name: string
    phone: unknown
    email?: string | null
    source: 'website_lead' | 'website_signup'
    relationship: Relationship
    occasions: OccasionInput[]
    websiteLead?: number
    websiteSignup?: number
  },
) {
  const phone = toWaNumber(input.phone)
  if (!phone) return
  const found = await payload.find({
    collection: 'contacts',
    where: { phone: { equals: phone } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const existing = found.docs[0]
  if (!existing) {
    if (input.occasions.length === 0) return
    await payload.create({
      collection: 'contacts',
      data: {
        name: input.name,
        phone,
        email: input.email || undefined,
        source: input.source,
        relationship: input.relationship,
        verified: false,
        occasions: input.occasions,
        websiteLead: input.websiteLead,
        websiteSignup: input.websiteSignup,
      },
      overrideAccess: true,
      req,
    })
    return
  }

  const sameDay = (a: unknown, b: unknown) => {
    const x = istYmd(a as string)
    const y = istYmd(b as string)
    return Boolean(x && y && x.m === y.m && x.d === y.d)
  }
  const rows: Partial<OccasionRow>[] = [...(existing.occasions ?? [])]
  for (const occ of input.occasions) {
    const match = rows.find((r) => r.type === occ.type && sameDay(r.date, occ.date))
    if (!match) rows.push(occ)
    else if (occ.eventWithUs) match.eventWithUs = true
  }
  await payload.update({
    collection: 'contacts',
    id: existing.id,
    data: {
      occasions: rows as OccasionRow[],
      relationship: RANK[input.relationship] > RANK[existing.relationship] ? input.relationship : existing.relationship,
      websiteLead: existing.websiteLead ?? input.websiteLead,
      websiteSignup: existing.websiteSignup ?? input.websiteSignup,
    },
    overrideAccess: true,
    req,
  })
}
