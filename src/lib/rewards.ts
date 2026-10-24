// Server-only: the Runs club — awards, totals, settings and the Scorecard data.
// Never import from a client component; types, defaults and tier maths are in
// the client-safe lib/rewardTiers.ts.
//
// Each award is one `runs` row. The unique index on (accountKey, reason, source)
// makes an award happen once however often a hook fires or two requests race —
// don't replace it with a read-then-write check (the count below only saves a
// pointless insert). An account's `runs` field is a cache of the sum of its rows.
import { randomInt } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest, RequestContext, Where } from 'payload'

import { normalizePhone } from './phoneVerification'
import {
  DEFAULT_REWARD_SETTINGS,
  REFERRAL_ALPHABET,
  RUNS_REASONS,
  SCORING,
  accountKey,
  invitePath,
  parseAccountKey,
  isReferralCode,
  reasonLabel,
  tierFor,
  tiersFor,
  type AwardReason,
  type RewardSettingsData,
  type RewardTier,
  type RunsKind,
  type RunsReason,
} from './rewardTiers'

/** httpOnly cookie set by /invite/<code>; read when an enquiry is saved. */
export const REF_COOKIE = 'zf_ref'
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 60

const COLLECTION = { c: 'customers', v: 'vendors' } as const

export const kindOfCollection = (slug: unknown): RunsKind | null =>
  slug === 'customers' ? 'c' : slug === 'vendors' ? 'v' : null

/** The given client, or the app's shared one (imported lazily: collections import this file). */
async function clientOr(payload?: Payload): Promise<Payload> {
  if (payload) return payload
  const { getPayloadClient } = await import('./payload')
  return getPayloadClient()
}

export function newReferralCode() {
  let code = ''
  for (let i = 0; i < 8; i++) code += REFERRAL_ALPHABET[randomInt(REFERRAL_ALPHABET.length)]
  return code
}

// ---------- settings ----------

type StoredTier = { name?: string | null; minRuns?: number | null; rupeesOff?: number | null; perks?: string | null }

function cleanTiers(stored: StoredTier[] | null | undefined, fallback: RewardTier[]): RewardTier[] {
  const tiers = (stored ?? [])
    .filter((t) => t?.name && Number.isFinite(Number(t.minRuns)))
    .map((t) => ({
      name: String(t.name),
      minRuns: Math.max(0, Number(t.minRuns)),
      rupeesOff: Math.max(0, Number(t.rupeesOff) || 0),
      perks: t.perks || '',
    }))
    .sort((a, b) => a.minRuns - b.minRuns)
  return tiers.length ? tiers : fallback
}

/** The Reward Settings global with blanks filled from the defaults in lib/rewardTiers.ts. */
export async function getRewardSettings(payload?: Payload, req?: PayloadRequest): Promise<RewardSettingsData> {
  const cached = req?.context?.rewardSettings as RewardSettingsData | undefined
  if (cached) return cached
  const client = await clientOr(payload)
  let stored: {
    runsPer?: Partial<Record<AwardReason, number | null>> | null
    referralMonthlyCap?: number | null
    coupleTiers?: StoredTier[] | null
    vendorTiers?: StoredTier[] | null
  } = {}
  try {
    stored = (await client.findGlobal({ slug: 'reward-settings', depth: 0, req, overrideAccess: true })) as typeof stored
  } catch {
    // A database from before the global existed: use the defaults.
  }
  const runsPer = { ...DEFAULT_REWARD_SETTINGS.runsPer }
  for (const reason of Object.keys(runsPer) as AwardReason[]) {
    const n = stored.runsPer?.[reason]
    if (n != null && Number.isFinite(Number(n)) && Number(n) >= 0) runsPer[reason] = Number(n)
  }
  const cap = Number(stored.referralMonthlyCap)
  const settings: RewardSettingsData = {
    runsPer,
    referralMonthlyCap:
      stored.referralMonthlyCap != null && Number.isFinite(cap) && cap >= 0
        ? cap
        : DEFAULT_REWARD_SETTINGS.referralMonthlyCap,
    coupleTiers: cleanTiers(stored.coupleTiers, DEFAULT_REWARD_SETTINGS.coupleTiers),
    vendorTiers: cleanTiers(stored.vendorTiers, DEFAULT_REWARD_SETTINGS.vendorTiers),
  }
  if (req?.context) req.context.rewardSettings = settings
  return settings
}

// ---------- awards ----------

/**
 * Runs `fn` with `context` for the nested Local API calls, then puts the request's
 * own context back — Payload merges a call's `context` into the shared `req`, so
 * `skipRuns` would otherwise stay on and silence later award hooks in this request.
 */
async function withContext<T>(req: PayloadRequest | undefined, fn: (context: RequestContext) => Promise<T>) {
  const saved = req?.context
  try {
    return await fn({ skipRuns: true })
  } finally {
    if (req && saved) req.context = saved
  }
}

/**
 * Inside a Postgres transaction a failed INSERT aborts the whole transaction, so a
 * duplicate award would sink the lead / account save that triggered it. A
 * savepoint lets us roll back just the award. SQLite (local) has no transactions.
 */
async function savepoint(payload: Payload, req: PayloadRequest | undefined) {
  const id = req?.transactionID ? await req.transactionID : null
  const session = id ? (payload.db as { sessions?: Record<string, { db?: { execute?: (q: unknown) => Promise<unknown> } }> }).sessions?.[String(id)] : undefined
  const exec = session?.db?.execute?.bind(session.db)
  const run = async (q: string) => {
    if (exec) await exec(sql.raw(q))
  }
  await run('SAVEPOINT zf_runs')
  return { release: () => run('RELEASE SAVEPOINT zf_runs'), rollback: () => run('ROLLBACK TO SAVEPOINT zf_runs') }
}

const rowWhere = (key: string, reason: RunsReason, source: string): Where => ({
  and: [{ accountKey: { equals: key } }, { reason: { equals: reason } }, { source: { equals: source } }],
})

/** Sums an account's rows into its `runs` field and returns the total. */
export async function recomputeRuns(payload: Payload, kind: RunsKind, id: number | string, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'runs',
    where: { accountKey: { equals: accountKey(kind, id) } },
    pagination: false,
    depth: 0,
    select: { amount: true },
    overrideAccess: true,
    req,
  })
  const total = docs.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  await withContext(req, (context) =>
    payload.update({
      collection: COLLECTION[kind],
      id,
      data: { runs: total },
      depth: 0,
      overrideAccess: true,
      req,
      context,
    }),
  )
  return total
}

export type AwardInput = {
  kind: RunsKind
  id: number | string
  reason: AwardReason
  /** What the award is for, e.g. `lead:42`, `enquiry:7`, `account` (once per account). */
  source: string
  note?: string
  /** Pass the hook's `req` so the award joins its transaction. */
  req?: PayloadRequest
}

/**
 * Gives an account the runs for `reason` once per `source`. Returns whether a new
 * row was written and the account's new total (null when nothing changed).
 * A repeat (the unique index) is not an error.
 */
export async function awardRuns(payload: Payload, input: AwardInput): Promise<{ awarded: boolean; total: number | null }> {
  const { kind, id, reason, source, note, req } = input
  if (!id || !COLLECTION[kind]) return { awarded: false, total: null }
  const key = accountKey(kind, id)
  const where = rowWhere(key, reason, source)

  const already = await payload.count({ collection: 'runs', where, overrideAccess: true, req })
  if (already.totalDocs) return { awarded: false, total: null }
  const amount = (await getRewardSettings(payload, req)).runsPer[reason]
  if (!amount) return { awarded: false, total: null } // switched off in Reward Settings

  const sp = await savepoint(payload, req)
  try {
    const total = await withContext(req, async (context) => {
      await payload.create({
        collection: 'runs',
        data: {
          accountKey: key,
          account: { relationTo: COLLECTION[kind], value: Number(id) },
          amount,
          reason,
          source,
          note: note || undefined,
        },
        overrideAccess: true,
        req,
        context,
      })
      return recomputeRuns(payload, kind, id, req)
    })
    await sp.release()
    return { awarded: true, total }
  } catch (err) {
    await sp.rollback()
    // The (accountKey, reason, source) unique index rejected it: already awarded.
    const { totalDocs } = await payload.count({ collection: 'runs', where, overrideAccess: true, req })
    if (totalDocs) return { awarded: false, total: null }
    throw err
  }
}

/** For hooks: an award that never breaks the save that triggered it. */
export async function awardQuietly(payload: Payload, input: AwardInput) {
  try {
    return await awardRuns(payload, input)
  } catch (err) {
    payload.logger.error({ err, msg: `Runs club: could not award ${input.reason} to ${input.kind}:${input.id}` })
    return { awarded: false, total: null }
  }
}

// ---------- referrals ----------

export type Referrer = { kind: RunsKind; id: number; key: string; phone: string | null }

/** The account a referral code belongs to, or null. */
export async function findReferrer(payload: Payload, code: unknown, req?: PayloadRequest): Promise<Referrer | null> {
  const clean = String(code ?? '').trim().toUpperCase()
  if (!isReferralCode(clean)) return null
  for (const kind of ['c', 'v'] as const) {
    const { docs } = await payload.find({
      collection: COLLECTION[kind],
      where: { referralCode: { equals: clean } },
      limit: 1,
      depth: 0,
      select: { phone: true },
      overrideAccess: true,
      req,
    })
    const doc = docs[0] as { id: number; phone?: string | null } | undefined
    if (doc) return { kind, id: doc.id, key: accountKey(kind, doc.id), phone: normalizePhone(doc.phone) }
  }
  return null
}

/** The `zf_ref` value from a raw Cookie header. */
export function refCodeFromCookies(cookieHeader: string | null | undefined) {
  for (const part of String(cookieHeader ?? '').split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === REF_COOKIE) return decodeURIComponent(rest.join('='))
  }
  return null
}

/** The `zf_ref` code from the current request's cookies; null outside a request (scripts). */
async function cookieRefCode(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers')
    return (await cookies()).get(REF_COOKIE)?.value ?? null
  } catch {
    return null
  }
}

/**
 * The small invite award: someone `referrerKey` invited joined, applied or enquired.
 * Once per friend (source `phone:<10 digits>`, so joining *and* enquiring counts once)
 * and at most `referralMonthlyCap` in any 30 days, so invites can't be farmed. The cap
 * is a count before the insert — fine for a limit; "once" is still the unique index.
 */
export async function awardReferralSignup(
  payload: Payload,
  referrerKey: unknown,
  friendPhone: unknown,
  req?: PayloadRequest,
) {
  const ref = parseAccountKey(referrerKey)
  const phone = normalizePhone(friendPhone)
  if (!ref || !phone) return { awarded: false, total: null }
  try {
    const { referralMonthlyCap } = await getRewardSettings(payload, req)
    const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString()
    const recent = await payload.count({
      collection: 'runs',
      where: {
        and: [
          { accountKey: { equals: accountKey(ref.kind, ref.id) } },
          { reason: { equals: 'referral_signup' } },
          { createdAt: { greater_than: since } },
        ],
      },
      overrideAccess: true,
      req,
    })
    if (recent.totalDocs >= referralMonthlyCap) return { awarded: false, total: null }
  } catch (err) {
    // Like awardQuietly: an invite award never breaks the save that triggered it.
    payload.logger.error({ err, msg: 'Runs club: could not check the invite limit' })
    return { awarded: false, total: null }
  }
  return awardQuietly(payload, { kind: ref.kind, id: ref.id, reason: 'referral_signup', source: `phone:${phone}`, req })
}

/** The big vendor-invite award: a vendor `referrerKey` invited was approved or went live (once per vendor). */
export async function awardReferralVendor(payload: Payload, referrerKey: unknown, vendorPhone: unknown, req?: PayloadRequest) {
  const ref = parseAccountKey(referrerKey)
  const phone = normalizePhone(vendorPhone)
  if (!ref || !phone) return { awarded: false, total: null }
  return awardQuietly(payload, { kind: ref.kind, id: ref.id, reason: 'referral_vendor', source: `phone:${phone}`, req })
}

/**
 * Right after a sign-up's `joined` award: if this browser came through an invite link,
 * remember who invited the new account (`referredBy`), give it welcome runs and give
 * the inviter the small invite award. Own code / own phone never counts. `code`
 * defaults to the request's `zf_ref` cookie (tests pass it).
 */
export async function welcomeReferredAccount(
  payload: Payload,
  input: { kind: RunsKind; id: number | string; phone: unknown; code?: string | null },
) {
  try {
    const code = input.code === undefined ? await cookieRefCode() : input.code
    if (!code) return
    const referrer = await findReferrer(payload, code)
    if (!referrer) return
    const phone = normalizePhone(input.phone)
    if (referrer.key === accountKey(input.kind, input.id) || (phone && referrer.phone === phone)) return
    await payload.update({
      collection: COLLECTION[input.kind],
      id: input.id,
      data: { referredBy: referrer.key },
      depth: 0,
      overrideAccess: true,
      context: { skipRuns: true },
    })
    await awardQuietly(payload, { kind: input.kind, id: input.id, reason: 'welcome', source: 'account' })
    await awardReferralSignup(payload, referrer.key, phone)
  } catch (err) {
    payload.logger.error({ err, msg: 'Runs club: could not record an invite on sign-up' })
  }
}

/** Gives an account a referral code if it has none (accounts made before the Runs club). */
export async function ensureReferralCode(payload: Payload, kind: RunsKind, id: number | string, current?: string | null) {
  if (current) return current
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newReferralCode()
    try {
      await payload.update({
        collection: COLLECTION[kind],
        id,
        data: { referralCode: code },
        depth: 0,
        overrideAccess: true,
        context: { skipRuns: true },
      })
      return code
    } catch {
      // Unique index: astronomically unlikely clash, try another code.
    }
  }
  return null
}

// ---------- scorecard ----------

export type ScorecardRow = {
  id: number
  amount: number
  reason: RunsReason
  label: string
  note: string | null
  createdAt: string
}

export type Scorecard = {
  kind: RunsKind
  total: number
  tier: RewardTier
  next: RewardTier | null
  progress: number
  toNext: number
  /** Every tier for this kind of account, lowest first (for a ladder in the UI). */
  tiers: RewardTier[]
  /** Last 30 awards, newest first. */
  rows: ScorecardRow[]
  referralCode: string | null
  /** `/invite/<code>` — make it absolute with the site URL to share. */
  invitePath: string | null
}

const REASON_SET = new Set<string>(RUNS_REASONS.map((r) => r.value))

/** Everything the Scorecard tab and /rewards page show for one account. */
export async function getScorecard(kind: RunsKind, id: number | string, client?: Payload): Promise<Scorecard> {
  const payload = await clientOr(client)
  const [account, settings, history] = await Promise.all([
    payload.findByID({
      collection: COLLECTION[kind],
      id,
      depth: 0,
      select: { runs: true, referralCode: true },
      overrideAccess: true,
    }) as Promise<{ runs?: number | null; referralCode?: string | null }>,
    getRewardSettings(payload),
    payload.find({
      collection: 'runs',
      where: { accountKey: { equals: accountKey(kind, id) } },
      sort: '-createdAt',
      limit: 30,
      depth: 0,
      overrideAccess: true,
    }),
  ])
  const referralCode = await ensureReferralCode(payload, kind, id, account.referralCode)
  const tiers = tiersFor(settings, kind)
  const total = Number(account.runs) || 0
  return {
    kind,
    total,
    ...tierFor(total, tiers),
    tiers,
    rows: history.docs.map((r) => ({
      id: r.id,
      amount: Number(r.amount) || 0,
      reason: (REASON_SET.has(r.reason) ? r.reason : 'manual') as RunsReason,
      label: reasonLabel(r.reason),
      note: r.note ?? null,
      createdAt: r.createdAt,
    })),
    referralCode,
    invitePath: referralCode ? invitePath(referralCode) : null,
  }
}

/** Absolute invite links for both audiences, or null without a code. */
export async function inviteLinks(code: string | null): Promise<InviteLinks | null> {
  if (!code) return null
  const { siteUrl } = await import('./marketplaceMail')
  return { client: `${siteUrl()}${invitePath(code, 'client')}`, vendor: `${siteUrl()}${invitePath(code, 'vendor')}` }
}

export type InviteLinks = { client: string; vendor: string }

/** Everything the dashboards' Scorecard tab (components/market/Scorecard.tsx) takes. */
export async function scorecardProps(kind: RunsKind, id: number | string) {
  const payload = await clientOr()
  const [card, settings] = await Promise.all([getScorecard(kind, id, payload), getRewardSettings(payload)])
  return {
    card,
    links: await inviteLinks(card.referralCode),
    scoring: SCORING[kind]
      .map((s) => ({ reason: s.reason, label: s.label, runs: settings.runsPer[s.reason] }))
      .filter((s) => s.runs > 0),
  }
}

// ---------- referrals: the live tracker ----------

/** Client invites: joined / enquired → talking to our team → quote sent → booked. */
export const CLIENT_STAGES = ['Joined or enquired', 'Talking to our team', 'Quote sent', 'Booked'] as const
/** Vendor invites: joined / applied → under review → approved or live. */
export const VENDOR_STAGES = ['Joined or applied', 'Under review', 'Approved'] as const

export type ReferralFriend = {
  /** First name + initial only — the tracker never shows phones or emails. */
  name: string
  type: 'client' | 'vendor'
  /** 1-based position on its track (CLIENT_STAGES / VENDOR_STAGES). */
  step: number
  steps: number
  /** What to show for where they are now, e.g. "Enquired", "Quote sent", "Live". */
  label: string
  /** Didn't go ahead / not this time. */
  ended: boolean
  updatedAt: string
  runs: number
}

export type Referrals = {
  opened: { client: number; vendor: number; total: number }
  friends: ReferralFriend[]
  totals: { joined: number; clientsBooked: number; vendorsApproved: number; runs: number }
}

/** "Priya Raman" → "Priya R." */
export function shortName(name: unknown) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'A friend'
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0]
}

const LEAD_STEP: Record<string, { step: number; label: string; ended?: boolean }> = {
  new: { step: 1, label: 'Enquired' },
  contacted: { step: 2, label: 'Talking to our team' },
  quoted: { step: 3, label: 'Quote sent' },
  booked: { step: 4, label: 'Booked' },
  closed: { step: 1, label: 'Didn’t go ahead', ended: true },
}
const APPLICATION_STEP: Record<string, { step: number; label: string; ended?: boolean }> = {
  new: { step: 1, label: 'Applied' },
  reviewing: { step: 2, label: 'Under review' },
  approved: { step: 3, label: 'Approved' },
  rejected: { step: 1, label: 'Not this time', ended: true },
}
const LISTING_STEP: Record<string, { step: number; label: string; ended?: boolean }> = {
  draft: { step: 1, label: 'Joined' },
  pending: { step: 2, label: 'Under review' },
  published: { step: 3, label: 'Live' },
  paused: { step: 3, label: 'Live (paused)' },
  rejected: { step: 1, label: 'Not this time', ended: true },
}

/**
 * Everyone an account invited and how far each has got — the Refer & earn page. One
 * row per person (merged by phone across accounts, enquiries and partner
 * applications), first name + initial only. This is the privacy boundary: never pass
 * the raw docs to the page.
 */
export async function getReferrals(kind: RunsKind, id: number | string, client?: Payload): Promise<Referrals> {
  const payload = await clientOr(client)
  const key = accountKey(kind, id)
  const by = { referredBy: { equals: key } }
  const base = { depth: 0, pagination: false, overrideAccess: true } as const
  const [clientVisits, vendorVisits, couples, vendors, leads, applications, rows] = await Promise.all([
    payload.count({ collection: 'referral-visits', where: { and: [{ referrer: { equals: key } }, { audience: { equals: 'client' } }] }, overrideAccess: true }),
    payload.count({ collection: 'referral-visits', where: { and: [{ referrer: { equals: key } }, { audience: { equals: 'vendor' } }] }, overrideAccess: true }),
    payload.find({ collection: 'customers', where: by, ...base, select: { name: true, phone: true, updatedAt: true } }),
    payload.find({ collection: 'vendors', where: by, ...base, select: { name: true, phone: true, listingStatus: true, updatedAt: true } }),
    payload.find({ collection: 'leads', where: by, ...base, select: { name: true, phone: true, status: true, updatedAt: true } }),
    payload.find({ collection: 'vendor-applications', where: by, ...base, select: { name: true, phone: true, status: true, updatedAt: true } }),
    payload.find({
      collection: 'runs',
      where: { and: [{ accountKey: { equals: key } }, { reason: { in: ['referral', 'referral_signup', 'referral_vendor'] } }] },
      ...base,
      select: { amount: true, source: true },
    }),
  ])

  type Row = ReferralFriend & { phone: string }
  const people = new Map<string, Row>()
  const leadPhone = new Map<string, string>()
  // `specific`: an enquiry or application says more than a bare sign-up at the same stage.
  function put(
    phoneRaw: unknown,
    name: unknown,
    type: Row['type'],
    at: string,
    s: { step: number; label: string; ended?: boolean },
    specific = false,
  ) {
    const phone = normalizePhone(phoneRaw)
    if (!phone) return
    const steps = type === 'client' ? CLIENT_STAGES.length : VENDOR_STAGES.length
    const prev = people.get(phone)
    // Furthest stage wins; on a tie the live one, then the more specific ("Joined" → "Enquired").
    const better =
      !prev || s.step > prev.step || (s.step === prev.step && !s.ended && (prev.ended || specific))
    const row: Row = better
      ? { phone, name: shortName(name), type, step: s.step, steps, label: s.label, ended: Boolean(s.ended), updatedAt: at, runs: prev?.runs ?? 0 }
      : prev
    if (prev && at > prev.updatedAt) row.updatedAt = at
    people.set(phone, row)
  }
  for (const c of couples.docs) put(c.phone, c.name, 'client', c.updatedAt, { step: 1, label: 'Joined' })
  for (const v of vendors.docs) put(v.phone, v.name, 'vendor', v.updatedAt, LISTING_STEP[v.listingStatus ?? 'draft'] ?? LISTING_STEP.draft)
  for (const a of applications.docs) put(a.phone, a.name, 'vendor', a.updatedAt, APPLICATION_STEP[a.status ?? 'new'] ?? APPLICATION_STEP.new, true)
  for (const l of leads.docs) {
    const p = normalizePhone(l.phone)
    if (p) leadPhone.set(String(l.id), p)
    put(l.phone, l.name, 'client', l.updatedAt, LEAD_STEP[l.status ?? 'new'] ?? LEAD_STEP.new, true)
  }

  let runs = 0
  for (const r of rows.docs) {
    const amount = Number(r.amount) || 0
    runs += amount
    const src = String(r.source ?? '')
    const phone = src.startsWith('phone:') ? src.slice(6) : src.startsWith('lead:') ? leadPhone.get(src.slice(5)) : undefined
    const row = phone ? people.get(phone) : undefined
    if (row) row.runs += amount
  }

  const friends = [...people.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(({ phone: _phone, ...f }) => f)
  return {
    opened: { client: clientVisits.totalDocs, vendor: vendorVisits.totalDocs, total: clientVisits.totalDocs + vendorVisits.totalDocs },
    friends,
    totals: {
      joined: friends.length,
      clientsBooked: friends.filter((f) => f.type === 'client' && f.label === 'Booked').length,
      vendorsApproved: friends.filter((f) => f.type === 'vendor' && f.step === f.steps).length,
      runs,
    },
  }
}

/** The inviter's first name for /welcome ("Priya invited you…"), or null. Nothing else leaves. */
export async function inviterFirstName(code: unknown, client?: Payload): Promise<string | null> {
  const payload = await clientOr(client)
  const referrer = await findReferrer(payload, code).catch(() => null)
  if (!referrer) return null
  const doc = (await payload
    .findByID({ collection: COLLECTION[referrer.kind], id: referrer.id, depth: 0, select: { name: true }, overrideAccess: true })
    .catch(() => null)) as { name?: string | null } | null
  return String(doc?.name ?? '').trim().split(/\s+/)[0] || null
}

/** Everything the Refer & earn page shows a logged-in account. */
export async function referPageData(kind: RunsKind, id: number | string) {
  const payload = await clientOr()
  const [account, settings, referrals] = await Promise.all([
    payload.findByID({ collection: COLLECTION[kind], id, depth: 0, select: { referralCode: true }, overrideAccess: true }) as Promise<{
      referralCode?: string | null
    }>,
    getRewardSettings(payload),
    getReferrals(kind, id, payload),
  ])
  const code = await ensureReferralCode(payload, kind, id, account.referralCode)
  return {
    referrals,
    links: await inviteLinks(code),
    runs: {
      small: settings.runsPer.referral_signup,
      client: settings.runsPer.referral,
      vendor: settings.runsPer.referral_vendor,
      welcome: settings.runsPer.welcome,
    },
    cap: settings.referralMonthlyCap,
  }
}

/** Records one person opening an invite link (once per browser per inviter). */
export async function recordReferralVisit(payload: Payload, referrerKey: string, visitor: string, audience: 'client' | 'vendor') {
  try {
    const where: Where = { and: [{ referrer: { equals: referrerKey } }, { visitor: { equals: visitor } }] }
    if ((await payload.count({ collection: 'referral-visits', where, overrideAccess: true })).totalDocs) return
    await payload.create({ collection: 'referral-visits', data: { referrer: referrerKey, visitor, audience }, overrideAccess: true })
  } catch {
    // The (referrer, visitor) unique index: already counted.
  }
}

/** "Captain · ₹2,500 off (1,620 runs)" — for staff quoting a lead. */
export async function tierSummary(payload: Payload, kind: RunsKind, id: number | string, req?: PayloadRequest) {
  const account = (await payload.findByID({
    collection: COLLECTION[kind],
    id,
    depth: 0,
    select: { runs: true },
    overrideAccess: true,
    req,
  })) as { runs?: number | null }
  const total = Number(account?.runs) || 0
  const { tier } = tierFor(total, tiersFor(await getRewardSettings(payload, req), kind))
  const off = tier.rupeesOff ? `₹${tier.rupeesOff.toLocaleString('en-IN')} off` : 'no discount yet'
  return `${tier.name} · ${off} (${total.toLocaleString('en-IN')} runs)`
}
