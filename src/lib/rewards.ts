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
  const settings: RewardSettingsData = {
    runsPer,
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

/** Everything the dashboards' Scorecard tab (components/market/Scorecard.tsx) takes. */
export async function scorecardProps(kind: RunsKind, id: number | string) {
  const payload = await clientOr()
  const [card, settings] = await Promise.all([getScorecard(kind, id, payload), getRewardSettings(payload)])
  const { siteUrl } = await import('./marketplaceMail')
  return {
    card,
    inviteUrl: card.invitePath ? `${siteUrl()}${card.invitePath}` : null,
    scoring: SCORING[kind]
      .map((s) => ({ label: s.label, runs: settings.runsPer[s.reason] }))
      .filter((s) => s.runs > 0),
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
