import type { CollectionConfig, PayloadRequest, Where } from 'payload'

import { adminHidden, canManage, canView, hasRole, ownerOnly, type Role } from '../access/roles'
import { cloudConfigured, sendTemplate } from '../lib/whatsapp/cloud'

/** Messages sent per request, so one request stays well inside Vercel's time limit. */
const BATCH_SIZE = 20

/**
 * A promotional send: one approved WhatsApp template to every opted-in contact
 * (optionally one tag). The admin's "Send" panel calls `/:id/send-batch` until
 * nobody is left. Each person gets a campaign at most once — failures included,
 * so a bad number isn't retried in a loop. Admin only.
 */
export const WhatsAppCampaigns: CollectionConfig = {
  slug: 'whatsapp-campaigns',
  labels: { singular: 'Bulk message', plural: 'Bulk messages' },
  access: {
    read: canView,
    create: canManage,
    update: canManage,
    delete: ownerOnly,
  },
  admin: {
    group: 'WhatsApp',
    useAsTitle: 'name',
    defaultColumns: ['name', 'template', 'audienceTag', 'status', 'updatedAt'],
    description: 'One approved message sent to many opted-in people at once. Meta charges about ₹1 per person. Only a Manager or the Owner can send.',
    hidden: adminHidden('whatsapp-campaigns'),
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'name', type: 'text', required: true, admin: { description: 'For you, e.g. "Diwali Night Fest – early bird".' } },
    {
      type: 'row',
      fields: [
        {
          name: 'template',
          type: 'text',
          required: true,
          label: 'Template name',
          admin: { width: '60%', description: 'Exactly as approved in WhatsApp Manager, e.g. event_promo_v1.' },
        },
        {
          name: 'language',
          type: 'text',
          required: true,
          defaultValue: 'en',
          label: 'Language code',
          admin: { width: '40%', description: 'The template language: en, en_US, ta, hi …' },
        },
      ],
    },
    {
      name: 'headerImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Only if the template has an image header.' },
    },
    {
      name: 'params',
      type: 'array',
      label: 'Template values',
      labels: { singular: 'Value', plural: 'Values' },
      admin: {
        description:
          'One row per {{1}}, {{2}} … in the template, in order. Write {name} to put in each person\'s name (or "there" if we don\'t know it).',
      },
      fields: [{ name: 'value', type: 'text', required: true }],
    },
    {
      name: 'audienceTag',
      type: 'text',
      label: 'Only contacts tagged',
      admin: { description: 'Leave blank to send to every opted-in contact.' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Sending', value: 'sending' },
        { label: 'Sent', value: 'done' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'sendPanel',
      type: 'ui',
      admin: { components: { Field: '/components/admin/whatsapp/CampaignSender#CampaignSender' } },
    },
  ],
  endpoints: [
    { path: '/:id/summary', method: 'get', handler: summary },
    { path: '/:id/send-batch', method: 'post', handler: sendBatch },
  ],
}

const json = (body: unknown, status = 200) => Response.json(body, { status })
const isStaff = (req: PayloadRequest, min: Role = 'viewer') => hasRole(req.user, min)

type Campaign = {
  id: number
  template: string
  language: string
  audienceTag?: string | null
  headerImage?: unknown
  params?: { value: string }[] | null
  status?: string | null
}

function audienceWhere(c: Campaign): Where {
  const where: Where[] = [{ optIn: { equals: 'yes' } }]
  if (c.audienceTag?.trim()) where.push({ tags: { contains: c.audienceTag.trim() } })
  return { and: where }
}

/** People this campaign hasn't been sent to yet, oldest contacts first. */
async function pending(req: PayloadRequest, c: Campaign) {
  const [audience, done] = await Promise.all([
    req.payload.find({
      collection: 'whatsapp-contacts',
      where: audienceWhere(c),
      sort: 'createdAt',
      pagination: false,
      depth: 0,
      select: { name: true, phone: true },
      req,
    }),
    req.payload.find({
      collection: 'whatsapp-messages',
      where: { campaign: { equals: c.id } },
      pagination: false,
      depth: 0,
      select: { phone: true },
      req,
    }),
  ])
  const sent = new Set(done.docs.map((m) => m.phone))
  return { total: audience.docs.length, left: audience.docs.filter((p) => !sent.has(p.phone)) }
}

async function load(req: PayloadRequest) {
  try {
    return (await req.payload.findByID({
      collection: 'whatsapp-campaigns',
      id: req.routeParams?.id as string,
      depth: 1,
      req,
    })) as unknown as Campaign
  } catch {
    return null
  }
}

/** GET /:id/summary → audience size, how many are left, and delivery counts. */
async function summary(req: PayloadRequest) {
  if (!isStaff(req)) return json({ error: 'Not allowed.' }, 403)
  const c = await load(req)
  if (!c) return json({ error: 'Campaign not found.' }, 404)

  const { total, left } = await pending(req, c)
  const count = async (status: string) =>
    (
      await req.payload.count({
        collection: 'whatsapp-messages',
        where: { and: [{ campaign: { equals: c.id } }, { status: { equals: status } }] },
        req,
      })
    ).totalDocs
  const [sent, delivered, read, failed] = await Promise.all(['sent', 'delivered', 'read', 'failed'].map(count))
  return json({ audience: total, left: left.length, sent, delivered, read, failed, configured: cloudConfigured() })
}

function headerImageUrl(c: Campaign) {
  const img = c.headerImage as { url?: string | null } | null | undefined
  if (!img?.url) return null
  if (/^https?:\/\//.test(img.url)) return img.url
  return `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}${img.url}`
}

// Meta error codes that mean the campaign itself is wrong (template, values, token,
// account, payment, rate limits), as opposed to one person's number.
const CAMPAIGN_ERRORS = new Set([
  0, 3, 10, 100, 190, 200, 368, 4, 80007, 130429, 130472, 131000, 131008, 131009, 131031, 131042, 131048,
  132000, 132001, 132005, 132007, 132012, 132015, 132016, 132068, 132069,
])

function stopsWholeCampaign(error: string) {
  const code = Number(error.split(':')[0])
  return Number.isNaN(code) || CAMPAIGN_ERRORS.has(code)
}

/** POST /:id/send-batch { max? } → sends to the next people; { sent, failed, left, errors }. */
async function sendBatch(req: PayloadRequest) {
  if (!isStaff(req, 'manager')) return json({ error: 'Only a Manager or the Owner can send a campaign.' }, 403)
  if (!cloudConfigured()) return json({ error: 'WhatsApp sending is not set up on this server yet.' }, 400)
  const c = await load(req)
  if (!c) return json({ error: 'Campaign not found.' }, 404)

  let max = BATCH_SIZE
  try {
    const body = (await req.json?.()) as { max?: number } | undefined
    if (body?.max && body.max > 0) max = Math.min(BATCH_SIZE, Math.floor(body.max))
  } catch {
    // No body: send a full batch.
  }

  const { left } = await pending(req, c)
  const batch = left.slice(0, max)
  if (batch.length && c.status !== 'sending') {
    await req.payload.update({ collection: 'whatsapp-campaigns', id: c.id, data: { status: 'sending' }, req })
  }

  const header = headerImageUrl(c)
  let sent = 0
  const errors: string[] = []
  for (const person of batch) {
    const bodyParams = (c.params ?? []).map((p) => p.value.replace(/\{name\}/gi, person.name?.trim() || 'there'))
    const result = await sendTemplate(person.phone, { name: c.template, language: c.language, headerImage: header, bodyParams })
    if (!result.ok && stopsWholeCampaign(result.error)) {
      // Wrong template / token / payment etc.: nobody would get it, so don't mark anyone as tried.
      return json({ error: `Stopped: ${result.error}`, sent, failed: 0, left: left.length - sent }, 502)
    }
    await req.payload.create({
      collection: 'whatsapp-messages',
      data: {
        direction: 'out',
        phone: person.phone,
        contact: person.id,
        type: 'template',
        text: `[template] ${c.template}${bodyParams.length ? ` — ${bodyParams.join(' | ')}` : ''}`,
        waMessageId: result.ok ? result.id : undefined,
        status: result.ok ? 'sent' : 'failed',
        error: result.ok ? undefined : result.error,
        campaign: c.id,
        sentBy: req.user?.id,
        at: new Date().toISOString(),
      },
      req,
    })
    if (result.ok) sent++
    else errors.push(`${person.phone}: ${result.error}`)
  }

  const remaining = left.length - batch.length
  if (remaining === 0) {
    await req.payload.update({ collection: 'whatsapp-campaigns', id: c.id, data: { status: 'done' }, req })
  }
  return json({ sent, failed: batch.length - sent, left: remaining, errors: errors.slice(0, 5) })
}
