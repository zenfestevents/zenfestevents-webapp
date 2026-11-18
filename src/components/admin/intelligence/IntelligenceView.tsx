import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { isOwner } from '../../../access/roles'
import {
  CATEGORIES,
  IDEA_STATUSES,
  REGIONS,
  getFeed,
  getIdeas,
  getQueue,
  getStats,
  intelConfigured,
  type IntelItem,
  type IntelStats,
  type QueueData,
  type ReelIdea,
} from '../../../lib/intelligence'

/**
 * /admin/intelligence (payload.config.ts → admin.components.views): the Zenfest Intelligence
 * Hub's dashboard (event news → Claude-checked → daily reel ideas), **Owner only** (owner,
 * 2026-11-18). Everything is read on the server per request and drawn without client JS, so no
 * data route exists for anyone else to call. Filters are plain links (`?tab=…&region=…`).
 */

const BASE = '/admin/intelligence'
const TABS = [
  { id: 'ideas', label: 'Reel ideas' },
  { id: 'feed', label: 'Live feed' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'queue', label: 'Waiting queue' },
] as const
type Tab = (typeof TABS)[number]['id']
const QUEUE_PAGE = 100

type Params = Record<string, string>

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

function href(current: Params, change: Params): string {
  const next = { ...current, ...change }
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(next)) if (v && v !== 'All' && v !== 'All open') qs.set(k, v)
  const s = qs.toString()
  return s ? `${BASE}?${s}` : BASE
}

function timeAgo(value: string | null): string {
  if (!value) return 'never'
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return `${Math.floor(seconds / 86400)} d ago`
}

/** Feed links come from outside sources: allow only http(s). */
function safeUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/* ---------- building blocks ---------- */

function Filter({ label, options, value, param, current }: { label: string; options: readonly string[]; value: string; param: string; current: Params }) {
  return (
    <div className="zf-intel__filter" role="group" aria-label={label}>
      <span className="zf-intel__label">{label}</span>
      {options.map((opt) => (
        <Link
          key={opt}
          href={href(current, { [param]: opt, limit: '' })}
          aria-current={value === opt ? 'true' : undefined}
          className="zf-intel__chip"
          scroll={false}
        >
          {opt}
        </Link>
      ))}
    </div>
  )
}

function Notice({ title, children, alert = false }: { title: string; children?: React.ReactNode; alert?: boolean }) {
  return (
    <div className={`zf-intel__notice${alert ? ' is-alert' : ''}`} role={alert ? 'alert' : 'status'}>
      <p className="zf-intel__notice-title">{title}</p>
      {children && <p>{children}</p>}
    </div>
  )
}

function Source({ url, label }: { url: string | null; label: string | null }) {
  const safe = safeUrl(url)
  if (!safe) return null
  return (
    <a className="zf-intel__source" href={safe} target="_blank" rel="noopener noreferrer">
      {label || hostOf(safe)} ↗
    </a>
  )
}

function BrandNote({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="zf-intel__brand">
      <span aria-hidden="true">⚠</span> {text}
    </p>
  )
}

function IdeaCard({ idea }: { idea: ReelIdea }) {
  const pick = idea.status === "Today's Pick"
  return (
    <article className={`zf-intel__card${pick ? ' is-pick' : ''}`}>
      <header className="zf-intel__card-head">
        <p className="zf-intel__label is-gold">
          {pick ? "Today's pick · " : ''}
          {idea.region} · {idea.category || 'Idea'}
        </p>
        <p className="zf-intel__label">
          {idea.idea_code} · <strong>{idea.total}/20</strong>
        </p>
      </header>
      <h3>{idea.title}</h3>
      {idea.hook_idea && <p className="zf-intel__hook">{idea.hook_idea}</p>}
      {idea.outline && <p className="zf-intel__outline">{idea.outline}</p>}
      <BrandNote text={idea.brand_note} />
      <footer className="zf-intel__card-foot">
        <span className="zf-intel__label">
          {idea.status} · found {idea.date_found?.slice(0, 10)}
          {idea.evergreen ? ' · evergreen' : ''}
        </span>
        <Source url={idea.source_url} label={idea.source_name} />
      </footer>
    </article>
  )
}

function IntelCard({ item }: { item: IntelItem }) {
  return (
    <article className="zf-intel__card">
      <header className="zf-intel__card-head">
        <p className="zf-intel__label is-gold">
          {item.region} · {item.primary_category}
        </p>
        <p className="zf-intel__label">{timeAgo(item.published_at)}</p>
      </header>
      <h3>{item.title}</h3>
      {item.summary && <p className="zf-intel__outline">{item.summary}</p>}
      {item.hook_idea && (
        <p className="zf-intel__hook">
          <span className="zf-intel__label is-gold">Reel hook</span>
          {item.hook_idea}
        </p>
      )}
      {item.exact_source_quote && (
        <figure className="zf-intel__quote">
          <figcaption>✓ Quote found in source</figcaption>
          <blockquote>“{item.exact_source_quote}”</blockquote>
        </figure>
      )}
      <BrandNote text={item.brand_note} />
      <footer className="zf-intel__card-foot">
        <span className="zf-intel__label">
          Hook <strong>{item.hook_score}/5</strong> · Fit <strong>{item.relevance_score}/5</strong> · Visual{' '}
          <strong>{item.visual_score}/5</strong>
        </span>
        <Source url={item.source_url} label={item.source_label} />
      </footer>
    </article>
  )
}

function Cards<T extends { id: number }>({ items, empty, render }: { items: T[]; empty: string; render: (x: T) => React.ReactNode }) {
  if (items.length === 0) return <Notice title="Nothing here yet">{empty}</Notice>
  return <div className="zf-intel__grid">{items.map(render)}</div>
}

function Queue({ data, source, limit, current }: { data: QueueData; source: string; limit: number; current: Params }) {
  if (data.waiting === 0) return <Notice title="Queue is empty">Every fetched article has been summarised or rejected.</Notice>
  const shownTotal = source === 'All' ? data.waiting : (data.sources.find((s) => s.source === source)?.count ?? 0)
  const summary: [string, string | number, boolean?][] = [
    ['Waiting', data.waiting],
    ['Sources waiting', data.sources.length],
    ['Published in last 24h', data.last_24h],
    ['Stuck (3 failed tries)', data.stuck, data.stuck > 0],
    ['Oldest item', timeAgo(data.oldest)],
  ]
  return (
    <div className="zf-intel__stack">
      <p className="zf-intel__intro">
        Articles and Instagram posts fetched but not yet read by the daily Claude run. They are not checked and have no
        summary yet.
      </p>
      <dl className="zf-intel__stats is-five">
        {summary.map(([name, value, warn]) => (
          <div key={name}>
            <dt className="zf-intel__label">{name}</dt>
            <dd className={warn ? 'is-warn' : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h2 className="zf-intel__label">By source</h2>
        <div className="zf-intel__sources">
          {[{ source: 'All', count: data.waiting, newest: null as string | null }, ...data.sources].map((s) => (
            <Link
              key={s.source}
              href={href(current, { source: s.source, limit: '' })}
              aria-current={source === s.source ? 'true' : undefined}
              scroll={false}
            >
              <span>
                <span className="zf-intel__source-name">{s.source === 'All' ? 'All sources' : s.source}</span>
                {s.newest && <span className="zf-intel__label">newest {timeAgo(s.newest)}</span>}
              </span>
              <strong>{s.count}</strong>
            </Link>
          ))}
        </div>
      </div>
      <div>
        <h2 className="zf-intel__label">
          {source === 'All' ? 'All sources' : source}, newest first ({Math.min(data.items.length, shownTotal)} of {shownTotal})
        </h2>
        <ol className="zf-intel__queue">
          {data.items.map((item) => {
            const safe = safeUrl(item.source_url)
            return (
              <li key={item.id}>
                {safe ? (
                  <a href={safe} target="_blank" rel="noopener noreferrer">
                    {item.title || hostOf(safe)}
                  </a>
                ) : (
                  <span>{item.title}</span>
                )}
                <span className="zf-intel__label">{item.source_label}</span>
                <span className="zf-intel__label">
                  {timeAgo(item.published_at)}
                  {item.attempts > 0 && <em> try {item.attempts}</em>}
                </span>
              </li>
            )
          })}
        </ol>
        {data.items.length < shownTotal && limit < 500 && (
          <p className="zf-intel__more">
            <Link href={href(current, { limit: String(Math.min(500, limit + QUEUE_PAGE)) })} scroll={false}>
              Show more
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

function Telemetry({ stats }: { stats: IntelStats }) {
  const rows: [string, string | number, boolean?][] = [
    ['Polling', stats.polling_active ? 'On' : 'Off', !stats.polling_active],
    ['Verified 24h', stats.verified_last_24h],
    ['Open ideas', stats.ideas_open],
    ['Waiting', stats.waiting_total],
    ['Sources', `${stats.sources_enabled} + ${stats.instagram_targets} IG`],
    ['Apify this month', `$${stats.apify_month_usd.toFixed(2)} / $5`, stats.apify_month_usd > 4.5],
    ['Last poll', timeAgo(stats.last_poll_at)],
  ]
  return (
    <>
      <dl className="zf-intel__stats" aria-label="System status">
        {rows.map(([name, value, warn]) => (
          <div key={name}>
            <dt className="zf-intel__label">{name}</dt>
            <dd className={warn ? 'is-warn' : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="zf-intel__label">
        Last 7 days by region:{' '}
        {REGIONS.slice(1)
          .map((r) => `${r} ${stats.regions_7d[r] ?? 0}`)
          .join(' · ')}
      </p>
    </>
  )
}

async function Body({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const tabParam = one(sp.tab)
  const tab: Tab = (TABS.some((t) => t.id === tabParam) ? tabParam : 'ideas') as Tab
  const status = (IDEA_STATUSES as readonly string[]).includes(one(sp.status)) ? one(sp.status) : 'All open'
  const region = (REGIONS as readonly string[]).includes(one(sp.region)) ? one(sp.region) : 'All'
  const category = (CATEGORIES as readonly string[]).includes(one(sp.category)) ? one(sp.category) : 'All'
  const source = one(sp.source).slice(0, 200) || 'All'
  const limitNum = Number.parseInt(one(sp.limit), 10)
  const limit = Number.isNaN(limitNum) ? QUEUE_PAGE : Math.min(500, Math.max(1, limitNum))
  const current: Params = { tab, status, region, category, source, limit: one(sp.limit) }

  let stats: IntelStats
  let data: ReelIdea[] | IntelItem[] | QueueData
  try {
    ;[stats, data] = await Promise.all([
      getStats(),
      tab === 'ideas'
        ? getIdeas(status, region)
        : tab === 'feed'
          ? getFeed({ region, category, instagram: false })
          : tab === 'instagram'
            ? getFeed({ region, category, instagram: true, limit: 120 })
            : getQueue(source, limit),
    ])
  } catch (err) {
    console.error('Intelligence Hub:', (err as Error).message)
    return (
      <Notice title="Cannot reach the Intelligence Hub database" alert>
        The hub’s data could not be loaded. Check INTEL_DATABASE_URL in the environment, then reload.
      </Notice>
    )
  }

  let content: React.ReactNode
  {
    if (tab === 'ideas') {
      content = (
        <>
          <p className="zf-intel__intro">
            Every morning Claude picks a mix of ideas (Tamil Nadu, India and the world) from the verified news and marks
            one Today’s Pick. Nothing is produced until the owner approves a script.
          </p>
          <Filter label="Status" options={IDEA_STATUSES} value={status} param="status" current={current} />
          <Filter label="Region" options={REGIONS} value={region} param="region" current={current} />
          <Cards
            items={data as ReelIdea[]}
            empty="No ideas match. The daily idea run adds 7-8 every morning."
            render={(idea) => <IdeaCard key={idea.id} idea={idea} />}
          />
        </>
      )
    } else if (tab === 'feed') {
      content = (
        <>
          <Filter label="Region" options={REGIONS} value={region} param="region" current={current} />
          <Filter label="Category" options={CATEGORIES} value={category} param="category" current={current} />
          <Cards
            items={data as IntelItem[]}
            empty="No verified items match yet. New items appear after the daily Claude run."
            render={(item) => <IntelCard key={item.id} item={item} />}
          />
        </>
      )
    } else if (tab === 'instagram') {
      content = (
        <>
          <p className="zf-intel__intro">
            Verified posts from the Instagram pages and hashtags we follow (read through Apify inside the free $5 a
            month). Ideas only: never repost anyone’s photos or videos.
          </p>
          <Filter label="Region" options={REGIONS} value={region} param="region" current={current} />
          <Cards
            items={data as IntelItem[]}
            empty="No Instagram posts verified yet. Accounts run every 2 days, hashtags on Mondays."
            render={(item) => <IntelCard key={item.id} item={item} />}
          />
        </>
      )
    } else {
      content = <Queue data={data as QueueData} source={source} limit={limit} current={current} />
    }
  }

  return (
    <>
      <Telemetry stats={stats} />
      <nav className="zf-intel__tabs" aria-label="Sections">
        {TABS.map((t, i) => (
          <Link
            key={t.id}
            href={href({}, { tab: t.id === 'ideas' ? '' : t.id })}
            aria-current={tab === t.id ? 'page' : undefined}
            scroll={false}
          >
            <span>0{i + 1}</span>
            {t.label}
          </Link>
        ))}
      </nav>
      <section className="zf-intel__stack">{content}</section>
    </>
  )
}

export async function IntelligenceView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const owner = isOwner(req.user as never)
  const sp = (searchParams ?? {}) as Record<string, string | string[] | undefined>
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user || undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <div className="zf-intel">
          <header className="zf-intel__head">
            <p className="zf-intel__label">Zenfest Events · Tamil Nadu · Content desk</p>
            <h1>
              Intelligence <span>Hub</span>
            </h1>
            {owner && (
              <p>
                Event news from Tamil Nadu, India and the world (East Asia and the Gulf too), turned into daily reel
                ideas. An item is shown only if its quoted sentence is found, word for word, in the page it came from.
                Reload the page for the latest.
              </p>
            )}
          </header>
          {!owner ? (
            <Notice title="Owner only">This page is open only to the Owner.</Notice>
          ) : !intelConfigured() ? (
            <Notice title="Not connected yet" alert>
              Set INTEL_DATABASE_URL (the Intelligence Hub’s database address) in the environment to show the hub here.
            </Notice>
          ) : (
            <Body sp={sp} />
          )}
          {owner && (
            <footer className="zf-intel__label zf-intel__foot">
              The quote check confirms the quote exists in the source. Titles, summaries and hooks are written by Claude:
              open the source before using a fact in a reel.
            </footer>
          )}
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
