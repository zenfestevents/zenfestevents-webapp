import { adminHidden, canView, canWork, hasRole, ownerOnly } from '../access/roles'
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  PayloadRequest,
} from 'payload'

import { parseYmdKey, todayIst } from '../lib/occasions/dates'
import { OCCASION_TYPES, REMINDER_CHANNELS, REMINDER_STATUSES } from '../lib/occasions/options'
import { createLeadForReminder, runDailyReminders } from '../lib/occasions/server'

const dayOnly = { date: { pickerAppearance: 'dayOnly' as const, displayFormat: 'd MMM yyyy' } }

/** Statuses that mean the message went out (so sentAt/sentBy get stamped). */
const CONTACTED = ['sent', 'replied', 'interested', 'booked', 'not_interested', 'opted_out']

/**
 * Stamps who sent it and when, and turns "Interested"/"Booked" into a Lead so
 * the follow-up lands in the normal sales list (and counts as a conversion).
 */
const onStatusChange: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || !data.status || data.status === originalDoc?.status) return data
  if (CONTACTED.includes(data.status) && !originalDoc?.sentAt && !data.sentAt) {
    data.sentAt = new Date().toISOString()
    if (req.user?.collection === 'users') data.sentBy = req.user.id
  }
  if ((data.status === 'interested' || data.status === 'booked') && !originalDoc?.lead && !data.lead) {
    data.lead = await createLeadForReminder(req.payload, { ...originalDoc, ...data }, req)
  }
  return data
}

/** Booked → the contact becomes a client; opted out → never remind them again. */
const updateContact: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (doc.status === previousDoc?.status) return doc
  const contactId = typeof doc.contact === 'object' ? doc.contact?.id : doc.contact
  if (!contactId) return doc
  const data =
    doc.status === 'booked'
      ? { relationship: 'client' as const }
      : doc.status === 'opted_out'
        ? { doNotContact: true }
        : null
  if (data) {
    await req.payload.update({ collection: 'contacts', id: contactId, data, overrideAccess: true, req })
  }
  return doc
}

/**
 * GET /api/reminders/cron — the daily run (Vercel Cron, 09:00 IST). Vercel
 * sends `Authorization: Bearer $CRON_SECRET`; a signed-in admin can also run it
 * (the dashboard's "Check now" button). Optional query: `digest=0` skips the
 * email, `date=YYYY-MM-DD` pretends it's another day (for testing).
 */
async function cron(req: PayloadRequest) {
  const secret = process.env.CRON_SECRET
  const bearer = req.headers.get('authorization') === `Bearer ${secret}`
  const isStaff = hasRole(req.user, 'viewer')
  if (!(secret && bearer) && !isStaff) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.searchParams
  const today = parseYmdKey(q.get('date')) ?? todayIst()
  try {
    const result = await runDailyReminders(req.payload, { today, sendDigest: q.get('digest') !== '0' })
    req.payload.logger.info(`[reminders/cron] ${JSON.stringify(result)}`)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    req.payload.logger.error(`[reminders/cron] ${err instanceof Error ? err.stack : String(err)}`)
    return Response.json({ ok: false, error: 'Run failed — see the server logs.' }, { status: 500 })
  }
}

/**
 * One reminder = one occasion in one year: "Priya's 1st wedding anniversary,
 * 9 Oct 2027". Created by the daily run; staff send the pre-filled WhatsApp
 * (click the number) and record what happened. The unique index on
 * (occasionId, occurrenceYear) means a run can never create it twice.
 */
export const Reminders: CollectionConfig = {
  slug: 'reminders',
  labels: { singular: 'Wish', plural: 'Wishes to send' },
  access: {
    read: canView,
    create: canWork,
    update: canWork,
    delete: ownerOnly,
  },
  admin: {
    group: 'Birthdays & anniversaries',
    useAsTitle: 'title',
    defaultColumns: ['contactName', 'phone', 'milestone', 'occurrenceDate', 'status', 'assignedTo'],
    listSearchableFields: ['title', 'contactName', 'phone'],
    description: 'Wishes that are due. Tap the WhatsApp number to open the ready message, send it, then set what they said.',
    hidden: adminHidden('reminders'),
  },
  defaultSort: '-dueDate',
  indexes: [{ fields: ['occasionId', 'occurrenceYear'], unique: true }],
  hooks: {
    beforeChange: [onStatusChange],
    afterChange: [updateContact],
  },
  endpoints: [
    { path: '/cron', method: 'get', handler: cron },
    { path: '/cron', method: 'post', handler: cron },
  ],
  fields: [
    { name: 'title', type: 'text', admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'contactName', type: 'text', label: 'Name', admin: { readOnly: true, width: '50%' } },
        {
          name: 'phone',
          type: 'text',
          label: 'WhatsApp',
          admin: {
            readOnly: true,
            width: '50%',
            components: { Cell: '/components/admin/SendWhatsApp#SendWhatsAppCell' },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'milestone', type: 'text', label: 'Occasion', admin: { readOnly: true, width: '50%' } },
        { name: 'occurrenceDate', type: 'date', label: 'Date', admin: { ...dayOnly, readOnly: true, width: '25%' } },
        { name: 'dueDate', type: 'date', label: 'Send from', admin: { ...dayOnly, readOnly: true, width: '25%' } },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      admin: { description: 'Edit before sending if you like — the WhatsApp link uses this text.' },
    },
    { name: 'outcomeNotes', type: 'textarea', label: 'Notes / what they said' },

    /* ---- sidebar ---- */
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [...REMINDER_STATUSES],
      admin: { position: 'sidebar' },
    },
    {
      name: 'channel',
      type: 'select',
      defaultValue: 'wa_manual',
      options: [...REMINDER_CHANNELS],
      admin: { position: 'sidebar' },
    },
    { name: 'assignedTo', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar' } },
    {
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
      label: 'Lead (when interested)',
      admin: { position: 'sidebar', description: 'Created automatically on Interested / Booked.' },
    },
    { name: 'sentAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'sentBy', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar', readOnly: true } },
    { name: 'contact', type: 'relationship', relationTo: 'contacts', required: true, index: true, admin: { position: 'sidebar' } },
    {
      name: 'occasionType',
      type: 'select',
      options: [...OCCASION_TYPES],
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'occasionId', type: 'text', required: true, index: true, admin: { hidden: true } },
    { name: 'occurrenceYear', type: 'number', required: true, admin: { hidden: true } },
    { name: 'nthYear', type: 'number', admin: { hidden: true } },
  ],
}
