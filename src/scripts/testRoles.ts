// npm run test:roles — checks the admin team access (access/roles.ts) against the LOCAL
// SQLite database:
//   1. access by module: None / Read only / Add & edit / Full, per menu group
//   2. a member sees and can open only their modules (lists, edits, deletes, approvals)
//   3. Owner-only lists (Runs, phone checks, price views, Team) and the features switched off
//   4. the Team list: only the Owner sees it and changes access; others see only themselves
//   5. a switched-off member can't log in or read anything; the last Owner can't be removed
//   6. vendors and couples still get nothing from staff-only lists
// Test logins are role-<name>@test.invalid; they are removed before and after each run.
// `npm run test:roles -- --keep` leaves them (password below) for trying the admin by hand.
// Refuses to run against Postgres, so it can never touch production.
import 'dotenv/config'

import assert from 'node:assert/strict'
import { getPayload } from 'payload'

import { MODULES, accessFor, hasLevel, isOwner, levelOf, moduleHidden, ownerHidden, type Level, type Module } from '../access/roles'
import config from '../payload.config'
import type { User } from '../payload-types'

if ((process.env.DATABASE_URI || '').startsWith('postgres')) {
  console.error('test:roles only runs on the local SQLite database. Unset DATABASE_URI.')
  process.exit(1)
}

/** Local test value only — these logins exist only in the local SQLite database. */
const TEST_PASSWORD = 'zenfest-role-test'
const KEEP = process.argv.includes('--keep')

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

const emailOf = (name: string) => `role-${name}@test.invalid`

async function cleanup() {
  await payload.delete({ collection: 'users', where: { email: { like: '@test.invalid' } }, overrideAccess: true })
  await payload.delete({ collection: 'leads', where: { name: { equals: 'Role test lead' } }, overrideAccess: true })
  await payload.delete({ collection: 'decor-items', where: { title: { equals: 'Role test decoration' } }, overrideAccess: true })
}

/** Runs `fn` as `user` with access checks on; resolves to true if Payload allowed it. */
async function allowed(fn: () => Promise<unknown>) {
  try {
    await fn()
    return true
  } catch {
    return false
  }
}

await cleanup()

const none = Object.fromEntries(MODULES.map((m) => [m.value, 'none'])) as Record<Module, Level>
/** Who is who (all Team members except the Owner). */
const PEOPLE: Record<string, { role: 'owner' | 'team'; access: Partial<Record<Module, Level>> }> = {
  owner: { role: 'owner', access: {} },
  // "Satish Kumar only sees Decorations, and may only look."
  reader: { role: 'team', access: { decorations: 'read' } },
  // Adds and edits decorations and enquiries, never deletes.
  editor: { role: 'team', access: { decorations: 'edit', clients: 'edit' } },
  // Full in several modules, nothing in the others.
  boss: { role: 'team', access: { decorations: 'full', clients: 'full', vendors: 'full', whatsapp: 'full', website: 'full' } },
  // A login with nothing switched on.
  nobody: { role: 'team', access: {} },
}
type Who = keyof typeof PEOPLE

const users = {} as Record<Who, User & { collection: 'users' }>
for (const [name, p] of Object.entries(PEOPLE)) {
  const doc = await payload.create({
    collection: 'users',
    data: {
      email: emailOf(name),
      password: TEST_PASSWORD,
      name: `Test ${name}`,
      role: p.role,
      moduleAccess: { ...none, ...p.access },
    },
    overrideAccess: true,
  })
  users[name as Who] = { ...doc, collection: 'users' }
}
const lead = await payload.create({
  collection: 'leads',
  data: { name: 'Role test lead', phone: '6100000001', eventType: 'wedding' },
  overrideAccess: true,
  context: { skipNotify: true },
})
/** A test decoration; as `user` with access checks on, or straight in when no user is given. */
const makeDecor = (data: Record<string, unknown>, user?: unknown) =>
  payload.create({
    collection: 'decor-items',
    data: {
      title: 'Role test decoration',
      eventType: 'wedding',
      category: 'stage',
      material: 'balloons',
      clientPrice: 5,
      status: 'draft',
      ...data,
    } as never,
    ...(user ? { user: user as never, overrideAccess: false } : { overrideAccess: true }),
  })

const decor = await makeDecor({ material: 'real_flowers', status: 'draft', clientPrice: 1000 })

const canRead = (user: unknown, collection: string) =>
  allowed(() => payload.find({ collection: collection as never, user: user as never, overrideAccess: false, limit: 1 }))

console.log('Access levels (the rules themselves)')
await check('the Owner has Full everywhere; a member with nothing set has None', async () => {
  for (const m of MODULES) {
    assert.equal(levelOf(users.owner, m.value), 'full')
    assert.equal(levelOf(users.nobody, m.value), 'none')
  }
  assert.equal(isOwner(users.owner), true)
  assert.equal(isOwner(users.boss), false)
})
await check('each level counts for itself and below: read < edit < full', async () => {
  assert.equal(hasLevel(users.reader, 'decorations', 'read'), true)
  assert.equal(hasLevel(users.reader, 'decorations', 'edit'), false)
  assert.equal(hasLevel(users.editor, 'decorations', 'edit'), true)
  assert.equal(hasLevel(users.editor, 'decorations', 'full'), false)
  assert.equal(hasLevel(users.boss, 'decorations', 'full'), true)
})
await check('a missing or unknown level is None; a switched-off member and non-staff have nothing', async () => {
  assert.equal(levelOf({ collection: 'users', role: 'team', moduleAccess: null }, 'clients'), 'none')
  assert.equal(levelOf({ collection: 'users', role: 'team', moduleAccess: { clients: 'admin' } }, 'clients'), 'none')
  assert.equal(levelOf({ ...users.boss, active: false }, 'clients'), 'none')
  assert.equal(levelOf({ collection: 'vendors' } as never, 'clients'), 'none')
  assert.equal(levelOf(null, 'clients'), 'none')
  assert.equal(levelOf({ ...users.owner, active: false }, 'clients'), 'none')
})
await check('the old Manager / Viewer role values give no access on their own', async () => {
  assert.equal(levelOf({ collection: 'users', role: 'manager' }, 'clients'), 'none')
  assert.equal(levelOf({ collection: 'users', role: 'viewer' }, 'clients'), 'none')
})
await check('the admin menu hides a module from a member with None, and shows it from Read only', async () => {
  const hidden = (u: unknown) => moduleHidden('decorations', 'decor-items')({ user: u })
  assert.equal(hidden(users.nobody), true)
  assert.equal(hidden(users.reader), false)
  assert.equal(hidden(users.owner), false)
  assert.equal(ownerHidden('users')({ user: users.boss }), true)
  assert.equal(ownerHidden('users')({ user: users.owner }), false)
  // A switched-off feature is hidden for everyone, the Owner included.
  assert.equal(moduleHidden('website', 'polls')({ user: users.owner }), true)
})

console.log('Read only (the "Satish Kumar" case: only Decorations, only looking)')
await check('reader: can open decorations, suppliers, photos and price history', async () => {
  for (const c of ['decor-items', 'decor-suppliers', 'decor-photos', 'decor-price-history']) {
    assert.equal(await canRead(users.reader, c), true, c)
  }
})
await check('reader: cannot open any other module', async () => {
  for (const c of [
    'leads',
    'customers',
    'vendor-applications',
    'vendors',
    'whatsapp-contacts',
    'whatsapp-messages',
    'whatsapp-campaigns',
    'contacts',
    'reminders',
  ]) {
    assert.equal(await canRead(users.reader, c), false, c)
  }
})
await check('reader: sees only published reviews (Website is None); a Website member sees them all', async () => {
  const draft = await payload.create({
    collection: 'testimonials',
    data: { name: 'Role test review', rating: 5, text: 'Unpublished test review', source: 'direct', published: false } as never,
    overrideAccess: true,
  })
  try {
    const seen = (user: unknown) =>
      payload
        .find({ collection: 'testimonials', where: { id: { equals: draft.id } }, user: user as never, overrideAccess: false })
        .then((r) => r.totalDocs)
    assert.equal(await seen(users.reader), 0)
    assert.equal(await seen(users.nobody), 0)
    assert.equal(await seen(users.boss), 1)
    assert.equal(await seen(users.owner), 1)
  } finally {
    await payload.delete({ collection: 'testimonials', id: draft.id, overrideAccess: true })
  }
})
await check('reader: cannot add, change or delete a decoration', async () => {
  assert.equal(
    await allowed(() => makeDecor({ clientPrice: 1 }, users.reader)),
    false,
  )
  assert.equal(
    await allowed(() =>
      payload.update({ collection: 'decor-items', id: decor.id, data: { size: 'x' }, user: users.reader, overrideAccess: false }),
    ),
    false,
  )
  assert.equal(
    await allowed(() => payload.delete({ collection: 'decor-items', id: decor.id, user: users.reader, overrideAccess: false })),
    false,
  )
})
await check('reader: sees the cost price (Read only means every field in the module)', async () => {
  const doc = await payload.findByID({ collection: 'decor-items', id: decor.id, user: users.reader, overrideAccess: false, depth: 0 })
  assert.equal(doc.clientPrice, 1000)
})
await check('nobody: cannot open anything', async () => {
  for (const c of ['decor-items', 'leads', 'customers', 'vendors', 'whatsapp-contacts', 'contacts', 'reminders']) {
    assert.equal(await canRead(users.nobody, c), false, c)
  }
})

console.log('Add & edit (can add and change, cannot delete or approve)')
await check('editor: can add and change a decoration', async () => {
  const made = await makeDecor({}, users.editor)
  const changed = await payload.update({
    collection: 'decor-items',
    id: made.id,
    data: { size: '10 ft' },
    user: users.editor,
    overrideAccess: false,
  })
  assert.equal(changed.size, '10 ft')
})
await check('editor: cannot delete a decoration or an enquiry', async () => {
  assert.equal(
    await allowed(() => payload.delete({ collection: 'decor-items', id: decor.id, user: users.editor, overrideAccess: false })),
    false,
  )
  assert.equal(await allowed(() => payload.delete({ collection: 'leads', id: lead.id, user: users.editor, overrideAccess: false })), false)
})
await check('editor: can work enquiries (Clients: Add & edit), but not Vendors, WhatsApp or Website', async () => {
  assert.equal(await canRead(users.editor, 'leads'), true)
  assert.equal(
    await allowed(() =>
      payload.update({ collection: 'leads', id: lead.id, data: { status: 'contacted' }, user: users.editor, overrideAccess: false }),
    ),
    true,
  )
  for (const c of ['vendor-applications', 'vendors', 'whatsapp-contacts', 'contacts']) {
    assert.equal(await canRead(users.editor, c), false, c)
  }
})
await check('editor: cannot change website settings or Decoration settings (Full only)', async () => {
  assert.equal(await allowed(() => payload.updateGlobal({ slug: 'site-settings', data: {}, user: users.editor, overrideAccess: false })), false)
  assert.equal(
    await allowed(() => payload.updateGlobal({ slug: 'decor-settings', data: { dailyPriceLimit: 40 }, user: users.editor, overrideAccess: false })),
    false,
  )
})

console.log('Full (everything in the module, nothing outside it)')
await check('boss: can delete a decoration and an enquiry (their modules)', async () => {
  const one = await makeDecor({})
  assert.equal(await allowed(() => payload.delete({ collection: 'decor-items', id: one.id, user: users.boss, overrideAccess: false })), true)
  const extra = await payload.create({
    collection: 'leads',
    data: { name: 'Role test lead', phone: '6100000002', eventType: 'wedding' },
    overrideAccess: true,
    context: { skipNotify: true },
  })
  assert.equal(await allowed(() => payload.delete({ collection: 'leads', id: extra.id, user: users.boss, overrideAccess: false })), true)
})
await check('boss: can change website and Decoration settings', async () => {
  assert.equal(await allowed(() => payload.updateGlobal({ slug: 'site-settings', data: {}, user: users.boss, overrideAccess: false })), true)
  assert.equal(
    await allowed(() => payload.updateGlobal({ slug: 'decor-settings', data: { dailyPriceLimit: 40 }, user: users.boss, overrideAccess: false })),
    true,
  )
})
await check('boss: cannot open Birthdays & anniversaries or Rewards settings (None)', async () => {
  assert.equal(await canRead(users.boss, 'contacts'), false)
  assert.equal(await allowed(() => payload.findGlobal({ slug: 'reward-settings', user: users.boss, overrideAccess: false })), false)
  assert.equal(await allowed(() => payload.findGlobal({ slug: 'reminder-settings', user: users.boss, overrideAccess: false })), false)
})

console.log('Approvals (Full only)')
const apps = await payload.find({ collection: 'vendor-applications', limit: 1, overrideAccess: true })
if (apps.docs[0]) {
  const app = apps.docs[0]
  const vendorEdit = await payload.create({
    collection: 'users',
    data: {
      email: emailOf('vendoredit'),
      password: TEST_PASSWORD,
      name: 'Test vendoredit',
      role: 'team',
      moduleAccess: { ...none, vendors: 'edit' },
    },
    overrideAccess: true,
  })
  for (const [name, user, can] of [
    ['owner', users.owner, true],
    ['boss (Vendors: Full)', users.boss, true],
    ['vendoredit (Vendors: Add & edit)', { ...vendorEdit, collection: 'users' as const }, false],
  ] as const) {
    await check(`${name}: ${can ? 'can' : 'cannot'} approve a vendor application`, async () => {
      const before = app.status
      const target = before === 'approved' ? 'reviewing' : 'approved'
      await payload
        .update({
          collection: 'vendor-applications',
          id: app.id,
          data: { status: target },
          user,
          overrideAccess: false,
          context: { skipRuns: true },
        })
        .catch(() => null)
      const after = await payload.findByID({ collection: 'vendor-applications', id: app.id, overrideAccess: true })
      // Field access drops the change silently below Full.
      assert.equal(after.status === target, can)
      await payload.update({
        collection: 'vendor-applications',
        id: app.id,
        data: { status: before },
        overrideAccess: true,
        context: { skipRuns: true },
      })
    })
  }
} else console.log('  (no vendor application in the local DB — approval check skipped)')

console.log('Owner-only lists, and features switched off')
await check('even Full everywhere cannot open Team, Runs, phone checks, price views or invite visits', async () => {
  for (const c of ['runs', 'phone-verifications', 'decor-views', 'referral-visits']) {
    assert.equal(await canRead(users.boss, c), false, c)
    assert.equal(await canRead(users.owner, c), true, c)
  }
})
await check('lists switched off for now (gift registry, polls, shop, AI…) are Owner-only over the API', async () => {
  for (const c of ['registry-events', 'registry-items', 'polls', 'poll-votes', 'products', 'ai-conversations', 'signups', 'host-applications', 'enquiries']) {
    assert.equal(await canRead(users.boss, c), false, c)
    assert.equal(await canRead(users.owner, c), true, c)
  }
})

console.log('Team list')
await check('owner sees every team member', async () => {
  const res = await payload.find({ collection: 'users', user: users.owner, overrideAccess: false, limit: 100 })
  assert.ok(res.totalDocs >= Object.keys(PEOPLE).length)
})
for (const who of ['reader', 'editor', 'boss', 'nobody'] as const) {
  await check(`${who} sees only their own login`, async () => {
    const res = await payload.find({ collection: 'users', user: users[who], overrideAccess: false, limit: 100 })
    assert.deepEqual(res.docs.map((d) => d.id), [users[who].id])
  })
  await check(`${who} cannot make themselves Owner or widen their own access`, async () => {
    await payload
      .update({
        collection: 'users',
        id: users[who].id,
        data: { role: 'owner', moduleAccess: { ...none, clients: 'full', decorations: 'full' } },
        user: users[who],
        overrideAccess: false,
      })
      .catch(() => null)
    const after = await payload.findByID({ collection: 'users', id: users[who].id, overrideAccess: true })
    assert.equal(after.role, 'team')
    assert.deepEqual(
      Object.fromEntries(MODULES.map((m) => [m.value, after.moduleAccess?.[m.value] ?? 'none'])),
      { ...none, ...PEOPLE[who].access },
    )
  })
  await check(`${who} can still change their own name`, async () => {
    const u = await payload.update({
      collection: 'users',
      id: users[who].id,
      data: { name: `Test ${who} renamed` },
      user: users[who],
      overrideAccess: false,
    })
    assert.equal(u.name, `Test ${who} renamed`)
  })
  await check(`${who} cannot add a team member`, async () => {
    const ok = await allowed(() =>
      payload.create({
        collection: 'users',
        data: { email: `role-extra-${who}@test.invalid`, password: TEST_PASSWORD, role: 'owner' },
        user: users[who],
        overrideAccess: false,
      }),
    )
    assert.equal(ok, false)
  })
}
await check('owner can change someone’s access, and it takes effect at once', async () => {
  assert.equal(await canRead(users.nobody, 'decor-items'), false)
  await payload.update({
    collection: 'users',
    id: users.nobody.id,
    data: { moduleAccess: { ...none, decorations: 'read' } },
    user: users.owner,
    overrideAccess: false,
  })
  const fresh = await payload.findByID({ collection: 'users', id: users.nobody.id, overrideAccess: true })
  assert.equal(await canRead({ ...fresh, collection: 'users' }, 'decor-items'), true)
  await payload.update({ collection: 'users', id: users.nobody.id, data: { moduleAccess: { ...none } }, overrideAccess: true })
})
await check('a new team member starts with no access to anything', async () => {
  const doc = await payload.create({
    collection: 'users',
    data: { email: emailOf('fresh'), password: TEST_PASSWORD, name: 'Test fresh', role: 'team' },
    user: users.owner,
    overrideAccess: false,
  })
  for (const m of MODULES) assert.equal(levelOf({ ...doc, collection: 'users' }, m.value), 'none')
})

console.log('Switched off, last Owner')
await check('a switched-off member cannot log in', async () => {
  await payload.update({ collection: 'users', id: users.boss.id, data: { active: false }, overrideAccess: true })
  const ok = await allowed(() => payload.login({ collection: 'users', data: { email: emailOf('boss'), password: TEST_PASSWORD } }))
  assert.equal(ok, false)
})
await check('a switched-off member reads nothing', async () => {
  const off = { ...users.boss, active: false }
  assert.equal(await canRead(off, 'leads'), false)
  await payload.update({ collection: 'users', id: users.boss.id, data: { active: true }, overrideAccess: true })
})
await check('an active member can log in, and the login carries their access', async () => {
  const res = await payload.login({ collection: 'users', data: { email: emailOf('editor'), password: TEST_PASSWORD } })
  assert.ok(res.token)
  assert.equal(levelOf({ ...res.user, collection: 'users' }, 'decorations'), 'edit')
  assert.equal(levelOf({ ...res.user, collection: 'users' }, 'vendors'), 'none')
})
await check('the last active Owner cannot be demoted', async () => {
  // Make the test owner the only active Owner for this check.
  const others = await payload.find({
    collection: 'users',
    where: { and: [{ role: { equals: 'owner' } }, { id: { not_equals: users.owner.id } }] },
    overrideAccess: true,
    limit: 100,
  })
  for (const o of others.docs) {
    await payload.update({ collection: 'users', id: o.id, data: { active: false }, overrideAccess: true })
  }
  try {
    const ok = await allowed(() =>
      payload.update({ collection: 'users', id: users.owner.id, data: { role: 'team' }, overrideAccess: true }),
    )
    assert.equal(ok, false)
    const okDelete = await allowed(() => payload.delete({ collection: 'users', id: users.owner.id, overrideAccess: true }))
    assert.equal(okDelete, false)
  } finally {
    for (const o of others.docs) {
      await payload.update({ collection: 'users', id: o.id, data: { active: o.active ?? true }, overrideAccess: true })
    }
  }
})

console.log('Vendors and couples')
await check('a vendor or couple login reads no enquiries, decorations or anything staff-only', async () => {
  for (const collection of ['vendors', 'customers'] as const) {
    const fake = { id: 999999, collection }
    for (const c of ['leads', 'decor-items', 'whatsapp-contacts', 'contacts']) {
      assert.equal(await canRead(fake, c), false, `${collection} → ${c}`)
    }
  }
})
await check('accessFor() gives the same answer to code that holds a request', async () => {
  const { can } = accessFor('decorations')
  assert.equal(can({ user: users.reader } as never, 'read'), true)
  assert.equal(can({ user: users.reader } as never, 'edit'), false)
  assert.equal(can({ user: users.nobody } as never, 'read'), false)
})

if (KEEP) {
  console.log(`\nKept the test logins role-<owner|reader|editor|boss|nobody>@test.invalid (local only).`)
  await payload.delete({ collection: 'leads', where: { name: { equals: 'Role test lead' } }, overrideAccess: true })
  await payload.delete({ collection: 'decor-items', where: { title: { equals: 'Role test decoration' } }, overrideAccess: true })
} else await cleanup()

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll access checks passed.')
process.exit(failures ? 1 : 0)
