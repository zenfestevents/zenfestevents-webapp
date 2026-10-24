// Client-safe: the Runs club's types, defaults and tier maths. No Payload imports,
// so the Scorecard UI can use it. Server code (awards, settings) is lib/rewards.ts.
//
// Runs are loyalty points: earned for real actions, never bought, no cash value,
// nothing chance-based. A tier's ₹ off is honoured by staff when quoting.
// Cricket words stay generic — no league, team, player or stadium names.

/** `c` = couple (`customers`), `v` = vendor (`vendors`). */
export type RunsKind = 'c' | 'v'

export const RUNS_REASONS = [
  { value: 'joined', label: 'Joined the Runs club' },
  { value: 'profile', label: 'Finished the profile' },
  { value: 'enquiry', label: 'Planned an event with us' },
  { value: 'booking', label: 'Booked with Zenfest' },
  { value: 'referral', label: 'A client you invited booked' },
  { value: 'referral_signup', label: 'Someone you invited joined, applied or enquired' },
  { value: 'referral_vendor', label: 'A vendor you invited was approved or went live' },
  { value: 'welcome', label: 'Joined through an invite' },
  { value: 'listing_live', label: 'Listing went live' },
  { value: 'vendor_reply', label: 'Replied to an enquiry' },
  { value: 'vendor_booking', label: 'Booked through the marketplace' },
  { value: 'manual', label: 'Added by the Zenfest team' },
] as const

export type RunsReason = (typeof RUNS_REASONS)[number]['value']
/** Reasons the site awards by itself (everything but `manual`), each worth a set number of runs. */
export type AwardReason = Exclude<RunsReason, 'manual'>

export const AWARD_REASONS = RUNS_REASONS.map((r) => r.value).filter(
  (r): r is AwardReason => r !== 'manual',
)

export const reasonLabel = (reason: string) => RUNS_REASONS.find((r) => r.value === reason)?.label ?? reason

/** "How to score" for each kind of account, in the order the Scorecard and /rewards list them. */
export const SCORING: Record<RunsKind, { reason: AwardReason; label: string }[]> = {
  c: [
    { reason: 'joined', label: 'Join the Runs club' },
    { reason: 'profile', label: 'Add your city and event date' },
    { reason: 'enquiry', label: 'Plan an event with us (first enquiry)' },
    { reason: 'booking', label: 'Book an event with Zenfest' },
    { reason: 'referral_signup', label: 'Someone you invite joins, applies or enquires' },
    { reason: 'referral', label: 'A client you invite books' },
    { reason: 'referral_vendor', label: 'A vendor you invite is approved or goes live' },
    { reason: 'welcome', label: 'Join through a friend’s invite (welcome runs)' },
  ],
  v: [
    { reason: 'joined', label: 'Join the Runs club' },
    { reason: 'profile', label: 'Finish your business profile' },
    { reason: 'listing_live', label: 'Get your listing approved' },
    { reason: 'vendor_reply', label: 'Reply to a couple’s enquiry' },
    { reason: 'vendor_booking', label: 'Mark a marketplace booking' },
    { reason: 'referral_signup', label: 'Someone you invite joins, applies or enquires' },
    { reason: 'referral', label: 'A client you invite books' },
    { reason: 'referral_vendor', label: 'A vendor you invite is approved or goes live' },
    { reason: 'welcome', label: 'Join through a friend’s invite (welcome runs)' },
  ],
}

export type RewardTier = { name: string; minRuns: number; rupeesOff: number; perks: string }

export type RewardSettingsData = {
  runsPer: Record<AwardReason, number>
  referralMonthlyCap: number
  coupleTiers: RewardTier[]
  vendorTiers: RewardTier[]
}

export const DEFAULT_RUNS_PER: Record<AwardReason, number> = {
  joined: 50,
  profile: 50,
  enquiry: 100,
  booking: 1000,
  referral: 500,
  listing_live: 200,
  vendor_reply: 20,
  vendor_booking: 300,
  referral_signup: 25,
  referral_vendor: 300,
  welcome: 100,
}

/** At most this many `referral_signup` awards per inviter in any 30 days (so invites can't be farmed). */
export const DEFAULT_REFERRAL_MONTHLY_CAP = 10

export const DEFAULT_COUPLE_TIERS: RewardTier[] = [
  { name: 'Debut', minRuns: 0, rupeesOff: 0, perks: 'Welcome to the Runs club. Every booking and referral adds runs.' },
  { name: 'Opener', minRuns: 100, rupeesOff: 500, perks: '₹500 off your next Zenfest booking.' },
  { name: 'All-rounder', minRuns: 500, rupeesOff: 1000, perks: '₹1,000 off your next booking and a free planning call.' },
  { name: 'Captain', minRuns: 1500, rupeesOff: 2500, perks: '₹2,500 off your next booking and first pick of dates.' },
  { name: 'Hall of Fame', minRuns: 5000, rupeesOff: 5000, perks: '₹5,000 off your next booking and a surprise from the team on the day.' },
]

export const DEFAULT_VENDOR_TIERS: RewardTier[] = [
  { name: 'Net Bowler', minRuns: 0, rupeesOff: 0, perks: 'Welcome to the Runs club. Go live and reply to couples to earn runs.' },
  { name: 'First XI', minRuns: 300, rupeesOff: 0, perks: 'Tier badge on your listing.' },
  { name: 'Match Winner', minRuns: 1500, rupeesOff: 0, perks: 'Tier badge and first call when Zenfest needs a vendor in your area.' },
  { name: 'Player of the Series', minRuns: 5000, rupeesOff: 0, perks: 'Top tier badge and a spot in Zenfest’s vendor spotlight.' },
]

export const DEFAULT_REWARD_SETTINGS: RewardSettingsData = {
  runsPer: DEFAULT_RUNS_PER,
  referralMonthlyCap: DEFAULT_REFERRAL_MONTHLY_CAP,
  coupleTiers: DEFAULT_COUPLE_TIERS,
  vendorTiers: DEFAULT_VENDOR_TIERS,
}

export type TierStanding = {
  tier: RewardTier
  next: RewardTier | null
  /** 0–1 of the way from this tier to the next (1 at the top tier). */
  progress: number
  /** Runs still needed for the next tier (0 at the top tier). */
  toNext: number
}

/** Where `runs` sits in `tiers` (any order). Below the lowest tier counts as the lowest. */
export function tierFor(runs: number, tiers: RewardTier[]): TierStanding {
  const list = [...(tiers.length ? tiers : DEFAULT_COUPLE_TIERS)].sort((a, b) => a.minRuns - b.minRuns)
  const total = Math.max(0, Number(runs) || 0)
  let i = 0
  while (i + 1 < list.length && total >= list[i + 1].minRuns) i++
  const tier = list[i]
  const next = list[i + 1] ?? null
  if (!next) return { tier, next, progress: 1, toNext: 0 }
  const span = next.minRuns - tier.minRuns
  const progress = span > 0 ? Math.min(1, Math.max(0, (total - tier.minRuns) / span)) : 1
  return { tier, next, progress, toNext: Math.max(0, next.minRuns - total) }
}

export const tiersFor = (settings: RewardSettingsData, kind: RunsKind) =>
  kind === 'c' ? settings.coupleTiers : settings.vendorTiers

/** `c:12` / `v:7` — the account a Runs row belongs to. */
export const accountKey = (kind: RunsKind, id: number | string) => `${kind}:${id}`

export function parseAccountKey(key: unknown): { kind: RunsKind; id: number } | null {
  const m = /^([cv]):(\d+)$/.exec(String(key ?? ''))
  return m ? { kind: m[1] as RunsKind, id: Number(m[2]) } : null
}

/** Who an invite is for: a client (plans an event) or a vendor (joins Zenfest). */
export type InviteAudience = 'client' | 'vendor'

/** The share link that sets the referral cookie; vendor invites land on the vendor welcome. */
export const invitePath = (code: string, audience: InviteAudience = 'client') =>
  `/invite/${encodeURIComponent(code)}${audience === 'vendor' ? '?for=vendor' : ''}`

/** 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L). */
export const REFERRAL_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const isReferralCode = (code: unknown): code is string => /^[A-Z0-9]{8}$/.test(String(code ?? ''))
