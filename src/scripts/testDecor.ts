// npm run test:decor — checks the Decoration catalog against the LOCAL SQLite database:
//   1. item codes (WED-STG-001, 002 …) and web addresses are given on create and never change
//   2. every price change writes a price-history row and stamps "Price updated on"
//   3. an Active item needs a photo, title and client price; a Quick-add draft doesn't
//   4. PRIVACY: visitors, couples and vendors get nothing from the decor lists (items,
//      suppliers, price history, views, photo records); staff see the vendor price;
//      a couple's own account never carries the saved-decorations or blocked fields
//   5. access to Decorations: Read only looks, Add & edit adds/edits, Full and the Owner delete
// Test records are named "Decor test …"; they are removed before and after each run.
// Refuses to run against Postgres, so it can never touch production.
import 'dotenv/config'

import assert from 'node:assert/strict'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

import config from '../payload.config'
import type { User } from '../payload-types'

if ((process.env.DATABASE_URI || '').startsWith('postgres')) {
  console.error('test:decor only runs on the local SQLite database. Unset DATABASE_URI.')
  process.exit(1)
}

/** Local test value only — these logins exist only in the local SQLite database. */
const TEST_PASSWORD = 'zenfest-decor-test'
/** `team` = Add & edit and `viewer` = Read only, both on Decorations only. */
const ROLES = ['owner', 'team', 'viewer'] as const
const DECOR_LEVEL = { owner: 'full', team: 'edit', viewer: 'read' } as const
const TITLE = 'Decor test'

const payload: Payload = await getPayload({ config })
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

/** Resolves to true if Payload allowed the call (access checks on). */
async function allowed(fn: () => Promise<unknown>) {
  try {
    await fn()
    return true
  } catch {
    return false
  }
}

async function cleanup() {
  const items = await payload.find({
    collection: 'decor-items',
    where: { or: [{ title: { like: TITLE } }, { notes: { equals: TITLE } }] },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const ids = items.docs.map((d) => d.id)
  if (ids.length) {
    await payload.delete({ collection: 'decor-views', where: { item: { in: ids } }, overrideAccess: true })
    await payload.delete({ collection: 'decor-price-history', where: { item: { in: ids } }, overrideAccess: true })
    await payload.delete({ collection: 'decor-items', where: { id: { in: ids } }, overrideAccess: true })
  }
  await payload.delete({ collection: 'decor-photos', where: { alt: { equals: TITLE } }, overrideAccess: true })
  await payload.delete({ collection: 'decor-suppliers', where: { name: { like: TITLE } }, overrideAccess: true })
  await payload.delete({ collection: 'customers', where: { email: { equals: 'decor-couple@test.invalid' } }, overrideAccess: true })
  await payload.delete({ collection: 'leads', where: { name: { like: TITLE } }, overrideAccess: true })
  // Straight to the database: `keepAnOwner` (Users.ts) rightly refuses to delete the last
  // Owner, and on a fresh local database the test Owner is the only one.
  await payload.db.deleteMany({ collection: 'users', where: { email: { like: '@test.invalid' }, name: { like: 'Decor ' } } })
}

await cleanup()

// ── Fixtures ───────────────────────────────────────────────────────────────
const staff = {} as Record<(typeof ROLES)[number], User & { collection: 'users' }>
for (const role of ROLES) {
  const doc = await payload.create({
    collection: 'users',
    data: {
      email: `decor-${role}@test.invalid`,
      password: TEST_PASSWORD,
      name: `Decor ${role}`,
      role: role === 'owner' ? 'owner' : 'team',
      moduleAccess: { decorations: DECOR_LEVEL[role] },
    },
    overrideAccess: true,
  })
  staff[role] = { ...doc, collection: 'users' }
}
const couple = await payload.create({
  collection: 'customers',
  data: {
    name: 'Decor test couple',
    phone: '6100000201',
    email: 'decor-couple@test.invalid',
    password: TEST_PASSWORD,
    _verified: true,
  } as never,
  disableVerificationEmail: true,
  overrideAccess: true,
})
const coupleUser = { ...couple, collection: 'customers' as const }
const vendorUser = { id: 999999, collection: 'vendors' as const } as never

const supplier = await payload.create({
  collection: 'decor-suppliers',
  data: { name: `${TITLE} supplier`, phone: '+91 61000 00299', area: 'Test area' },
  overrideAccess: true,
})
const photo = await payload.create({
  collection: 'decor-photos',
  data: { alt: TITLE },
  file: {
    data: await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#8a6414' } }).jpeg().toBuffer(),
    mimetype: 'image/jpeg',
    name: 'Kumar Decorators stage.jpg',
    size: 0,
  },
  overrideAccess: true,
})

/** Creates a test decoration as `user` (access checks on); `make()` = as the team member. */
const makeAs = (user: unknown, extra: Record<string, unknown> = {}) =>
  payload.create({
    collection: 'decor-items',
    data: {
      title: `${TITLE} stage`,
      eventType: 'wedding',
      category: 'stage',
      material: 'real_flowers',
      themes: ['floral'],
      photos: [photo.id],
      supplier: supplier.id,
      clientPrice: 50000,
      vendorPrice: 36000,
      notes: TITLE,
      ...extra,
    } as never,
    user: user as never,
    overrideAccess: false,
  })
const make = (extra: Record<string, unknown> = {}, user: unknown = staff.team) => makeAs(user, extra)

// ── 1. Codes ───────────────────────────────────────────────────────────────
console.log('Item codes')
const a = await make()
const b = await make()
await check('codes follow event type + category with a running number', async () => {
  assert.match(String(a.itemCode), /^WED-STG-\d{3,}$/)
  assert.equal(Number(String(b.itemCode).slice(8)), Number(String(a.itemCode).slice(8)) + 1)
})
await check('a different category starts its own count', async () => {
  const c = await make({ eventType: 'birthday_girl', category: 'balloon' })
  assert.match(String(c.itemCode), /^BDG-BLN-\d{3,}$/)
})
await check('new event types get their own codes (Reception, Opening ceremony)', async () => {
  const r = await make({ eventType: 'reception' })
  assert.match(String(r.itemCode), /^REC-STG-\d{3,}$/)
  const o = await make({ eventType: 'shop_opening', category: 'entrance' })
  assert.match(String(o.itemCode), /^OPN-ENT-\d{3,}$/)
})
await check('the website shows the exact client price unless the team picks otherwise', async () => {
  assert.equal(a.publicDisplay, 'exact')
})
await check('web address = title + code', async () => {
  assert.equal(a.slug, `decor-test-stage-${String(a.itemCode).toLowerCase()}`)
})
await check('code and web address do not change on edit, even if sent', async () => {
  const u = await payload.update({
    collection: 'decor-items',
    id: a.id,
    data: { itemCode: 'HACK-001', slug: 'hack', category: 'mandap' } as never,
    user: staff.team,
    overrideAccess: false,
  })
  assert.equal(u.itemCode, a.itemCode)
  assert.equal(u.slug, a.slug)
})

// ── 2. Price history ───────────────────────────────────────────────────────
console.log('Price history')
const history = (id: number) =>
  payload.find({ collection: 'decor-price-history', where: { item: { equals: id } }, sort: 'changedOn', depth: 0, overrideAccess: true })
await check('create writes a row for each price, by the team member', async () => {
  const h = await history(b.id)
  assert.equal(h.totalDocs, 2)
  assert.deepEqual(h.docs.map((d) => [d.field, d.oldPrice ?? null, d.newPrice]).sort(), [
    ['client', null, 50000],
    ['vendor', null, 36000],
  ])
  assert.equal(h.docs[0].changedBy, staff.team.id)
  assert.ok(b.priceUpdatedOn)
})
await check('editing other fields writes no row and keeps the date', async () => {
  const u = await payload.update({ collection: 'decor-items', id: b.id, data: { size: '20 ft' }, user: staff.team, overrideAccess: false })
  assert.equal((await history(b.id)).totalDocs, 2)
  assert.equal(u.priceUpdatedOn, b.priceUpdatedOn)
})
await check('a price change writes old → new and moves the date', async () => {
  await new Promise((r) => setTimeout(r, 20))
  const u = await payload.update({ collection: 'decor-items', id: b.id, data: { clientPrice: 55000 }, user: staff.team, overrideAccess: false })
  const h = await history(b.id)
  assert.equal(h.totalDocs, 3)
  const last = h.docs[h.docs.length - 1]
  assert.deepEqual([last.field, last.oldPrice, last.newPrice], ['client', 50000, 55000])
  assert.notEqual(u.priceUpdatedOn, b.priceUpdatedOn)
})
await check('"Price updated on" cannot be set by hand', async () => {
  const u = await payload.update({
    collection: 'decor-items',
    id: b.id,
    data: { priceUpdatedOn: '2001-01-01T00:00:00.000Z' } as never,
    user: staff.team,
    overrideAccess: false,
  })
  assert.notEqual(u.priceUpdatedOn, '2001-01-01T00:00:00.000Z')
})

// ── 3. Active vs draft ─────────────────────────────────────────────────────
console.log('Active needs the basics')
await check('Active without a photo is refused', async () => {
  assert.equal(await allowed(() => make({ photos: [] })), false)
})
await check('Active without a client price is refused', async () => {
  assert.equal(await allowed(() => make({ clientPrice: null })), false)
})
await check('a Quick-add draft needs only event type, category and a photo/price', async () => {
  const d = await make({ status: 'draft', title: null, themes: [], supplier: null })
  assert.match(String(d.itemCode), /^WED-STG-/)
})

console.log('Others needs its box')
await check('Event type "Others" without the event typed is refused', async () => {
  assert.equal(await allowed(() => make({ eventType: 'other' })), false)
})
await check('Event type "Others" with the event typed is saved', async () => {
  const o = await make({ eventType: 'other', eventTypeOther: 'Corporate annual day' })
  assert.equal(o.eventTypeOther, 'Corporate annual day')
  assert.match(String(o.itemCode), /^OTH-STG-/)
})
await check('Category "Other" without the category typed is refused', async () => {
  assert.equal(await allowed(() => make({ category: 'other' })), false)
})
await check('a typed "Others" box is cleared when the event type changes', async () => {
  const o = await make({ eventType: 'other', eventTypeOther: 'Temple festival' })
  const u = await payload.update({
    collection: 'decor-items',
    id: o.id,
    data: { eventType: 'haldi' },
    user: staff.team,
    overrideAccess: false,
  })
  assert.equal(u.eventTypeOther ?? null, null)
})
await check('the old catch-all "Birthday" and the first-birthday / surprise types are not offered for new decorations', async () => {
  for (const eventType of ['birthday', 'first_birthday_boy', 'first_birthday_girl', 'birthday_surprise']) {
    assert.equal(await allowed(() => make({ eventType })), false, eventType)
  }
})
await check('a decoration that already has a hidden birthday type can still be edited', async () => {
  for (const hidden of ['birthday', 'first_birthday_girl']) {
    const old = await make({ eventType: 'birthday_boy' })
    // As if saved before the birthdays were cut to boy / girl (straight to the database, no validation).
    await payload.db.updateOne({ collection: 'decor-items', id: old.id, data: { eventType: hidden } })
    const u = await payload.update({ collection: 'decor-items', id: old.id, data: { size: '10 ft' }, user: staff.team, overrideAccess: false })
    assert.deepEqual([u.eventType, u.size], [hidden, '10 ft'])
  }
})

console.log('Shared events and material (2026-11-02)')
await check('Naming ceremony and Welcome board get their own codes', async () => {
  const n = await make({ eventType: 'naming_ceremony' })
  assert.match(String(n.itemCode), /^NMC-STG-\d{3,}$/)
  const w = await make({ category: 'welcome_board' })
  assert.match(String(w.itemCode), /^WED-WLB-\d{3,}$/)
})
await check('Flowers / material is mandatory on every save, even a draft', async () => {
  assert.equal(await allowed(() => make({ material: null })), false)
  assert.equal(await allowed(() => make({ material: 'plastic' })), false)
  assert.equal(await allowed(() => make({ material: null, status: 'draft' })), false)
  for (const material of ['real_flowers', 'artificial_flowers', 'mixed_flowers', 'balloons']) {
    assert.equal(await allowed(() => make({ material })), true, material)
  }
})
await check('"Also suits" keeps the main event for the code and takes other real events only', async () => {
  const r = await make({ eventType: 'reception', alsoSuits: ['engagement', 'anniversary'] })
  assert.match(String(r.itemCode), /^REC-STG-\d{3,}$/)
  assert.deepEqual([...(r.alsoSuits ?? [])].sort(), ['anniversary', 'engagement'])
  assert.equal(await allowed(() => make({ eventType: 'reception', alsoSuits: ['reception'] })), false, 'the main event again')
  assert.equal(await allowed(() => make({ alsoSuits: ['other'] })), false, 'Others')
  assert.equal(await allowed(() => make({ alsoSuits: ['first_birthday_boy'] })), false, 'a hidden birthday')
  assert.equal(await allowed(() => make({ alsoSuits: ['no_such_event'] })), false, 'an unknown event')
})
await check('the enquiry form can record whether the venue allows outside decorators', async () => {
  const lead = (v: string) =>
    allowed(() =>
      payload.create({
        collection: 'leads',
        data: { name: TITLE, phone: '6100000299', requirements: { location: 'Test hall', venueOutsideDecorators: v } } as never,
        overrideAccess: false,
      }),
    )
  assert.equal(await lead('yes'), true)
  assert.equal(await lead('unsure'), true)
  assert.equal(await lead('maybe'), false)
})

// ── 4. Privacy ─────────────────────────────────────────────────────────────
console.log('Privacy: nothing for visitors, couples or vendors')
const PRIVATE_LISTS = ['decor-items', 'decor-suppliers', 'decor-price-history', 'decor-views', 'decor-photos'] as const
for (const [who, user] of [
  ['visitor', undefined],
  ['couple', coupleUser],
  ['vendor', vendorUser],
] as const) {
  for (const collection of PRIVATE_LISTS) {
    await check(`${who}: cannot list ${collection}`, async () => {
      assert.equal(await allowed(() => payload.find({ collection, user, overrideAccess: false, limit: 1 })), false)
    })
  }
  await check(`${who}: cannot open one decoration`, async () => {
    assert.equal(await allowed(() => payload.findByID({ collection: 'decor-items', id: a.id, user, overrideAccess: false })), false)
  })
  await check(`${who}: cannot read Decoration settings`, async () => {
    assert.equal(await allowed(() => payload.findGlobal({ slug: 'decor-settings', user, overrideAccess: false })), false)
  })
  await check(`${who}: cannot create a decoration`, async () => {
    assert.equal(await allowed(() => makeAs(user)), false)
  })
}
await check('couple: own account has no saved-decorations / blocked fields', async () => {
  await payload.update({
    collection: 'customers',
    id: couple.id,
    data: { decorShortlist: [a.id], decorBlocked: false },
    overrideAccess: true,
  })
  const me = await payload.findByID({ collection: 'customers', id: couple.id, user: coupleUser, overrideAccess: false, depth: 2 })
  assert.equal('decorShortlist' in me, false, 'decorShortlist leaked')
  assert.equal('decorBlocked' in me, false, 'decorBlocked leaked')
  assert.equal(JSON.stringify(me).includes('36000'), false, 'a vendor price leaked')
})
await check('photo files get a random name (the supplier’s file name never shows)', async () => {
  assert.match(String(photo.filename), /^decor-[0-9a-f]{12}\.webp$/)
  assert.equal(JSON.stringify(photo).toLowerCase().includes('kumar'), false)
})
await check('photos are kept high-res: 2560 px long edge, WebP, with thumbnail + card + large', async () => {
  assert.equal(photo.width, 2560)
  assert.equal(photo.height, 1920)
  assert.equal(photo.mimeType, 'image/webp')
  assert.ok(photo.sizes?.thumbnail?.url && photo.sizes?.card?.url)
  assert.equal(photo.sizes?.large?.width, 1600)
})
await check('a portrait photo is capped by its height, and small photos are never enlarged', async () => {
  const make2 = async (width: number, height: number) =>
    payload.create({
      collection: 'decor-photos',
      data: { alt: TITLE },
      file: {
        data: await sharp({ create: { width, height, channels: 3, background: '#335' } }).jpeg().toBuffer(),
        mimetype: 'image/jpeg',
        name: 'p.jpg',
        size: 0,
      },
      overrideAccess: true,
    })
  const tall = await make2(3024, 4032)
  assert.deepEqual([tall.width, tall.height], [1920, 2560])
  const small = await make2(900, 600)
  assert.deepEqual([small.width, small.height], [900, 600])
})

// ── 5. Roles ───────────────────────────────────────────────────────────────
console.log('Roles')
await check('viewer: sees vendor price, supplier, notes and margin', async () => {
  const doc = await payload.findByID({ collection: 'decor-items', id: a.id, user: staff.viewer, overrideAccess: false, depth: 0 })
  assert.equal(doc.vendorPrice, 36000)
  assert.equal(doc.supplier, supplier.id)
  assert.equal(doc.notes, TITLE)
  assert.equal(doc.margin, 14000)
})
await check('viewer: cannot add or edit', async () => {
  assert.equal(await allowed(() => make({}, staff.viewer)), false)
  assert.equal(
    await allowed(() => payload.update({ collection: 'decor-items', id: a.id, data: { size: 'x' }, user: staff.viewer, overrideAccess: false })),
    false,
  )
})
await check('team member: cannot delete (archive instead)', async () => {
  assert.equal(await allowed(() => payload.delete({ collection: 'decor-items', id: a.id, user: staff.team, overrideAccess: false })), false)
  const u = await payload.update({ collection: 'decor-items', id: a.id, data: { status: 'archived' }, user: staff.team, overrideAccess: false })
  assert.equal(u.status, 'archived')
})
await check('team member: cannot see who viewed prices; owner can', async () => {
  assert.equal(await allowed(() => payload.find({ collection: 'decor-views', user: staff.team, overrideAccess: false })), false)
  assert.equal(await allowed(() => payload.find({ collection: 'decor-views', user: staff.owner, overrideAccess: false })), true)
})
await check('nobody can write price history by hand', async () => {
  assert.equal(
    await allowed(() =>
      payload.create({
        collection: 'decor-price-history',
        data: { item: a.id, field: 'client', newPrice: 1, changedOn: new Date().toISOString() },
        user: staff.owner,
        overrideAccess: false,
      }),
    ),
    false,
  )
})
await check('owner: can delete a decoration that has price history and price views', async () => {
  // Production Postgres refused this with a 500 until the item's history and views were
  // removed first (beforeDelete in DecorItems.ts); the local SQLite doesn't enforce that rule,
  // so this checks the clean-up itself.
  const c = await make()
  await payload.create({
    collection: 'decor-views',
    data: { customer: couple.id, item: c.id, day: '2026-11-02' },
    overrideAccess: true,
  })
  const rows = (collection: 'decor-price-history' | 'decor-views') =>
    payload.count({ collection, where: { item: { equals: c.id } }, overrideAccess: true }).then((r) => r.totalDocs)
  assert.ok((await rows('decor-price-history')) > 0, 'the item has price history')
  assert.equal(await allowed(() => payload.delete({ collection: 'decor-items', id: c.id, user: staff.owner, overrideAccess: false })), true)
  assert.equal(await rows('decor-price-history'), 0)
  assert.equal(await rows('decor-views'), 0)
})

// ── 6. The public site (lib/decorations.ts) ────────────────────────────────
console.log('Public pages')
const { decorationCounts, getPublicDecoration, listDecorations, priceFor, stagePriceFor } = await import('../lib/decorations')
const slugOf = (d: { slug?: string | null }) => String(d.slug)
// Earlier sections edit and archive `a`, so the public checks use a fresh Active item.
const live = await make({ title: `${TITLE} live` })
await check('the site gets only public fields: no cost price, supplier or notes', async () => {
  const found = await getPublicDecoration(slugOf(live))
  assert.ok(found, 'an Active decoration is on the site')
  const json = JSON.stringify(found.item)
  assert.ok(!json.includes('36000'), 'vendor price leaked')
  assert.ok(!json.includes(`${TITLE} supplier`), 'supplier leaked')
  assert.ok(!/vendorPrice|supplier|notes|margin|clientPrice/.test(json), 'a private field name leaked')
  assert.ok(!json.includes('Kumar'), 'the phone file name leaked')
})
await check('drafts and archived items are not on the site', async () => {
  const d = await make({ status: 'draft', photos: [], title: `${TITLE} draft` })
  assert.equal(await getPublicDecoration(slugOf(d)), null)
  const x = await make({ title: `${TITLE} archived` })
  await payload.update({ collection: 'decor-items', id: x.id, data: { status: 'archived' }, overrideAccess: true })
  assert.equal(await getPublicDecoration(slugOf(x)), null)
  const list = await listDecorations({})
  assert.ok(!list.items.some((i) => i.id === d.id || i.id === x.id))
})
await check('prices: logged-out visitors are asked to log in', async () => {
  const found = await getPublicDecoration(slugOf(live))
  assert.deepEqual(await priceFor(live.id, found!.price, null), { state: 'login' })
})
await check('prices: a client sees exact, range, "from" and hidden as the team set them', async () => {
  const one = (mode: string, price = 50000) =>
    make({ publicDisplay: mode, clientPrice: price, title: `${TITLE} ${mode}` }).then(async (d) => {
      const f = await getPublicDecoration(slugOf(d))
      return priceFor(d.id, f!.price, couple as never)
    })
  const exact = await one('exact')
  assert.equal(exact.state === 'shown' && exact.text, '₹50,000')
  const range = await one('range')
  assert.equal(range.state === 'shown' && range.text, '₹43,000 – ₹58,000')
  const from = await one('from')
  assert.equal(from.state === 'shown' && from.text, 'Starting from ₹50,000')
  assert.deepEqual(await one('hidden'), { state: 'ask', reason: 'hidden' })
})
await check('prices: the daily limit counts different items; seeing one again is free', async () => {
  await payload.delete({ collection: 'decor-views', where: { customer: { equals: couple.id } }, overrideAccess: true })
  await payload.updateGlobal({ slug: 'decor-settings', data: { dailyPriceLimit: 2 }, overrideAccess: true })
  try {
    const items = [await make({ title: `${TITLE} l1` }), await make({ title: `${TITLE} l2` }), await make({ title: `${TITLE} l3` })]
    const see = async (d: (typeof items)[number]) => (await priceFor(d.id, (await getPublicDecoration(slugOf(d)))!.price, couple as never)).state
    assert.equal(await see(items[0]), 'shown')
    assert.equal(await see(items[1]), 'shown')
    assert.equal(await see(items[2]), 'limit')
    assert.equal(await see(items[0]), 'shown', 'an item already seen today stays visible')
    const views = await payload.count({ collection: 'decor-views', where: { customer: { equals: couple.id } }, overrideAccess: true })
    assert.equal(views.totalDocs, 2)
  } finally {
    await payload.updateGlobal({ slug: 'decor-settings', data: { dailyPriceLimit: 40 }, overrideAccess: true })
  }
})
await check('prices: a blocked client sees no prices', async () => {
  await payload.update({ collection: 'customers', id: couple.id, data: { decorBlocked: true } as never, overrideAccess: true })
  try {
    assert.deepEqual(await priceFor(live.id, (await getPublicDecoration(slugOf(live)))!.price, couple as never), { state: 'limit' })
  } finally {
    await payload.update({ collection: 'customers', id: couple.id, data: { decorBlocked: false } as never, overrideAccess: true })
  }
})

await check('a shared decoration shows under its main event and each event it also suits', async () => {
  const shared = await make({ eventType: 'reception', alsoSuits: ['engagement', 'puberty'], title: `${TITLE} shared` })
  const inEvent = async (event: string) => (await listDecorations({ event })).items.some((i) => i.id === shared.id)
  assert.equal(await inEvent('reception'), true)
  assert.equal(await inEvent('engagement'), true)
  assert.equal(await inEvent('puberty'), true)
  assert.equal(await inEvent('anniversary'), false)
  const found = await getPublicDecoration(slugOf(shared))
  assert.deepEqual(found!.item.alsoSuits.map(([v]) => v).sort(), ['engagement', 'puberty'])
  assert.match(String(found!.item.code), /^REC-/)
  const before = await decorationCounts()
  await make({ eventType: 'reception', alsoSuits: ['engagement'], title: `${TITLE} shared 2` })
  const after = await decorationCounts()
  assert.equal(after.byEvent.reception, before.byEvent.reception + 1)
  assert.equal(after.byEvent.engagement, before.byEvent.engagement + 1)
  assert.equal(after.byEvent.puberty, before.byEvent.puberty)
})
await check('the site filters by flowers / material', async () => {
  const b = await make({ material: 'balloons', title: `${TITLE} balloons only` })
  const list = await listDecorations({ material: 'balloons' })
  assert.ok(list.items.some((i) => i.id === b.id))
  assert.ok(list.items.every((i) => i.material === 'balloons'))
  const none = await listDecorations({ material: 'not_a_material' })
  assert.ok(none.items.length > 0, 'an unknown material is ignored, not a filter')
})
await check('stage cost: shown to a client, never to a visitor; the amount comes from the settings', async () => {
  await payload.updateGlobal({ slug: 'decor-settings', data: { stageCost: 25000 }, overrideAccess: true })
  try {
    assert.deepEqual(await stagePriceFor(null), { state: 'login' })
    const s = await stagePriceFor(couple as never)
    assert.equal(s.state === 'shown' && s.text.includes('₹25,000'), true)
    await payload.updateGlobal({ slug: 'decor-settings', data: { stageCost: null }, overrideAccess: true })
    const none = await stagePriceFor(couple as never)
    assert.equal(none.state === 'shown' && /\d/.test(none.text), false, 'no figure without an amount')
  } finally {
    await payload.updateGlobal({ slug: 'decor-settings', data: { stageCost: null }, overrideAccess: true })
  }
})

await cleanup()
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll decoration checks passed.')
process.exit(failures ? 1 : 0)
