// Server-only: saves what Meta's webhook reports — incoming messages and the
// delivery status of messages we sent — into the WhatsApp collections.
import type { Payload } from 'payload'

import { sendText } from './cloud'
import { extractEvents, optCommand, type WaInbound, type WaStatus, type WebhookBody } from './events'
import { phoneVariants, toWaNumber } from './phone'

// A status only moves forward (Meta can deliver "delivered" after "read").
const STATUS_RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: 4 }

export async function recordWebhook(payload: Payload, body: WebhookBody) {
  for (const event of extractEvents(body)) {
    try {
      if (event.kind === 'message') await recordInbound(payload, event)
      else await recordStatus(payload, event)
    } catch (err) {
      payload.logger.error(
        `[whatsapp] Could not save webhook event ${event.id}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}

/** Finds the person by number, creating them (opt-in unknown) the first time they write. */
export async function findOrCreateContact(payload: Payload, phone: string, name?: string) {
  const { docs } = await payload.find({
    collection: 'whatsapp-contacts',
    where: { phone: { equals: phone } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (docs[0]) return docs[0]

  const lead = await payload.find({
    collection: 'leads',
    where: { phone: { in: phoneVariants(phone) } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return payload.create({
    collection: 'whatsapp-contacts',
    data: { phone, name: name || lead.docs[0]?.name || '', optIn: 'unknown', source: 'whatsapp', lead: lead.docs[0]?.id },
    overrideAccess: true,
  })
}

async function recordInbound(payload: Payload, m: WaInbound) {
  // Meta can deliver the same webhook twice; the message id is unique.
  const seen = await payload.count({
    collection: 'whatsapp-messages',
    where: { waMessageId: { equals: m.id } },
    overrideAccess: true,
  })
  if (seen.totalDocs) return

  const phone = toWaNumber(m.from) ?? m.from
  const contact = await findOrCreateContact(payload, phone, m.name)

  await payload.create({
    collection: 'whatsapp-messages',
    data: {
      direction: 'in',
      phone,
      contact: contact.id,
      type: m.type,
      text: m.text,
      waMessageId: m.id,
      status: 'received',
      at: m.at,
    },
    overrideAccess: true,
  })

  const command = optCommand(m.text)
  await payload.update({
    collection: 'whatsapp-contacts',
    id: contact.id,
    data: {
      lastInboundAt: m.at,
      ...(!contact.name && m.name ? { name: m.name } : {}),
      ...(command === 'stop' ? { optIn: 'no', optedOutAt: m.at } : {}),
      ...(command === 'start' ? { optIn: 'yes', optInSource: 'Replied START on WhatsApp', optInAt: m.at } : {}),
    },
    overrideAccess: true,
  })

  if (command) {
    // Free: we're inside the 24-hour window the person just opened.
    const reply =
      command === 'stop'
        ? "Done — you won't get promotional messages from Zenfest Events any more. Reply START if you change your mind."
        : "Welcome back! You'll get event updates and offers from Zenfest Events. Reply STOP any time to opt out."
    const sent = await sendText(phone, reply)
    if (sent.ok) {
      await payload.create({
        collection: 'whatsapp-messages',
        data: { direction: 'out', phone, contact: contact.id, type: 'text', text: reply, waMessageId: sent.id, status: 'sent', at: new Date().toISOString() },
        overrideAccess: true,
      })
    }
  }
}

async function recordStatus(payload: Payload, s: WaStatus) {
  const { docs } = await payload.find({
    collection: 'whatsapp-messages',
    where: { waMessageId: { equals: s.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const msg = docs[0]
  if (!msg) return // e.g. a test sent from Meta's dashboard

  const better = (STATUS_RANK[s.status] ?? 0) > (STATUS_RANK[msg.status ?? ''] ?? 0)
  if (!better && !s.error) return
  await payload.update({
    collection: 'whatsapp-messages',
    id: msg.id,
    data: {
      ...(better ? { status: s.status as 'sent' | 'delivered' | 'read' | 'failed' } : {}),
      ...(s.error ? { error: s.error } : {}),
    },
    overrideAccess: true,
  })
}
