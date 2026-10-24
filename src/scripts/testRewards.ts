// npm run test:rewards — checks the Runs club (lib/rewards.ts, hooks/runsClub.ts)
// against the LOCAL SQLite database:
//   1. awards: joined, profile, enquiry once, booking once however often a lead is booked
//   2. referrals: the referrer is paid, self-referrals (same account or phone) are refused
//   3. a client-sent `customer` / `referredBy` on a lead is ignored
//   4. vendors: listing live, first reply, marketplace booking; staff's manual rows
//   5. invites both ways: couples and vendors invite clients and vendors, welcome runs,
//      the small capped award, vendor approvals, the live tracker
// Test rows use numbers 6100000001–6100000099 and are removed before and after each run.
// Refuses to run against Postgres, so it can never touch production.
import 'dotenv/config'

import assert from 'node:assert/strict'
import { getPayload, type Payload } from 'payload'

import config from '../payload.config'
import { newCode, newToken } from '../lib/phoneVerification'
import {
  awardReferralSignup,
  awardRuns,
  getReferrals,
  getScorecard,
  recordReferralVisit,
  REF_COOKIE,
} from '../lib/rewards'
import { tierFor, DEFAULT_COUPLE_TIERS } from '../lib/rewardTiers'
import { createWhatsAppAccount } from '../lib/whatsappAuth'

if ((process.env.DATABASE_URI || '').startsWith('postgres')) {
  console.error('test:rewards only runs on the local SQLite database. Unset DATABASE_URI.')
  process.exit(1)
}

const payload = await getPayload({ config })
let failures = 0
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failures++
    console.log(`  ✗ ${name}\n      ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ---------- helpers ----------
const local = (n: number) => `61000000${String(n).padStart(2, '0')}` // 10-digit test number

async function proofFor(phone: string) {
  const token = newToken()
  const doc = await payload.create({
    collection: 'phone-verifications',
    data: { phone, code: newCode(), token, status: 'verified', purpose: 'test', expiresAt: new Date(Date.now() + 600000).toISOString() },
    overrideAccess: true,
  })
  return { id: doc.id, token }
}

async function makeCustomer(n: number, extra: Record<string, unknown> = {}) {
  return payload.create({
    collection: 'customers',
    data: { name: `Runs Test ${n}`, phone: local(n), email: `runs-test-${n}@example.test`, password: 'x'.repeat(16), _verified: true, ...extra } as never,
    disableVerificationEmail: true,
    overrideAccess: true,
  })
}

const account = (kind: 'customers' | 'vendors', id: number) =>
  payload.findByID({ collection: kind, id, depth: 0, overrideAccess: true }) as Promise<{ runs?: number | null; referralCode?: string | null; phone: string }>

const rows = async (key: string, reason?: string) =>
  (
    await payload.find({
      collection: 'runs',
      where: reason ? { and: [{ accountKey: { equals: key } }, { reason: { equals: reason } }] } : { accountKey: { equals: key } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
  ).docs

/** What POST /api/leads does: REST create (field access on), as `user`, with the browser's cookies. */
async function postLead(data: Record<string, unknown>, opts: { user?: { id: number; collection: 'customers' | 'vendors' } & object; cookie?: string } = {}) {
  const doc = await payload.create({
    collection: 'leads',
    data: { name: 'Runs Test Lead', phone: local(90), eventType: 'wedding', ...data } as never,
    overrideAccess: false,
    user: opts.user as never,
    req: { headers: new Headers(opts.cookie ? { cookie: opts.cookie } : {}) },
  })
  return payload.findByID({ collection: 'leads', id: doc.id, depth: 0, overrideAccess: true })
}
const asUser = async (kind: 'customers' | 'vendors', id: number) => ({ ...(await account(kind, id)), id, collection: kind })
const setLead = (id: number, status: string) =>
  payload.update({ collection: 'leads', id, data: { status } as never, overrideAccess: true })

async function cleanUp(p: Payload) {
  const like = { like: '61000000' }
  const keys: string[] = []
  for (const [kind, slug] of [['c', 'customers'], ['v', 'vendors']] as const) {
    const { docs } = await p.find({ collection: slug, where: { phone: like }, pagination: false, depth: 0, overrideAccess: true })
    keys.push(...docs.map((d) => `${kind}:${d.id}`))
  }
  if (keys.length) {
    await p.delete({ collection: 'runs', where: { accountKey: { in: keys } }, overrideAccess: true, context: { skipRuns: true } })
  }
  await p.delete({ collection: 'enquiries', where: { message: { like: '[runs-test]' } }, overrideAccess: true })
  await p.delete({ collection: 'leads', where: { phone: like }, overrideAccess: true })
  await p.delete({ collection: 'vendor-applications', where: { phone: like }, overrideAccess: true })
  await p.delete({ collection: 'referral-visits', where: { visitor: { like: 'runs-test-' } }, overrideAccess: true })
  await p.delete({ collection: 'phone-verifications', where: { phone: like }, overrideAccess: true })
  await p.delete({ collection: 'customers', where: { phone: like }, overrideAccess: true })
  await p.delete({ collection: 'vendors', where: { phone: like }, overrideAccess: true })
}
await cleanUp(payload)

// =====================================================================
console.log('\n1. Awards')

let anu = 0 // the couple who refers
await check('WhatsApp sign-up gives "joined" runs and a referral code', async () => {
  const { id } = await createWhatsAppAccount(payload, 'customer', { name: 'Anu Runs', phone: local(1), phoneProof: await proofFor(local(1)) })
  anu = Number(id)
  const a = await account('customers', anu)
  assert.match(String(a.referralCode), /^[A-Z2-9]{8}$/)
  assert.equal(a.runs, 50)
  assert.equal((await rows(`c:${anu}`, 'joined')).length, 1)
})

await check('profile runs once name, city and event date are filled — and only once', async () => {
  await payload.update({ collection: 'customers', id: anu, data: { city: 'Madurai' }, overrideAccess: true })
  assert.equal((await rows(`c:${anu}`, 'profile')).length, 0, 'not yet: no event date')
  await payload.update({ collection: 'customers', id: anu, data: { eventDate: '2027-02-14T06:30:00.000Z' }, overrideAccess: true })
  await payload.update({ collection: 'customers', id: anu, data: { city: 'Madurai city' }, overrideAccess: true })
  assert.equal((await rows(`c:${anu}`, 'profile')).length, 1)
  assert.equal((await account('customers', anu)).runs, 100)
})

let anuLead = 0
await check("a logged-in couple's enquiry is linked to them and earns runs once", async () => {
  const lead = await postLead({ phone: local(1) }, { user: await asUser('customers', anu) })
  anuLead = lead.id
  assert.equal(lead.customer, anu)
  await postLead({ phone: local(1) }, { user: await asUser('customers', anu) })
  assert.equal((await rows(`c:${anu}`, 'enquiry')).length, 1, 'one enquiry award per account')
  assert.equal((await account('customers', anu)).runs, 200)
})

await check('booking a lead twice still gives one booking row', async () => {
  await setLead(anuLead, 'booked')
  await setLead(anuLead, 'contacted')
  await setLead(anuLead, 'booked')
  const booked = await rows(`c:${anu}`, 'booking')
  assert.equal(booked.length, 1)
  assert.equal(booked[0].source, `lead:${anuLead}`)
  assert.equal((await account('customers', anu)).runs, 1200)
})

await check('awardRuns itself is idempotent (same reason + source)', async () => {
  const again = await awardRuns(payload, { kind: 'c', id: anu, reason: 'booking', source: `lead:${anuLead}` })
  assert.equal(again.awarded, false)
  assert.equal((await rows(`c:${anu}`, 'booking')).length, 1)
})

// =====================================================================
console.log('\n2. Referrals')

await check('a referral that books pays the referrer', async () => {
  const code = (await account('customers', anu)).referralCode
  const bala = await makeCustomer(2)
  const lead = await postLead({ phone: local(2) }, { user: await asUser('customers', bala.id), cookie: `other=1; ${REF_COOKIE}=${code}` })
  assert.equal(lead.referredBy, `c:${anu}`)
  assert.equal(lead.customer, bala.id)
  await setLead(lead.id, 'booked')
  await setLead(lead.id, 'booked')
  const paid = await rows(`c:${anu}`, 'referral')
  assert.equal(paid.length, 1)
  assert.equal(paid[0].source, `lead:${lead.id}`)
  assert.equal((await account('customers', anu)).runs, 1725, '1,200 own + 500 booked + 25 for the invite')
  assert.equal((await rows(`c:${bala.id}`, 'booking')).length, 1, 'and the booking couple gets booking runs')
})

await check('an anonymous enquiry from an invite link also counts', async () => {
  const code = (await account('customers', anu)).referralCode
  const lead = await postLead({ phone: local(3) }, { cookie: `${REF_COOKIE}=${code}` })
  assert.equal(lead.referredBy, `c:${anu}`)
  assert.equal(lead.customer ?? null, null)
})

await check('self-referral is refused: own account', async () => {
  const code = (await account('customers', anu)).referralCode
  const lead = await postLead({ phone: local(4) }, { user: await asUser('customers', anu), cookie: `${REF_COOKIE}=${code}` })
  assert.equal(lead.referredBy ?? null, null)
})

await check("self-referral is refused: the code owner's phone number, logged out", async () => {
  const code = (await account('customers', anu)).referralCode
  const lead = await postLead({ phone: `+91 ${local(1)}` }, { cookie: `${REF_COOKIE}=${code}` })
  assert.equal(lead.referredBy ?? null, null)
})

await check('an unknown code is ignored', async () => {
  const lead = await postLead({ phone: local(5) }, { cookie: `${REF_COOKIE}=ZZZZZZZZ` })
  assert.equal(lead.referredBy ?? null, null)
})

// =====================================================================
console.log('\n3. Client-sent fields')

await check('a client-sent customer is ignored (anonymous)', async () => {
  const lead = await postLead({ phone: local(6), customer: anu, referredBy: `c:${anu}` })
  assert.equal(lead.customer ?? null, null)
  assert.equal(lead.referredBy ?? null, null)
})

await check("a client-sent customer is replaced by the session's", async () => {
  const chitra = await makeCustomer(7)
  const lead = await postLead({ phone: local(7), customer: anu }, { user: await asUser('customers', chitra.id) })
  assert.equal(lead.customer, chitra.id)
})

await check('even a Local API create cannot set customer / referredBy', async () => {
  const doc = await payload.create({
    collection: 'leads',
    data: { name: 'Runs Test Lead', phone: local(8), customer: anu, referredBy: `c:${anu}` } as never,
    overrideAccess: true,
  })
  const lead = await payload.findByID({ collection: 'leads', id: doc.id, depth: 0, overrideAccess: true })
  assert.equal(lead.customer ?? null, null)
  assert.equal(lead.referredBy ?? null, null)
})

await check("staff see the couple's tier on the lead", async () => {
  const lead = await payload.findByID({ collection: 'leads', id: anuLead, depth: 0, overrideAccess: true })
  assert.equal(lead.customerTier, 'Captain · ₹2,500 off (1,750 runs)')
})

// =====================================================================
console.log('\n4. Vendors and staff')

let vendor = 0
await check('vendor: joined, profile, listing live, first reply, marketplace booking', async () => {
  const { id } = await createWhatsAppAccount(payload, 'vendor', {
    name: 'Runs Vendor',
    phone: local(20),
    businessName: '[runs-test] Studio',
    category: 'photography',
    phoneProof: await proofFor(local(20)),
  })
  vendor = Number(id)
  await payload.update({ collection: 'vendors', id: vendor, data: { areas: ['Madurai'] }, overrideAccess: true })
  await payload.update({ collection: 'vendors', id: vendor, data: { listingStatus: 'published' }, overrideAccess: true })
  await payload.update({ collection: 'vendors', id: vendor, data: { listingStatus: 'paused' }, overrideAccess: true })
  await payload.update({ collection: 'vendors', id: vendor, data: { listingStatus: 'published' }, overrideAccess: true })
  const enquiry = await payload.create({
    collection: 'enquiries',
    data: { customer: anu, vendor, message: '[runs-test] hi', status: 'new', thread: [{ from: 'customer', text: 'Hi', at: new Date().toISOString() }] },
    overrideAccess: true,
  })
  const reply = (text: string) => ({ from: 'vendor' as const, text, at: new Date().toISOString() })
  await payload.update({ collection: 'enquiries', id: enquiry.id, data: { thread: [...(enquiry.thread ?? []), reply('Hello')], status: 'replied' }, overrideAccess: true })
  await payload.update({ collection: 'enquiries', id: enquiry.id, data: { thread: [...(enquiry.thread ?? []), reply('Hello'), reply('Again')] }, overrideAccess: true })
  await payload.update({ collection: 'enquiries', id: enquiry.id, data: { status: 'booked' }, overrideAccess: true })
  const key = `v:${vendor}`
  for (const [reason, n] of [['joined', 1], ['profile', 1], ['listing_live', 1], ['vendor_reply', 1], ['vendor_booking', 1]] as const) {
    assert.equal((await rows(key, reason)).length, n, reason)
  }
  assert.equal((await account('vendors', vendor)).runs, 50 + 50 + 200 + 20 + 300)
})

await check('a manual row from staff gets a source and moves the total', async () => {
  const row = await payload.create({
    collection: 'runs',
    data: { account: { relationTo: 'vendors', value: vendor }, amount: -20, reason: 'manual', note: '[runs-test] correction' } as never,
    overrideAccess: true,
  })
  assert.equal(row.accountKey, `v:${vendor}`)
  assert.match(String(row.source), /^manual:/)
  assert.equal((await account('vendors', vendor)).runs, 600)
  await payload.delete({ collection: 'runs', id: row.id, overrideAccess: true })
  assert.equal((await account('vendors', vendor)).runs, 620)
})

await check('the scorecard has the total, tier, history and invite link', async () => {
  const card = await getScorecard('v', vendor, payload)
  assert.equal(card.total, 620)
  assert.equal(card.tier.name, 'First XI')
  assert.equal(card.next?.name, 'Match Winner')
  assert.equal(card.rows.length, 5)
  assert.equal(card.invitePath, `/invite/${card.referralCode}`)
})

await check('tierFor: progress and the top tier', async () => {
  const mid = tierFor(300, DEFAULT_COUPLE_TIERS)
  assert.equal(mid.tier.name, 'Opener')
  assert.equal(mid.progress, 0.5)
  assert.equal(mid.toNext, 200)
  const top = tierFor(99999, DEFAULT_COUPLE_TIERS)
  assert.equal(top.next, null)
  assert.equal(top.progress, 1)
})

// =====================================================================
console.log('\n5. Invites both ways')

const codeOf = async (kind: 'customers' | 'vendors', id: number) => String((await account(kind, id)).referralCode)
let deepa = 0 // a couple Anu invited
let ravi = 0 // a vendor Anu invited

await check('a couple joining through an invite gets welcome runs; the inviter gets the small award', async () => {
  const before = (await account('customers', anu)).runs ?? 0
  const { id } = await createWhatsAppAccount(
    payload,
    'customer',
    { name: 'Deepa Kumar', phone: local(20), phoneProof: await proofFor(local(20)) },
    await codeOf('customers', anu),
  )
  deepa = id
  const doc = (await payload.findByID({ collection: 'customers', id, depth: 0, overrideAccess: true })) as {
    referredBy?: string
    runs?: number
  }
  assert.equal(doc.referredBy, `c:${anu}`)
  assert.equal(doc.runs, 150, '50 joined + 100 welcome')
  const small = await rows(`c:${anu}`, 'referral_signup')
  assert.ok(small.some((r) => r.source === `phone:${local(20)}`))
  assert.equal((await account('customers', anu)).runs, before + 25)
})

await check('the same friend enquiring later (no cookie) adds no second small award, but booking pays 500', async () => {
  const before = (await account('customers', anu)).runs ?? 0
  const lead = await postLead({ name: 'Deepa Kumar', phone: local(20) }, { user: await asUser('customers', deepa) })
  assert.equal(lead.referredBy, `c:${anu}`, 'credited from the account, though the cookie is gone')
  assert.equal((await account('customers', anu)).runs, before, 'still one small award for Deepa')
  await setLead(lead.id, 'contacted')
  await setLead(lead.id, 'quoted')
  await setLead(lead.id, 'booked')
  assert.equal((await account('customers', anu)).runs, before + 500)
})

await check('a couple invites a vendor: small award on sign-up, 300 when the listing goes live', async () => {
  const before = (await account('customers', anu)).runs ?? 0
  const { id } = await createWhatsAppAccount(
    payload,
    'vendor',
    {
      name: 'Ravi Shankar',
      businessName: 'Ravi Decor',
      category: 'decoration',
      phone: local(21),
      phoneProof: await proofFor(local(21)),
    } as never,
    await codeOf('customers', anu),
  )
  ravi = id
  const doc = (await payload.findByID({ collection: 'vendors', id, depth: 0, overrideAccess: true })) as { referredBy?: string }
  assert.equal(doc.referredBy, `c:${anu}`)
  assert.equal((await rows(`v:${id}`, 'welcome')).length, 1, 'vendors get welcome runs too')
  await payload.update({ collection: 'vendors', id, data: { listingStatus: 'pending' } as never, overrideAccess: true })
  await payload.update({ collection: 'vendors', id, data: { listingStatus: 'published' } as never, overrideAccess: true })
  assert.equal((await account('customers', anu)).runs, before + 25 + 300)
  assert.equal((await rows(`c:${anu}`, 'referral_vendor')).length, 1)
})

let applicationId = 0
await check('a vendor invites a partner applicant: small award on applying, 300 when staff approve', async () => {
  const before = (await account('vendors', ravi)).runs ?? 0
  const app = await payload.create({
    collection: 'vendor-applications',
    data: {
      name: 'Meena Iyer',
      businessName: 'Meena Florals',
      vendorType: 'decoration',
      phone: local(22),
      phoneVerification: await proofFor(local(22)),
      referredBy: 'c:999',
    } as never,
    overrideAccess: false,
    req: { headers: new Headers({ cookie: `${REF_COOKIE}=${await codeOf('vendors', ravi)}` }) },
  })
  applicationId = app.id
  const saved = (await payload.findByID({ collection: 'vendor-applications', id: app.id, depth: 0, overrideAccess: true })) as {
    referredBy?: string
  }
  assert.equal(saved.referredBy, `v:${ravi}`, 'from the cookie, not the body')
  assert.equal((await account('vendors', ravi)).runs, before + 25)
  for (const status of ['reviewing', 'approved', 'approved']) {
    await payload.update({ collection: 'vendor-applications', id: app.id, data: { status } as never, overrideAccess: true })
  }
  assert.equal((await account('vendors', ravi)).runs, before + 25 + 300, 'approved pays once')
})

await check('a vendor invites a couple who books: 500 to the vendor', async () => {
  const before = (await account('vendors', ravi)).runs ?? 0
  const lead = await postLead({ name: 'Karthik Raja', phone: local(23) }, { cookie: `${REF_COOKIE}=${await codeOf('vendors', ravi)}` })
  assert.equal(lead.referredBy, `v:${ravi}`)
  await setLead(lead.id, 'booked')
  assert.equal((await account('vendors', ravi)).runs, before + 25 + 500)
})

await check('an applicant using their own vendor code is refused', async () => {
  const ownPhone = (await account('vendors', ravi)).phone
  const app = await payload.create({
    collection: 'vendor-applications',
    data: { name: 'Ravi Shankar', businessName: 'Ravi Decor', vendorType: 'decoration', phone: ownPhone, phoneVerification: await proofFor(ownPhone) } as never,
    overrideAccess: false,
    req: { headers: new Headers({ cookie: `${REF_COOKIE}=${await codeOf('vendors', ravi)}` }) },
  })
  const saved = (await payload.findByID({ collection: 'vendor-applications', id: app.id, depth: 0, overrideAccess: true })) as {
    referredBy?: string | null
  }
  assert.equal(saved.referredBy ?? null, null)
})

await check('opening an invite link counts once per browser', async () => {
  await recordReferralVisit(payload, `c:${anu}`, 'runs-test-a', 'client')
  await recordReferralVisit(payload, `c:${anu}`, 'runs-test-a', 'client')
  await recordReferralVisit(payload, `c:${anu}`, 'runs-test-b', 'vendor')
  const r = await getReferrals('c', anu, payload)
  assert.deepEqual(r.opened, { client: 1, vendor: 1, total: 2 })
})

await check('the small award stops at the monthly limit (10)', async () => {
  const fresh = await makeCustomer(30)
  for (let n = 40; n <= 50; n++) await awardReferralSignup(payload, `c:${fresh.id}`, local(n))
  assert.equal((await rows(`c:${fresh.id}`, 'referral_signup')).length, 10)
})

await check('the live tracker: first name + initial, client and vendor stages, runs per person', async () => {
  const r = await getReferrals('c', anu, payload)
  const byName = Object.fromEntries(r.friends.map((f) => [f.name, f]))
  assert.equal(byName['Deepa K.']?.label, 'Booked')
  assert.equal(byName['Deepa K.']?.type, 'client')
  assert.equal(byName['Deepa K.']?.runs, 525)
  assert.equal(byName['Ravi S.']?.type, 'vendor')
  assert.equal(byName['Ravi S.']?.label, 'Live')
  assert.equal(byName['Ravi S.']?.step, byName['Ravi S.']?.steps)
  assert.equal(r.totals.vendorsApproved, 1)
  assert.ok(!JSON.stringify(r).includes(local(20)), 'no phone numbers in the tracker')
  const v = await getReferrals('v', ravi, payload)
  assert.equal(v.friends.find((f) => f.name === 'Meena I.')?.label, 'Approved')
  assert.equal(v.friends.find((f) => f.name === 'Karthik R.')?.label, 'Booked')
  assert.ok(applicationId > 0)
})

await cleanUp(payload)
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll Runs club checks passed ✓')
process.exit(failures ? 1 : 0)
