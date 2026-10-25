import type { CollectionConfig, PayloadRequest } from 'payload'

import { adminHidden, canView, canWork, hasRole, ownerOnly, type Role } from '../access/roles'
import { sendText } from '../lib/whatsapp/cloud'
import { toWaNumber } from '../lib/whatsapp/phone'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Everyone we talk to on the WhatsApp Cloud API number: people who messaged us
 * (added automatically by the webhook) and lists staff import. Campaigns go only
 * to `optIn = yes`; "STOP" sets it to `no` (see lib/whatsapp/inbox.ts). Admin only.
 */
export const WhatsAppContacts: CollectionConfig = {
  slug: 'whatsapp-contacts',
  labels: { singular: 'Chat', plural: 'Chats & contacts' },
  access: {
    read: canView,
    create: canWork,
    update: canWork,
    delete: ownerOnly,
  },
  admin: {
    group: 'WhatsApp',
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'optIn', 'lastInboundAt', 'tags'],
    listSearchableFields: ['name', 'phone', 'tags'],
    components: {
      beforeListTable: ['/components/admin/whatsapp/ImportContacts#ImportContacts'],
    },
    description: 'Everyone on our WhatsApp number. Open a person to read the chat and reply. Offers go only to “Opted in” people; anyone who replies STOP is moved to “Opted out” automatically.',
    hidden: adminHidden('whatsapp-contacts'),
  },
  defaultSort: '-lastInboundAt',
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data?.phone) data.phone = toWaNumber(data.phone) ?? data.phone
        if (data?.optIn === 'yes' && !data.optInAt) data.optInAt = new Date().toISOString()
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'phone',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'WhatsApp number',
      admin: { description: 'Country code + number, e.g. 919840012345. A 10-digit Indian number gets 91 added.' },
    },
    {
      name: 'optIn',
      type: 'select',
      required: true,
      defaultValue: 'unknown',
      label: 'Promotions',
      options: [
        { label: 'Opted in', value: 'yes' },
        { label: 'Not asked yet', value: 'unknown' },
        { label: 'Opted out', value: 'no' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'optInSource', type: 'text', label: 'How they opted in', admin: { position: 'sidebar' } },
    { name: 'optInAt', type: 'date', label: 'Opted in on', admin: { position: 'sidebar', readOnly: true } },
    { name: 'optedOutAt', type: 'date', label: 'Opted out on', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'lastInboundAt',
      type: 'date',
      label: 'Last message from them',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Free replies are allowed for 24 hours after this.',
      },
    },
    {
      name: 'tags',
      type: 'text',
      admin: { description: 'Comma-separated, e.g. "wedding, chennai". A campaign can target one tag.' },
    },
    { name: 'source', type: 'text', defaultValue: 'manual', admin: { position: 'sidebar', readOnly: true } },
    { name: 'lead', type: 'relationship', relationTo: 'leads', admin: { position: 'sidebar' } },
    { name: 'notes', type: 'textarea' },
    {
      name: 'chat',
      type: 'ui',
      admin: { components: { Field: '/components/admin/whatsapp/ContactChat#ContactChat' } },
    },
  ],
  endpoints: [
    { path: '/import', method: 'post', handler: importContacts },
    { path: '/:id/reply', method: 'post', handler: reply },
  ],
}

const json = (body: unknown, status = 200) => Response.json(body, { status })
const isStaff = (req: PayloadRequest, min: Role = 'viewer') => hasRole(req.user, min)

async function readJson(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    return ((await req.json?.()) as Record<string, unknown>) ?? {}
  } catch {
    return {}
  }
}

/**
 * POST /import { text, optedIn, source, tags } — one person per line, "name, phone"
 * (comma or tab separated, as pasted from Excel / Google Sheets; either order).
 * Existing numbers are updated, never switched back from "Opted out".
 */
async function importContacts(req: PayloadRequest) {
  if (!isStaff(req, 'manager')) return json({ error: 'Only a Manager or the Owner can import contacts.' }, 403)
  const body = await readJson(req)
  const lines = String(body.text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return json({ error: 'Paste at least one line.' }, 400)
  if (lines.length > 2000) return json({ error: 'At most 2,000 lines at a time.' }, 400)

  const optedIn = body.optedIn === true
  const source = String(body.source ?? '').slice(0, 120) || 'Imported list'
  const tags = String(body.tags ?? '').slice(0, 200)
  let added = 0
  let updated = 0
  const skipped: string[] = []

  for (const [i, line] of lines.entries()) {
    const cells = line.split(/[,\t;]/).map((c) => c.trim()).filter(Boolean)
    const phoneCell = cells.find((c) => toWaNumber(c))
    const phone = phoneCell ? toWaNumber(phoneCell) : null
    if (!phone) {
      if (i > 0 || !/phone|number|mobile|name/i.test(line)) skipped.push(line) // a header row is ignored quietly
      continue
    }
    const name = cells.find((c) => c !== phoneCell && !/^\d[\d\s+-]*$/.test(c)) ?? ''

    const { docs } = await req.payload.find({
      collection: 'whatsapp-contacts',
      where: { phone: { equals: phone } },
      limit: 1,
      depth: 0,
      req,
    })
    const existing = docs[0]
    if (existing) {
      await req.payload.update({
        collection: 'whatsapp-contacts',
        id: existing.id,
        data: {
          ...(name && !existing.name ? { name } : {}),
          ...(tags ? { tags: mergeTags(existing.tags, tags) } : {}),
          ...(optedIn && existing.optIn === 'unknown' ? { optIn: 'yes', optInSource: source } : {}),
        },
        req,
      })
      updated++
    } else {
      await req.payload.create({
        collection: 'whatsapp-contacts',
        data: { phone, name, tags, source: 'import', optIn: optedIn ? 'yes' : 'unknown', optInSource: optedIn ? source : '' },
        req,
      })
      added++
    }
  }

  return json({ added, updated, skipped: skipped.slice(0, 20), skippedCount: skipped.length })
}

function mergeTags(current: string | null | undefined, extra: string) {
  const all = [...String(current ?? '').split(','), ...extra.split(',')].map((t) => t.trim()).filter(Boolean)
  return [...new Set(all)].join(', ')
}

/** POST /:id/reply { text } — a free-form reply, allowed within 24 h of their last message. */
async function reply(req: PayloadRequest) {
  if (!isStaff(req, 'team')) return json({ error: 'Viewers can read chats but not reply.' }, 403)
  const id = req.routeParams?.id as string
  const text = String((await readJson(req)).text ?? '').trim()
  if (!text) return json({ error: 'Type a message first.' }, 400)
  if (text.length > 4096) return json({ error: 'WhatsApp messages can be at most 4,096 characters.' }, 400)

  let contact
  try {
    contact = await req.payload.findByID({ collection: 'whatsapp-contacts', id, depth: 0, req })
  } catch {
    return json({ error: 'Contact not found.' }, 404)
  }
  const last = contact.lastInboundAt ? new Date(contact.lastInboundAt).getTime() : 0
  if (Date.now() - last > DAY_MS) {
    return json(
      { error: "It's been more than 24 hours since their last message, so WhatsApp only allows an approved template. Send one through a campaign, or call them." },
      400,
    )
  }

  const sent = await sendText(contact.phone, text)
  if (!sent.ok) return json({ error: sent.error }, 502)

  const message = await req.payload.create({
    collection: 'whatsapp-messages',
    data: {
      direction: 'out',
      phone: contact.phone,
      contact: contact.id,
      type: 'text',
      text,
      waMessageId: sent.id,
      status: 'sent',
      at: new Date().toISOString(),
      sentBy: req.user?.id,
    },
    req,
  })
  return json({ ok: true, message })
}
