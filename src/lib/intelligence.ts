// Server-only: the Zenfest Intelligence Hub's data (event news → Claude-checked → daily reel
// ideas), read from its own Postgres (the `zf_*` tables in the Supabase database it shares with
// the AI Hub). Shown only to the Owner at /admin/intelligence. Read-only: nothing here writes.
// The hub itself lives in D:\Zenfest Events Projects\zenfest-intelligence-hub; these queries are
// copied from its frontend/app/api/* routes, so keep the two in step when its tables change.
import { Pool } from 'pg'

let pool: Pool | null = null

export function intelConfigured(): boolean {
  return Boolean(process.env.INTEL_DATABASE_URL)
}

function db(): Pool {
  if (!pool) {
    let url = process.env.INTEL_DATABASE_URL
    if (!url) throw new Error('INTEL_DATABASE_URL is not set')
    // Serverless functions open many short connections: Supabase's transaction pooler (6543).
    url = url.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543')
    pool = new Pool({
      connectionString: url,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    })
  }
  return pool
}

// Must match the hub's backend/models.py.
export const REGIONS = ['All', 'Tamil Nadu', 'India', 'Global', 'East Asia', 'Middle East'] as const
export const CATEGORIES = [
  'All',
  'Wedding',
  'Family Function',
  'Décor & Design',
  'Event Tech',
  'Corporate & MICE',
  'Concerts & Festivals',
  'Culture & Celebrations',
  'Industry News',
  'Tips & Trends',
  'Viral Moment',
] as const
export const IDEA_STATUSES = ['All open', "Today's Pick", 'Idea Bank', 'Scripted', 'Posted', 'Outdated'] as const

// Hub constants (frontend/app/api/stats + queue routes). Source counts come from zf_sources.
const ACTIVE_WINDOW_MS = 3 * 60 * 60 * 1000
const MAX_ATTEMPTS = 3

export type IntelStats = {
  verified_last_24h: number
  ideas_open: number
  waiting_total: number
  apify_month_usd: number
  last_poll_at: string | null
  regions_7d: Record<string, number>
  sources_enabled: number
  instagram_targets: number
  stuck: number
  polling_active: boolean
}

export type SourceKind = 'rss' | 'search' | 'rsshub' | 'instagram_account' | 'instagram_hashtag'

export type IntelSource = {
  label: string
  region: string
  kind: SourceKind
  url: string
  enabled: boolean
  events_only: boolean
  scan_only: boolean
  note: string
  verified_7d: number
  verified_total: number
  last_found: string | null
  waiting: number
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  rss: 'News feed',
  search: 'News search',
  rsshub: 'Chinese site (RSSHub)',
  instagram_account: 'Instagram account',
  instagram_hashtag: 'Instagram hashtag',
}

export type ReelIdea = {
  id: string
  intel_id?: string | null
  idea_code: string | null
  title: string
  hook_idea: string | null
  outline: string | null
  source_name: string | null
  source_url: string | null
  date_found: string | null
  category: string | null
  region: string | null
  evergreen: boolean | null
  status: string
  total: number
  brand_note: string | null
}

export type IntelItem = {
  id: number
  title: string
  primary_category: string | null
  region: string | null
  summary: string | null
  exact_source_quote: string | null
  source_url: string
  source_label: string | null
  hook_idea: string | null
  hook_score: number | null
  relevance_score: number | null
  visual_score: number | null
  brand_note: string | null
  published_at: string | null
}

export type QueueData = {
  waiting: number
  stuck: number
  last_24h: number
  oldest: string | null
  sources: { source: string; count: number; newest: string | null }[]
  items: { id: number; title: string | null; source_label: string | null; source_url: string; published_at: string | null; attempts: number }[]
}

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null)

export async function getStats(): Promise<IntelStats> {
  const [{ rows }, regions] = await Promise.all([
    db().query(`
      SELECT
        (SELECT COUNT(*)::int FROM zf_intel_feed WHERE created_at >= NOW() - INTERVAL '24 hours') AS verified_last_24h,
        (SELECT COUNT(*)::int FROM zf_pending_articles) AS waiting_total,
        (SELECT COUNT(*)::int FROM zf_reel_ideas WHERE status IN ('Today''s Pick', 'Idea Bank')) AS ideas_open,
        (SELECT COALESCE(SUM(cost_usd), 0)::float FROM zf_apify_runs
           WHERE created_at >= date_trunc('month', NOW())) AS apify_month_usd,
        GREATEST(
          (SELECT MAX(created_at) FROM zf_intel_feed),
          (SELECT MAX(created_at) FROM zf_rejected_items),
          (SELECT MAX(created_at) FROM zf_pending_articles)
        ) AS last_poll_at,
        (SELECT COUNT(*)::int FROM zf_sources WHERE listed AND enabled AND kind NOT LIKE 'instagram%') AS sources_enabled,
        (SELECT COUNT(*)::int FROM zf_sources WHERE listed AND kind LIKE 'instagram%') AS instagram_targets,
        (SELECT COUNT(*)::int FROM zf_pending_articles WHERE attempts >= ${MAX_ATTEMPTS}) AS stuck
    `),
    db().query(
      `SELECT region, COUNT(*)::int AS count FROM zf_intel_feed
        WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY region`,
    ),
  ])
  const s = rows[0]
  const last = iso(s.last_poll_at)
  return {
    verified_last_24h: s.verified_last_24h,
    ideas_open: s.ideas_open,
    waiting_total: s.waiting_total,
    apify_month_usd: Number(s.apify_month_usd),
    last_poll_at: last,
    regions_7d: Object.fromEntries(regions.rows.map((r) => [r.region, r.count])),
    sources_enabled: s.sources_enabled,
    instagram_targets: s.instagram_targets,
    stuck: s.stuck,
    polling_active: Boolean(last) && Date.now() - new Date(last as string).getTime() < ACTIVE_WINDOW_MS,
  }
}

export async function getIdeas(status: string, region: string, limit = 60): Promise<ReelIdea[]> {
  const where: string[] = []
  const values: unknown[] = []
  if ((IDEA_STATUSES as readonly string[]).includes(status) && status !== 'All open') {
    values.push(status)
    where.push(`status = $${values.length}`)
  } else {
    where.push(`status <> 'Outdated'`)
  }
  if ((REGIONS as readonly string[]).includes(region) && region !== 'All') {
    values.push(region)
    where.push(`region = $${values.length}`)
  }
  values.push(limit)
  const { rows } = await db().query(
    `SELECT id, idea_code, title, hook_idea, outline, source_name, source_url, date_found::text AS date_found,
            category, region, evergreen, status, brand_note,
            (hook_score + relevance_score + visual_score + freshness_score) AS total
       FROM zf_reel_ideas
      WHERE ${where.join(' AND ')}
      ORDER BY (status = 'Today''s Pick') DESC, date_found DESC, total DESC
      LIMIT $${values.length}`,
    values,
  )
  return rows as ReelIdea[]
}

export async function getFeed(opts: { region: string; category: string; instagram: boolean; limit?: number }): Promise<IntelItem[]> {
  const where: string[] = []
  const values: unknown[] = []
  if ((REGIONS as readonly string[]).includes(opts.region) && opts.region !== 'All') {
    values.push(opts.region)
    where.push(`region = $${values.length}`)
  }
  if (!opts.instagram && (CATEGORIES as readonly string[]).includes(opts.category) && opts.category !== 'All') {
    values.push(opts.category)
    where.push(`primary_category = $${values.length}`)
  }
  if (opts.instagram) where.push(`source_label LIKE 'Instagram%'`)
  values.push(opts.limit ?? 60)
  const { rows } = await db().query(
    `SELECT id, title, primary_category, region, summary, exact_source_quote, source_url, source_label,
            hook_idea, hook_score, relevance_score, visual_score, brand_note, published_at
       FROM zf_intel_feed
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY published_at DESC
      LIMIT $${values.length}`,
    values,
  )
  return rows.map((r) => ({ ...r, published_at: iso(r.published_at) })) as IntelItem[]
}

/* ---------- the owner's feed (2026-11-18) ---------- */

export type FeedItem = {
  id: string
  region: string | null
  category: string | null
  source_label: string | null
  source_url: string
  published_at: string | null
  headline: string
  story: string
  example: string
  image_url: string
  hook_idea: string | null
  exact_source_quote: string | null
  brand_note: string | null
  scores: string
  reel: boolean
  revisit: boolean
}

export type FeedCursor = { at: string; id: string }
export type MarkKind = 'reel' | 'revisit'

export const FEED_PAGE = 20
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)

const FEED_COLUMNS = `
  f.id::text AS id, f.region, f.primary_category AS category, f.source_label, f.source_url, f.published_at,
  COALESCE(NULLIF(f.plain_headline, ''), f.title) AS headline,
  COALESCE(NULLIF(f.plain_story, ''), f.summary) AS story,
  f.example, f.image_url, f.hook_idea, f.exact_source_quote, f.brand_note,
  ('Hook ' || f.hook_score || '/5 · Fit ' || f.relevance_score || '/5 · Visual ' || f.visual_score || '/5') AS scores,
  EXISTS (SELECT 1 FROM zf_feed_marks m WHERE m.intel_id = f.id AND m.kind = 'reel') AS reel,
  EXISTS (SELECT 1 FROM zf_feed_marks m WHERE m.intel_id = f.id AND m.kind = 'revisit') AS revisit`

const feedRow = (r: Record<string, unknown>) => ({ ...r, published_at: iso(r.published_at) }) as FeedItem

/** Newest first, FEED_PAGE at a time. `cursor` = the last card shown (published_at + id). */
export async function getFeedPage(region: string, cursor?: FeedCursor | null): Promise<{ items: FeedItem[]; next: FeedCursor | null }> {
  const where: string[] = []
  const values: unknown[] = []
  if ((REGIONS as readonly string[]).includes(region) && region !== 'All') {
    values.push(region)
    where.push(`f.region = $${values.length}`)
  }
  if (cursor && isUuid(cursor.id) && !Number.isNaN(Date.parse(cursor.at))) {
    values.push(cursor.at, cursor.id)
    where.push(`(f.published_at, f.id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`)
  }
  values.push(FEED_PAGE)
  const { rows } = await db().query(
    `SELECT ${FEED_COLUMNS} FROM zf_intel_feed f
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY f.published_at DESC, f.id DESC
      LIMIT $${values.length}`,
    values,
  )
  const items = rows.map(feedRow)
  const last = items[items.length - 1]
  return { items, next: items.length === FEED_PAGE && last?.published_at ? { at: last.published_at, id: last.id } : null }
}

/** Cards the owner marked with `kind`, newest mark first. */
export async function getMarked(kind: MarkKind): Promise<FeedItem[]> {
  const { rows } = await db().query(
    `SELECT ${FEED_COLUMNS} FROM zf_intel_feed f
       JOIN zf_feed_marks k ON k.intel_id = f.id AND k.kind = $1
      ORDER BY k.created_at DESC
      LIMIT 300`,
    [kind],
  )
  return rows.map(feedRow)
}

/** Turn a card button on or off. Returns the new state. */
export async function setMark(intelId: string, kind: MarkKind, on: boolean): Promise<boolean> {
  if (!isUuid(intelId) || (kind !== 'reel' && kind !== 'revisit')) throw new Error('Bad mark')
  if (on) {
    await db().query(
      `INSERT INTO zf_feed_marks (intel_id, kind) SELECT id, $2 FROM zf_intel_feed WHERE id = $1::uuid
       ON CONFLICT DO NOTHING`,
      [intelId, kind],
    )
  } else {
    await db().query(`DELETE FROM zf_feed_marks WHERE intel_id = $1::uuid AND kind = $2`, [intelId, kind])
  }
  return on
}

/** Reel ideas the morning job made from the owner's picks (zf_reel_ideas.picked). */
export async function getPickedIdeas(): Promise<ReelIdea[]> {
  const { rows } = await db().query(
    `SELECT id, idea_code, title, hook_idea, outline, source_name, source_url, date_found::text AS date_found,
            category, region, evergreen, status, brand_note, intel_id::text AS intel_id,
            (hook_score + relevance_score + visual_score + freshness_score) AS total
       FROM zf_reel_ideas WHERE picked ORDER BY date_found DESC, idea_code DESC LIMIT 200`,
  )
  return rows as ReelIdea[]
}

/** Every source in feeds.py (zf_sources, written by the hub each run) with what it brought in. */
export async function getSources(): Promise<IntelSource[]> {
  const { rows } = await db().query(
    `SELECT s.label, s.region, s.kind, s.url, s.enabled, s.events_only, s.scan_only, s.note,
            COALESCE(f.verified_7d, 0)::int AS verified_7d,
            COALESCE(f.verified_total, 0)::int AS verified_total,
            GREATEST(f.last_found, p.last_found) AS last_found,
            COALESCE(p.waiting, 0)::int AS waiting
       FROM zf_sources s
       LEFT JOIN (SELECT source_label,
                         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS verified_7d,
                         COUNT(*) AS verified_total,
                         MAX(published_at) AS last_found
                    FROM zf_intel_feed GROUP BY source_label) f ON f.source_label = s.label
       LEFT JOIN (SELECT source_label, COUNT(*) AS waiting, MAX(published_at) AS last_found
                    FROM zf_pending_articles GROUP BY source_label) p ON p.source_label = s.label
      WHERE s.listed
      ORDER BY s.region, s.enabled DESC, s.label`,
  )
  return rows.map((r) => ({ ...r, last_found: iso(r.last_found) })) as IntelSource[]
}

export async function getQueue(source: string, limit: number): Promise<QueueData> {
  const one = source && source !== 'All'
  const [sources, totals, items] = await Promise.all([
    db().query(
      `SELECT source_label AS source, COUNT(*)::int AS count, MAX(published_at) AS newest
         FROM zf_pending_articles GROUP BY source_label ORDER BY count DESC, source_label`,
    ),
    db().query(
      `SELECT COUNT(*)::int AS waiting,
              COUNT(*) FILTER (WHERE attempts >= $1)::int AS stuck,
              COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '24 hours')::int AS last_24h,
              MIN(published_at) AS oldest
         FROM zf_pending_articles`,
      [MAX_ATTEMPTS],
    ),
    one
      ? db().query(
          `SELECT id, title, source_label, source_url, published_at, attempts
             FROM zf_pending_articles WHERE source_label = $1
            ORDER BY published_at DESC LIMIT $2`,
          [source, limit],
        )
      : db().query(
          `SELECT id, title, source_label, source_url, published_at, attempts
             FROM zf_pending_articles ORDER BY published_at DESC LIMIT $1`,
          [limit],
        ),
  ])
  const t = totals.rows[0]
  return {
    waiting: t.waiting,
    stuck: t.stuck,
    last_24h: t.last_24h,
    oldest: iso(t.oldest),
    sources: sources.rows.map((s) => ({ ...s, newest: iso(s.newest) })),
    items: items.rows.map((i) => ({ ...i, published_at: iso(i.published_at) })),
  }
}
