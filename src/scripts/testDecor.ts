// npm run test:decor — checks the Decoration catalog against the LOCAL SQLite database:
//   1. item codes (WED-STG-001, 002 …) and web addresses are given on create and never change
//   2. every price change writes a price-history row and stamps "Price updated on"
//   3. an Active item needs a photo, title and client price; a Quick-add draft doesn't
//   4. PRIVACY: visitors, couples and vendors get nothing from the decor lists (items,
//      suppliers, price history, views, photo records); staff see the vendor price;
//      a couple's own account never carries the saved-decorations or blocked fields
//   5. roles: Viewer looks only, Team member adds/edits, only the Owner deletes
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
const ROLES = ['owner', 'team', 'viewer'] as const
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
    data: { email: `decor-${role}@test.invalid`, password: TEST_PASSWORD, name: `Decor ${role}`, role },
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
    data: await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#8a6414' } }).jpeg().toBuffer(),
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
  const c = await make({ eventType: 'birthday', category: 'balloon' })
  assert.match(String(c.itemCode), /^BDY-BLN-\d{3,}$/)
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
await check('photos are shrunk to 1600 px wide WebP with thumbnail + card', async () => {
  assert.equal(photo.width, 1600)
  assert.equal(photo.mimeType, 'image/webp')
  assert.ok(photo.sizes?.thumbnail?.url && photo.sizes?.card?.url)
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
await check('owner: can delete', async () => {
  const c = await make()
  await payload.delete({ collection: 'decor-price-history', where: { item: { equals: c.id } }, overrideAccess: true })
  assert.equal(await allowed(() => payload.delete({ collection: 'decor-items', id: c.id, user: staff.owner, overrideAccess: false })), true)
})

await cleanup()
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll decoration checks passed.')
process.exit(failures ? 1 : 0)
