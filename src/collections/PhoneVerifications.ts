import { createHmac, timingSafeEqual } from 'crypto'
import type { CollectionConfig, PayloadRequest } from 'payload'

import { authenticated } from '../access'
import { SITE_FALLBACK } from '../lib/site'
import {
  VERIFY_PREFIX,
  VERIFY_TTL_MS,
  newCode,
  newToken,
  normalizePhone,
  verifyMode,
  waLink,
} from '../lib/phoneVerification'

/**
 * WhatsApp "reverse" phone verification. A form calls `/start`, the visitor
 * sends the prefilled "ZENFEST VERIFY <code>" to our WhatsApp number, and Meta's
 * webhook (`/webhook`) marks the record verified — but only when WhatsApp reports
 * the same sender number the visitor typed. The form polls `/status`, then passes
 * `{ id, token }` with its submission, which consumes the record (see
 * VendorApplications). Nothing here is publicly readable.
 */
export const PhoneVerifications: CollectionConfig = {
  slug: 'phone-verifications',
  labels: { singular: 'Phone Verification', plural: 'Phone Verifications' },
  access: {
    create: () => false,
    read: authenticated,
    update: () => false,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'phone',
    defaultColumns: ['phone', 'status', 'purpose', 'createdAt'],
    description: 'WhatsApp phone checks from the website forms. Created automatically.',
    group: 'System',
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'phone', type: 'text', required: true, index: true },
    { name: 'code', type: 'text', required: true, index: true },
    { name: 'token', type: 'text', required: true, hidden: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Waiting for WhatsApp', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Used by a submission', value: 'used' },
      ],
    },
    { name: 'purpose', type: 'text', defaultValue: 'vendor' },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'verifiedAt', type: 'date' },
  ],
  endpoints: [
    { path: '/start', method: 'post', handler: start },
    { path: '/status', method: 'get', handler: status },
    { path: '/simulate', method: 'post', handler: simulate },
    { path: '/webhook', method: 'get', handler: webhookSubscribe },
    { path: '/webhook', method: 'post', handler: webhookReceive },
  ],
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

async function readJson(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    return ((await req.json?.()) as Record<string, unknown>) ?? {}
  } catch {
    return {}
  }
}

/** POST /start { phone, purpose? } → { id, token, code, waLink, mode } */
async function start(req: PayloadRequest) {
  const mode = verifyMode()
  if (mode === 'off') return json({ error: 'Phone verification is not enabled.' }, 404)

  const body = await readJson(req)
  const phone = normalizePhone(body.phone)
  if (!phone) return json({ error: 'Enter a valid 10-digit mobile number.' }, 400)

  // At most 5 codes per number per hour, so the endpoint can't be hammered.
  const recent = await req.payload.count({
    collection: 'phone-verifications',
    where: {
      phone: { equals: phone },
      createdAt: { greater_than: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    },
    overrideAccess: true,
  })
  if (recent.totalDocs >= 5) {
    return json({ error: 'Too many attempts for this number. Try again in an hour.' }, 429)
  }

  const code = newCode()
  const token = newToken()
  const doc = await req.payload.create({
    collection: 'phone-verifications',
    data: {
      phone,
      code,
      token,
      status: 'pending',
      purpose: typeof body.purpose === 'string' ? body.purpose.slice(0, 32) : 'vendor',
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
    },
    overrideAccess: true,
  })

  return json({ id: doc.id, token, code, waLink: waLink(code), mode })
}

/** Look up a record by id, only if the caller holds its token. */
async function findOwned(req: PayloadRequest, id: unknown, token: unknown) {
  if (!id || typeof token !== 'string') return null
  try {
    const doc = await req.payload.findByID({
      collection: 'phone-verifications',
      id: id as string,
      overrideAccess: true,
      showHiddenFields: true,
    })
    return doc.token === token ? doc : null
  } catch {
    return null
  }
}

/** GET /status?id&token → { status } ("expired" once past its time). */
async function status(req: PayloadRequest) {
  const doc = await findOwned(req, req.searchParams.get('id'), req.searchParams.get('token'))
  if (!doc) return json({ error: 'Not found.' }, 404)
  const expired = doc.status === 'pending' && new Date(doc.expiresAt) < new Date()
  return json({ status: expired ? 'expired' : doc.status })
}

/** POST /simulate { id, token } — test mode only: pretend the WhatsApp message arrived. */
async function simulate(req: PayloadRequest) {
  if (verifyMode() !== 'test') return json({ error: 'Not available.' }, 404)
  const body = await readJson(req)
  const doc = await findOwned(req, body.id, body.token)
  if (!doc) return json({ error: 'Not found.' }, 404)
  await markVerified(req, doc.phone, doc.code)
  return json({ ok: true })
}

/** GET /webhook — Meta's one-time subscription handshake. */
async function webhookSubscribe(req: PayloadRequest) {
  const q = req.searchParams
  const expected = process.env.WHATSAPP_VERIFY_TOKEN
  if (expected && q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === expected) {
    return new Response(q.get('hub.challenge') ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

type WaMessage = { from?: string; type?: string; text?: { body?: string } }

/** POST /webhook — incoming WhatsApp messages from Meta. */
async function webhookReceive(req: PayloadRequest) {
  const raw = (await req.text?.()) ?? ''
  const secret = process.env.WHATSAPP_APP_SECRET
  // Meta signs every delivery with the App secret; anything unsigned is ignored.
  if (!secret || !validSignature(raw, req.headers.get('x-hub-signature-256'), secret)) {
    req.payload.logger.warn('[phone-verifications] Rejected webhook with a bad signature.')
    return new Response('Invalid signature', { status: 401 })
  }

  let body: { entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[] } = {}
  try {
    body = JSON.parse(raw)
  } catch {
    return new Response('OK', { status: 200 })
  }

  const pattern = new RegExp(`${VERIFY_PREFIX}\\s*(\\d{6})`, 'i')
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        const match = msg.type === 'text' ? msg.text?.body?.match(pattern) : null
        const phone = normalizePhone(msg.from)
        if (!match || !phone) continue
        const ok = await markVerified(req, phone, match[1])
        if (ok && msg.from) await replyVerified(req, msg.from)
      }
    }
  }
  // Always 200 so Meta doesn't keep retrying a message we've handled or skipped.
  return new Response('OK', { status: 200 })
}

function validSignature(raw: string, header: string | null, secret: string) {
  if (!header?.startsWith('sha256=')) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'))
  const given = Buffer.from(header.slice('sha256='.length))
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/**
 * Marks the pending, unexpired record for this phone + code verified. The phone
 * must be the WhatsApp sender, which is what makes this proof of ownership.
 */
async function markVerified(req: PayloadRequest, phone: string, code: string) {
  const { docs } = await req.payload.find({
    collection: 'phone-verifications',
    where: {
      phone: { equals: phone },
      code: { equals: code },
      status: { equals: 'pending' },
      expiresAt: { greater_than: new Date().toISOString() },
    },
    limit: 1,
    overrideAccess: true,
  })
  if (!docs[0]) return false
  await req.payload.update({
    collection: 'phone-verifications',
    id: docs[0].id,
    data: { status: 'verified', verifiedAt: new Date().toISOString() },
    overrideAccess: true,
  })
  return true
}

/** The main WhatsApp line from Site Settings (falls back like the rest of the site), as "+91 90800 89530". */
async function mainWhatsApp(req: PayloadRequest) {
  let number = SITE_FALLBACK.contact.whatsapp
  try {
    const settings = await req.payload.findGlobal({ slug: 'site-settings', depth: 0, req })
    number = settings.contact?.whatsapp || number
  } catch {
    // Keep the fallback.
  }
  const d = String(number).replace(/\D/g, '').slice(-10)
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`
}

/** Free reply inside the chat the visitor just opened (optional: needs a token). */
async function replyVerified(req: PayloadRequest, to: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) return
  try {
    // v26.0 (Jul 2026); Meta retires each version ~2 years after release.
    const version = process.env.WHATSAPP_GRAPH_VERSION || 'v26.0'
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        // This number only verifies; conversations happen on the main line.
        text: {
          body:
            'Thanks! Your number is verified ✓ You can go back to the form.\n\n' +
            `This number is only for verification. To talk to us, WhatsApp Zenfest Events on ${await mainWhatsApp(req)}.`,
        },
      }),
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  } catch (err) {
    req.payload.logger.warn(
      `[phone-verifications] Verified, but the WhatsApp reply failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}
