// npm run test:roles — checks the admin team roles (access/roles.ts) against the LOCAL
// SQLite database:
//   1. Owner / Manager / Team member / Viewer: who may read, edit, approve and delete
//   2. the Team list: only the Owner sees it and changes roles; others see only themselves
//   3. a switched-off member can't log in or read anything; the last Owner can't be removed
//   4. vendors and couples still get nothing from staff-only lists
// Test logins are role-<role>@test.invalid; they are removed before and after each run.
// `npm run test:roles -- --keep` leaves them (password below) for trying the admin by hand.
// Refuses to run against Postgres, so it can never touch production.
import 'dotenv/config'

import assert from 'node:assert/strict'
import { getPayload } from 'payload'

import config from '../payload.config'
import type { User } from '../payload-types'

if ((process.env.DATABASE_URI || '').startsWith('postgres')) {
  console.error('test:roles only runs on the local SQLite database. Unset DATABASE_URI.')
  process.exit(1)
}

/** Local test value only — these logins exist only in the local SQLite database. */
const TEST_PASSWORD = 'zenfest-role-test'
const KEEP = process.argv.includes('--keep')
const ROLES = ['owner', 'manager', 'team', 'viewer'] as const

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

const emailOf = (role: string) => `role-${role}@test.invalid`

async function cleanup() {
  await payload.delete({ collection: 'users', where: { email: { like: '@test.invalid' } }, overrideAccess: true })
  await payload.delete({ collection: 'leads', where: { name: { equals: 'Role test lead' } }, overrideAccess: true })
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

const users = {} as Record<(typeof ROLES)[number], User & { collection: 'users' }>
for (const role of ROLES) {
  const doc = await payload.create({
    collection: 'users',
    data: { email: emailOf(role), password: TEST_PASSWORD, name: `Test ${role}`, role },
    overrideAccess: true,
  })
  users[role] = { ...doc, collection: 'users' }
}
const lead = await payload.create({
  collection: 'leads',
  data: { name: 'Role test lead', phone: '6100000001', eventType: 'wedding' },
  overrideAccess: true,
  context: { skipNotify: true },
})

console.log('Roles: lists')
for (const role of ROLES) {
  const user = users[role]
  await check(`${role}: can read enquiries`, async () => {
    const res = await payload.find({ collection: 'leads', user, overrideAccess: false, limit: 1 })
    assert.ok(res.totalDocs >= 1)
  })
  await check(`${role}: ${role === 'viewer' ? 'cannot' : 'can'} update an enquiry`, async () => {
    const ok = await allowed(() =>
      payload.update({ collection: 'leads', id: lead.id, data: { message: `by ${role}` }, user, overrideAccess: false }),
    )
    assert.equal(ok, role !== 'viewer')
  })
  await check(`${role}: ${['owner', 'manager'].includes(role) ? 'can' : 'cannot'} edit website settings`, async () => {
    const ok = await allowed(() =>
      payload.updateGlobal({ slug: 'site-settings', data: {}, user, overrideAccess: false }),
    )
    assert.equal(ok, role === 'owner' || role === 'manager')
  })
  await check(`${role}: ${role === 'owner' ? 'can' : 'cannot'} delete an enquiry`, async () => {
    const res = await payload.find({ collection: 'leads', where: { id: { equals: lead.id } }, overrideAccess: true })
    if (!res.totalDocs) return // already deleted by the owner pass
    const ok = await allowed(() => payload.delete({ collection: 'leads', id: lead.id, user, overrideAccess: false }))
    assert.equal(ok, role === 'owner')
    if (ok) {
      // put it back for the next role
      const again = await payload.create({
        collection: 'leads',
        data: { name: 'Role test lead', phone: '6100000001', eventType: 'wedding' },
        overrideAccess: true,
        context: { skipNotify: true },
      })
      lead.id = again.id
    }
  })
}

console.log('Roles: approvals')
for (const role of ROLES) {
  await check(`${role}: ${role === 'viewer' ? 'cannot' : 'can'} change an enquiry status`, async () => {
    // Status on enquiries is day-to-day work; approvals are on vendor applications.
    const ok = await allowed(() =>
      payload.update({ collection: 'leads', id: lead.id, data: { status: 'contacted' }, user: users[role], overrideAccess: false }),
    )
    assert.equal(ok, role !== 'viewer')
  })
}
const access = await payload.find({ collection: 'vendor-applications', limit: 1, overrideAccess: true })
if (access.docs[0]) {
  const app = access.docs[0]
  for (const role of ROLES) {
    await check(`${role}: ${['owner', 'manager'].includes(role) ? 'can' : 'cannot'} approve a vendor application`, async () => {
      const before = app.status
      const target = before === 'approved' ? 'reviewing' : 'approved'
      await payload
        .update({
          collection: 'vendor-applications',
          id: app.id,
          data: { status: target },
          user: users[role],
          overrideAccess: false,
          context: { skipRuns: true },
        })
        .catch(() => null)
      const after = await payload.findByID({ collection: 'vendor-applications', id: app.id, overrideAccess: true })
      // Field access drops the change silently for roles below Manager.
      assert.equal(after.status === target, role === 'owner' || role === 'manager')
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

console.log('Roles: Team list')
await check('owner sees every team member', async () => {
  const res = await payload.find({ collection: 'users', user: users.owner, overrideAccess: false, limit: 100 })
  assert.ok(res.totalDocs >= 4)
})
for (const role of ['manager', 'team', 'viewer'] as const) {
  await check(`${role} sees only their own login`, async () => {
    const res = await payload.find({ collection: 'users', user: users[role], overrideAccess: false, limit: 100 })
    assert.deepEqual(res.docs.map((d) => d.id), [users[role].id])
  })
  await check(`${role} cannot make themselves Owner`, async () => {
    await payload
      .update({ collection: 'users', id: users[role].id, data: { role: 'owner' }, user: users[role], overrideAccess: false })
      .catch(() => null)
    const after = await payload.findByID({ collection: 'users', id: users[role].id, overrideAccess: true })
    assert.equal(after.role, role)
  })
  await check(`${role} cannot add a team member`, async () => {
    const ok = await allowed(() =>
      payload.create({
        collection: 'users',
        data: { email: `role-extra-${role}@test.invalid`, password: TEST_PASSWORD, role: 'owner' },
        user: users[role],
        overrideAccess: false,
      }),
    )
    assert.equal(ok, false)
  })
}
await check('owner can change a role', async () => {
  await payload.update({ collection: 'users', id: users.viewer.id, data: { role: 'team' }, user: users.owner, overrideAccess: false })
  const after = await payload.findByID({ collection: 'users', id: users.viewer.id, overrideAccess: true })
  assert.equal(after.role, 'team')
  await payload.update({ collection: 'users', id: users.viewer.id, data: { role: 'viewer' }, overrideAccess: true })
})

console.log('Roles: switched off, last Owner')
await check('a switched-off member cannot log in', async () => {
  await payload.update({ collection: 'users', id: users.team.id, data: { active: false }, overrideAccess: true })
  const ok = await allowed(() =>
    payload.login({ collection: 'users', data: { email: emailOf('team'), password: TEST_PASSWORD } }),
  )
  assert.equal(ok, false)
})
await check('a switched-off member reads nothing', async () => {
  const off = { ...users.team, active: false }
  const ok = await allowed(() => payload.find({ collection: 'leads', user: off, overrideAccess: false }))
  assert.equal(ok, false)
  await payload.update({ collection: 'users', id: users.team.id, data: { active: true }, overrideAccess: true })
})
await check('an active member can log in', async () => {
  const res = await payload.login({ collection: 'users', data: { email: emailOf('manager'), password: TEST_PASSWORD } })
  assert.ok(res.token)
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
      payload.update({ collection: 'users', id: users.owner.id, data: { role: 'manager' }, overrideAccess: true }),
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

console.log('Roles: vendors and couples')
await check('a vendor or couple login reads no enquiries', async () => {
  const fake = { id: 999999, collection: 'vendors' } as never
  const ok = await allowed(() => payload.find({ collection: 'leads', user: fake, overrideAccess: false }))
  assert.equal(ok, false)
})

if (KEEP) {
  console.log(`\nKept the test logins role-<owner|manager|team|viewer>@test.invalid (local only).`)
  await payload.delete({ collection: 'leads', where: { name: { equals: 'Role test lead' } }, overrideAccess: true })
} else await cleanup()

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll role checks passed.')
process.exit(failures ? 1 : 0)
