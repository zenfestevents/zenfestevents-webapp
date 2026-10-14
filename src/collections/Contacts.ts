import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { authenticated } from '../access'
import { todayIst } from '../lib/occasions/dates'
import { toWaNumber } from '../lib/occasions/message'
import { BRANCHES, CONTACT_SOURCES, OCCASION_TYPES, RELATIONSHIPS } from '../lib/occasions/options'
import { ensureReminders, getReminderSettings, withNextDates } from '../lib/occasions/server'

const dayOnly = { date: { pickerAppearance: 'dayOnly' as const, displayFormat: 'd MMM yyyy' } }

/** Normalises the phone and works out each occasion's next date (and the soonest one). */
const computeDates: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data.phone) data.phone = toWaNumber(data.phone) ?? data.phone
  const rows = data.occasions ?? originalDoc?.occasions
  const { occasions, nextOccasionDate } = withNextDates(rows, todayIst())
  if (data.occasions) data.occasions = occasions
  data.nextOccasionDate = nextOccasionDate
  return data
}

/**
 * Creates a reminder straight away when an occasion is already inside its
 * lead time (e.g. a contact added 5 days before their anniversary), instead of
 * waiting for tomorrow's daily run. Turning on "Do not contact" skips any
 * reminder still waiting to be sent.
 */
const syncReminders: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context?.skipReminderSync) return doc
  try {
    if (doc.doNotContact && !previousDoc?.doNotContact) {
      await req.payload.update({
        collection: 'reminders',
        where: { and: [{ contact: { equals: doc.id } }, { status: { equals: 'pending' } }] },
        data: { status: 'skipped', outcomeNotes: 'Contact marked "Do not contact".' },
        overrideAccess: true,
        req,
      })
      return doc
    }
    const settings = await getReminderSettings(req.payload, req)
    await ensureReminders(req.payload, doc, settings, todayIst(), req)
  } catch (err) {
    req.payload.logger.warn(
      `[contacts] Saved, but reminders were not checked: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  return doc
}

/**
 * Everyone whose yearly occasions we remember: past clients, unconverted leads
 * and cold contacts. Internal only (admin/staff). One person = one phone
 * number; their birthdays, anniversaries etc. are the "Occasions" rows. The
 * daily job turns each upcoming occasion into a Reminder for the team to send.
 */
export const Contacts: CollectionConfig = {
  slug: 'contacts',
  labels: { singular: 'Contact', plural: 'Contacts' },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Occasion Reminders',
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'relationship', 'nextOccasionDate', 'source', 'verified'],
    listSearchableFields: ['name', 'phone', 'notes'],
    description:
      'Clients and leads whose birthdays and anniversaries we remember. Add the person once, then all their occasions below — reminders are created automatically before each date.',
  },
  defaultSort: 'nextOccasionDate',
  hooks: {
    beforeChange: [computeDates],
    afterChange: [syncReminders],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'phone',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'WhatsApp number',
      validate: (value: unknown) =>
        toWaNumber(value) ? true : 'Enter a mobile number (10 digits, or with the country code for abroad).',
      admin: {
        description: 'Saved as 91XXXXXXXXXX. Each number can be added only once — search before adding.',
        components: { Cell: '/components/admin/WhatsAppCell#WhatsAppCell' },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'relationship',
          type: 'select',
          required: true,
          defaultValue: 'lead',
          options: [...RELATIONSHIPS],
          admin: { width: '50%' },
        },
        {
          name: 'source',
          type: 'select',
          required: true,
          defaultValue: 'whatsapp',
          label: 'Where they came from',
          options: [...CONTACT_SOURCES],
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'occasions',
      type: 'array',
      labels: { singular: 'Occasion', plural: 'Occasions' },
      admin: {
        initCollapsed: false,
        description: 'Every yearly date for this person or family: their birthday, wedding, children, housewarming…',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'type', type: 'select', required: true, options: [...OCCASION_TYPES], admin: { width: '40%' } },
            {
              name: 'date',
              type: 'date',
              required: true,
              label: 'Original date',
              admin: {
                ...dayOnly,
                width: '30%',
                description: 'The wedding / birth / event date. Year unknown? Pick any year and untick below.',
              },
            },
            {
              name: 'personName',
              type: 'text',
              label: 'Whose occasion',
              admin: {
                width: '30%',
                description: 'Blank = the contact. Else as it should read: "Aarav", "Priya & Karthik".',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Occasion name',
              admin: {
                width: '40%',
                condition: (_, row) => row?.type === 'other' || row?.type === 'corporate_annual',
                description: 'e.g. "company anniversary", "shop opening anniversary".',
              },
            },
            {
              name: 'leadTimeDays',
              type: 'number',
              min: 1,
              max: 90,
              label: 'Remind days before',
              admin: { width: '30%', description: 'Blank = the default in Reminder Settings.' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'yearKnown',
              type: 'checkbox',
              defaultValue: true,
              label: 'Year is correct',
              admin: { width: '33%', description: 'Needed to say "5th anniversary".' },
            },
            { name: 'eventWithUs', type: 'checkbox', label: 'Zenfest did this event', admin: { width: '33%' } },
            { name: 'active', type: 'checkbox', defaultValue: true, label: 'Send reminders', admin: { width: '33%' } },
          ],
        },
        {
          name: 'nextDate',
          type: 'date',
          label: 'Next date',
          admin: { ...dayOnly, readOnly: true, description: 'Worked out automatically.' },
        },
      ],
    },
    { name: 'notes', type: 'textarea', admin: { description: 'Anything that helps the pitch: budget, likes, last event.' } },
    {
      type: 'row',
      fields: [
        { name: 'email', type: 'email', admin: { width: '50%' } },
        { name: 'altPhone', type: 'text', label: 'Other phone', admin: { width: '50%' } },
      ],
    },

    /* ---- sidebar ---- */
    {
      name: 'nextOccasionDate',
      type: 'date',
      index: true,
      label: 'Next occasion',
      admin: { ...dayOnly, position: 'sidebar', readOnly: true },
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: true,
      label: 'Details verified',
      admin: {
        position: 'sidebar',
        description: 'Website contacts arrive unverified (typed by the visitor). Tick after confirming on a call/chat.',
      },
    },
    {
      name: 'tier',
      type: 'select',
      defaultValue: 'regular',
      options: [
        { label: 'Regular', value: 'regular' },
        { label: 'VIP — always a personal call', value: 'vip' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      label: 'Handled by',
      admin: { position: 'sidebar', description: 'Their reminders are assigned to this person.' },
    },
    { name: 'branch', type: 'select', options: [...BRANCHES], admin: { position: 'sidebar' } },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Tamil', value: 'ta' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'doNotContact',
      type: 'checkbox',
      label: 'Do not contact',
      admin: { position: 'sidebar', description: 'They asked us to stop. No more reminders are created.' },
    },
    {
      name: 'websiteLead',
      type: 'relationship',
      relationTo: 'leads',
      label: 'Website enquiry',
      admin: { position: 'sidebar', readOnly: true, condition: (data) => Boolean(data?.websiteLead) },
    },
    {
      name: 'websiteSignup',
      type: 'relationship',
      relationTo: 'signups',
      label: 'Website sign-up',
      admin: { position: 'sidebar', readOnly: true, condition: (data) => Boolean(data?.websiteSignup) },
    },
  ],
}
