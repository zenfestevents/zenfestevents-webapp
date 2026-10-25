// npm run test:whatsapp — checks the WhatsApp features against the LOCAL SQLite
// database with a fake Meta API (nothing is sent, nothing is charged):
//   1. WhatsApp-number accounts: sign-up, login, change of number, the rules around them
//   2. Inbox: incoming messages, duplicates, STOP/START, Lead link, delivery ticks
//   3. Contacts import, campaigns (batches, once per person, stop on a broken template), staff replies
// Test rows use numbers 6000000001–6000000099 and are removed before each run.
// Refuses to run against Postgres, so it can never touch production.
import 'dotenv/config'

import assert from 'node:assert/strict'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import config from '../payload.config'
import { isPlaceholderEmail } from '../lib/accountOptions'
import { newCode, newToken } from '../lib/phoneVerification'
import { changeAccountPhone, createWhatsAppAccount, whatsAppLoginAccount } from '../lib/whatsappAuth'
import { recordWebhook } from '../lib/whatsapp/inbox'
import { optCommand } from '../lib/whatsapp/events'
import { toWaNumber } from '../lib/whatsapp/phone'

if ((process.env.DATABASE_URI || '').startsWith('postgres')) {
  console.error('test:whatsapp only runs on the local SQLite database. Unset DATABASE_URI.')
  process.exit(1)
}

process.env.WHATSAPP_ACCESS_TOKEN = 'test-token'
process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id'

const payload = await getPayload({ config })
let failures = 0
/** Unique per run, so rows left in the local database by older runs can't collide. */
const run = Date.now().toString(36)
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failures++
    console.log(`  ✗ ${name}\n      ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ---------- fake Meta Graph API ----------
const sent: { to: string; body: Record<string, any> }[] = []
let msgId = 0
const realFetch = globalThis.fetch
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (!String(url).startsWith('https://graph.facebook.com/')) return realFetch(url, init)
  const body = JSON.parse(String(init?.body))
  if (body.template?.name === 'broken_template') {
    return Response.json({ error: { code: 132001, message: 'Template name does not exist' } }, { status: 404 })
  }
  if (String(body.to).endsWith('99')) {
    return Response.json({ error: { code: 131026, message: 'Message undeliverable' } }, { status: 400 })
  }
  sent.push({ to: body.to, body })
  return Response.json({ messages: [{ id: `wamid.TEST-${run}-${++msgId}` }] })
}) as typeof fetch

// ---------- helpers ----------
const local = (n: number) => `60000000${String(n).padStart(2, '0')}` // 10-digit test number
const wa = (n: number) => `91${local(n)}`

/** What the WhatsApp webhook does when the person sends "ZENFEST VERIFY <code>": a verified proof. */
async function proofFor(phone: string, purpose = 'test') {
  const token = newToken()
  const doc = await payload.create({
    collection: 'phone-verifications',
    data: { phone, code: newCode(), token, status: 'verified', purpose, expiresAt: new Date(Date.now() + 600000).toISOString() },
    overrideAccess: true,
  })
  return { id: doc.id, token }
}

async function rejects(fn: () => Promise<unknown>, message: RegExp) {
  await assert.rejects(fn, (err: Error) => message.test(err.message))
}

async function cleanUp(p: Payload) {
  const like = { like: '60000000' }
  await p.delete({ collection: 'whatsapp-messages', where: { phone: like }, overrideAccess: true })
  await p.delete({ collection: 'whatsapp-contacts', where: { phone: like }, overrideAccess: true })
  await p.delete({ collection: 'whatsapp-campaigns', where: { name: { like: '[test]' } }, overrideAccess: true })
  await p.delete({ collection: 'phone-verifications', where: { phone: like }, overrideAccess: true })
  await p.delete({ collection: 'customers', where: { phone: like }, overrideAccess: true })
  await p.delete({ collection: 'vendors', where: { phone: like }, overrideAccess: true })
  await p.delete({ collection: 'leads', where: { phone: like }, overrideAccess: true })
}
await cleanUp(payload)

// =====================================================================
console.log('\n1. WhatsApp-number accounts')

let coupleId: number | string = 0
await check('couple signs up with name + verified WhatsApp number (no email, no password)', async () => {
  const { id } = await createWhatsAppAccount(payload, 'customer', {
    name: 'Test Couple',
    phone: local(1),
    phoneProof: await proofFor(local(1)),
  })
  coupleId = id
  const c = await payload.findByID({ collection: 'customers', id, overrideAccess: true })
  assert.equal(c.phone, local(1))
  assert.equal(c.phoneVerified, true)
  assert.ok(isPlaceholderEmail(c.email), 'gets the placeholder email')
})

await check('sign-up without a WhatsApp proof is refused', async () => {
  await rejects(async () => createWhatsAppAccount(payload, 'customer', { name: 'No Proof', phone: local(2) }), /Verify your number/)
})

await check("a proof for a different number doesn't work", async () => {
  const proof = await proofFor(local(4))
  await rejects(async () => createWhatsAppAccount(payload, 'customer', { name: 'Wrong', phone: local(3), phoneProof: proof }), /Verify your number/)
})

await check('the same number cannot sign up twice', async () => {
  const proof = await proofFor(local(1))
  await rejects(async () => createWhatsAppAccount(payload, 'customer', { name: 'Again', phone: local(1), phoneProof: proof }), /already an account/)
})

await check('vendor signs up with business details', async () => {
  const { id } = await createWhatsAppAccount(payload, 'vendor', {
    name: 'Test Vendor',
    phone: local(5),
    businessName: '[test] Studio',
    category: 'photography',
    phoneProof: await proofFor(local(5)),
  })
  const v = await payload.findByID({ collection: 'vendors', id, overrideAccess: true })
  assert.equal(v.phoneVerified, true)
  assert.equal(v.listingStatus, 'draft')
})

await check('login with a verified WhatsApp number opens the right account', async () => {
  const id = await whatsAppLoginAccount(payload, 'customer', local(1), await proofFor(local(1)))
  assert.equal(id, coupleId)
})

await check('a login proof works only once', async () => {
  const proof = await proofFor(local(1))
  await whatsAppLoginAccount(payload, 'customer', local(1), proof)
  await rejects(async () => whatsAppLoginAccount(payload, 'customer', local(1), proof), /Verify your number/)
})

await check('login without a proof is refused', async () => {
  await rejects(async () => whatsAppLoginAccount(payload, 'customer', local(1), null), /Verify your number/)
})

await check('an unknown number is told to sign up', async () => {
  await rejects(async () => whatsAppLoginAccount(payload, 'customer', local(6), await proofFor(local(6))), /Sign up first/)
})

await check("a couple's number doesn't open a vendor account", async () => {
  await rejects(async () => whatsAppLoginAccount(payload, 'vendor', local(1), await proofFor(local(1))), /Sign up first/)
})

await check('an account whose number was never verified cannot be opened by that number', async () => {
  await payload.create({
    collection: 'customers',
    data: { name: 'Unverified', phone: local(7), phoneVerified: false, email: 'unverified@example.test', password: 'x'.repeat(12), _verified: true } as never,
    disableVerificationEmail: true,
    overrideAccess: true,
  })
  await rejects(async () => whatsAppLoginAccount(payload, 'customer', local(7), await proofFor(local(7))), /Sign up first/)
})

await check('changing number needs the new number verified, then login uses it', async () => {
  await rejects(async () => changeAccountPhone(payload, 'customer', coupleId, local(8), null), /Verify your number/)
  await changeAccountPhone(payload, 'customer', coupleId, local(8), await proofFor(local(8)))
  assert.equal(await whatsAppLoginAccount(payload, 'customer', local(8), await proofFor(local(8))), coupleId)
  await rejects(async () => whatsAppLoginAccount(payload, 'customer', local(1), await proofFor(local(1))), /Sign up first/)
})

await check("can't move to a number another account already uses", async () => {
  const { id } = await createWhatsAppAccount(payload, 'customer', { name: 'Other', phone: local(9), phoneProof: await proofFor(local(9)) })
  await rejects(async () => changeAccountPhone(payload, 'customer', id, local(8), await proofFor(local(8))), /Another account/)
})

// =====================================================================
console.log('\n2. Inbox (what the webhook saves)')

const ts = String(Math.floor(Date.now() / 1000))
const inbound = (from: string, id: string, text: string, type = 'text') => ({
  entry: [{ changes: [{ field: 'messages', value: {
    contacts: [{ wa_id: from, profile: { name: 'Priya' } }],
    messages: [type === 'button'
      ? { id, from, timestamp: ts, type, button: { text } }
      : { id, from, timestamp: ts, type, text: { body: text } }],
  } }] }],
})
const contactOf = async (phone: string) =>
  (await payload.find({ collection: 'whatsapp-contacts', where: { phone: { equals: phone } }, overrideAccess: true })).docs[0]

await check('phone numbers are normalised to 91XXXXXXXXXX', async () => {
  assert.equal(toWaNumber('+91 98400-12345'), '919840012345')
  assert.equal(toWaNumber('09840012345'), '919840012345')
  assert.equal(toWaNumber('12345'), null)
})

await check('STOP / START words are recognised (and ordinary text is not)', async () => {
  assert.equal(optCommand('Stop promotions'), 'stop')
  assert.equal(optCommand('STOP.'), 'stop')
  assert.equal(optCommand('start'), 'start')
  assert.equal(optCommand('stop by tomorrow?'), null)
})

await check('first message creates the contact (not opted in) and links the Lead', async () => {
  const lead = await payload.create({ collection: 'leads', data: { name: 'Lead Person', phone: local(20) }, overrideAccess: true })
  await recordWebhook(payload, inbound(wa(20), `wamid.IN1-${run}`, 'Price for 200 guests?'))
  const c = await contactOf(wa(20))
  assert.equal(c.name, 'Priya')
  assert.equal(c.optIn, 'unknown')
  assert.ok(c.lastInboundAt)
  assert.equal(typeof c.lead === 'object' ? c.lead?.id : c.lead, lead.id)
})

await check('the same webhook delivered twice is saved once', async () => {
  await recordWebhook(payload, inbound(wa(20), `wamid.IN1-${run}`, 'Price for 200 guests?'))
  const n = await payload.count({ collection: 'whatsapp-messages', where: { waMessageId: { equals: `wamid.IN1-${run}` } }, overrideAccess: true })
  assert.equal(n.totalDocs, 1)
})

await check('"Stop promotions" opts out and sends a confirmation', async () => {
  const before = sent.length
  await recordWebhook(payload, inbound(wa(20), `wamid.IN2-${run}`, 'Stop promotions', 'button'))
  assert.equal((await contactOf(wa(20))).optIn, 'no')
  assert.equal(sent.length, before + 1)
  assert.match(sent.at(-1)!.body.text.body, /won't get promotional/)
})

await check('START opts back in', async () => {
  await recordWebhook(payload, inbound(wa(20), `wamid.IN3-${run}`, 'START'))
  assert.equal((await contactOf(wa(20))).optIn, 'yes')
})

await check('delivery ticks only move forward (read is not undone by a late "delivered")', async () => {
  const c = await contactOf(wa(20))
  const out = await payload.create({
    collection: 'whatsapp-messages',
    data: { direction: 'out', phone: wa(20), contact: c.id, text: 'hi', waMessageId: `wamid.OUT1-${run}`, status: 'sent', at: new Date().toISOString() },
    overrideAccess: true,
  })
  const status = (s: string) => ({ entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id: `wamid.OUT1-${run}`, recipient_id: wa(20), status: s, timestamp: ts }] } }] }] })
  await recordWebhook(payload, status('read'))
  await recordWebhook(payload, status('delivered'))
  assert.equal((await payload.findByID({ collection: 'whatsapp-messages', id: out.id, overrideAccess: true })).status, 'read')
})

// =====================================================================
console.log('\n3. Import, campaigns and staff replies')

const staffEmail = 'whatsapp-test@example.test'
// A Manager: importing contacts and sending campaigns are Manager jobs (access/roles.ts).
const found = (await payload.find({ collection: 'users', where: { email: { equals: staffEmail } }, overrideAccess: true })).docs[0]
const staff = found
  ? await payload.update({ collection: 'users', id: found.id, data: { role: 'manager', active: true }, overrideAccess: true })
  : await payload.create({
      collection: 'users',
      data: { email: staffEmail, password: crypto.randomUUID(), role: 'manager' } as never,
      overrideAccess: true,
    })
const endpoint = (slug: 'whatsapp-campaigns' | 'whatsapp-contacts', path: string) =>
  (payload.collections[slug].config.endpoints || []).find((e) => e.path === path)!.handler
async function call(slug: 'whatsapp-campaigns' | 'whatsapp-contacts', path: string, routeParams: Record<string, unknown>, body?: unknown) {
  const req = (await createLocalReq({ user: { ...staff, collection: 'users' } as never }, payload)) as PayloadRequest
  req.routeParams = routeParams
  req.json = async () => body ?? {}
  const res: Response = await endpoint(slug, path)(req)
  return { status: res.status, data: await res.json() }
}

await check('import pasted rows (header skipped, either column order, consent + tag)', async () => {
  const r = await call('whatsapp-contacts', '/import', {}, {
    text: `Name,Phone\nAnu, ${local(31)}\n+91 ${local(32)}\tBala\n${local(99)},Chitra\nhello world`,
    optedIn: true,
    source: 'Test sheet',
    tags: `test-${run}`,
  })
  assert.equal(r.status, 200)
  assert.equal(r.data.added, 3)
  assert.equal(r.data.skippedCount, 1)
  assert.equal((await contactOf(wa(32))).name, 'Bala')
  assert.equal((await contactOf(wa(32))).optIn, 'yes')
})

await check('a broken template stops the campaign without marking anyone as tried', async () => {
  const c = await payload.create({ collection: 'whatsapp-campaigns', data: { name: '[test] broken', template: 'broken_template', language: 'en' }, overrideAccess: true })
  const r = await call('whatsapp-campaigns', '/:id/send-batch', { id: c.id })
  assert.equal(r.status, 502)
  const tried = await payload.count({ collection: 'whatsapp-messages', where: { campaign: { equals: c.id } }, overrideAccess: true })
  assert.equal(tried.totalDocs, 0)
})

await check('a campaign reaches each opted-in, tagged contact once, with {name} filled in', async () => {
  const c = await payload.create({
    collection: 'whatsapp-campaigns',
    data: { name: '[test] promo', template: 'event_promo_v1', language: 'en', audienceTag: `test-${run}`, params: [{ value: '{name}' }, { value: 'Diwali Night' }] },
    overrideAccess: true,
  })
  assert.equal((await call('whatsapp-campaigns', '/:id/summary', { id: c.id })).data.audience, 3)
  const r1 = await call('whatsapp-campaigns', '/:id/send-batch', { id: c.id }, { max: 2 })
  assert.equal(r1.data.left, 1)
  await call('whatsapp-campaigns', '/:id/send-batch', { id: c.id })
  const again = await call('whatsapp-campaigns', '/:id/send-batch', { id: c.id })
  assert.equal(again.data.sent + again.data.failed, 0, 'nobody gets it twice')
  const toAnu = sent.find((s) => s.to === wa(31) && s.body.template)
  assert.deepEqual(toAnu!.body.template.components[0].parameters.map((p: { text: string }) => p.text), ['Anu', 'Diwali Night'])
  const sum = (await call('whatsapp-campaigns', '/:id/summary', { id: c.id })).data
  assert.equal(sum.sent, 2)
  assert.equal(sum.failed, 1, 'the undeliverable number is recorded as failed')
  assert.equal((await payload.findByID({ collection: 'whatsapp-campaigns', id: c.id, overrideAccess: true })).status, 'done')
})

await check('staff reply is refused outside 24 h and sent inside it', async () => {
  const anu = await contactOf(wa(31))
  assert.equal((await call('whatsapp-contacts', '/:id/reply', { id: anu.id }, { text: 'Hello' })).status, 400)
  await payload.update({ collection: 'whatsapp-contacts', id: anu.id, data: { lastInboundAt: new Date().toISOString() }, overrideAccess: true })
  assert.equal((await call('whatsapp-contacts', '/:id/reply', { id: anu.id }, { text: 'Hello Anu' })).status, 200)
  assert.equal(sent.at(-1)!.body.text.body, 'Hello Anu')
})

await cleanUp(payload)
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll WhatsApp checks passed ✓')
process.exit(failures ? 1 : 0)
