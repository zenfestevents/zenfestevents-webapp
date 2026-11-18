import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import {
  CATEGORIES,
  IDEA_STATUSES,
  REGIONS,
  SOURCE_KIND_LABEL,
  getFeed,
  getIdeas,
  getQueue,
  getSources,
  getStats,
  type IntelItem,
  type IntelSource,
  type IntelStats,
  type QueueData,
  type ReelIdea,
} from '../../../lib/intelligence'
import {
  BASE,
  Chips,
  DbError,
  Footnote,
  IdeaRow,
  IntelShell,
  NewsRow,
  Notice,
  PickCard,
  type SP,
  dayLabel,
  hostOf,
  one,
  safeUrl,
  timeAgo,
  withQuery,
} from './parts'

/**
 * The Intelligence Hub admin pages (registered in payload.config.ts → admin.components.views):
 * Today (/admin/intelligence), Reel ideas, News and Sources. Team-wide, read-only (2026-11-18).
 */

const QUIET_DAYS = 14
const pick = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback
const regionOptions = REGIONS.map((r) => ({ value: r, label: r }))

async function load<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    console.error('Intelligence Hub:', (err as Error).message)
    return { ok: false }
  }
}

function Stats({ items }: { items: [string, React.ReactNode, boolean?][] }) {
  return (
    <dl className="zf-intel__stats">
      {items.map(([name, value, warn]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd className={warn ? 'is-warn' : undefined}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Warnings only when something needs attention. */
function Health({ stats }: { stats: IntelStats }) {
  const warnings: string[] = []
  if (!stats.polling_active) warnings.push(`Collecting looks stopped: nothing new since ${timeAgo(stats.last_poll_at)}.`)
  if (stats.apify_month_usd > 4.5) warnings.push(`Apify has used $${stats.apify_month_usd.toFixed(2)} of the free $5 this month.`)
  if (stats.stuck > 0) warnings.push(`${stats.stuck} waiting item(s) failed 3 times and are skipped.`)
  if (warnings.length === 0) return null
  return (
    <div className="zf-intel__warn" role="status">
      {warnings.map((w) => (
        <p key={w}>⚠ {w}</p>
      ))}
    </div>
  )
}

/* ---------------- Today ---------------- */

async function TodayBody() {
  const res = await load(() => Promise.all([getStats(), getIdeas('All open', 'All', 6), getFeed({ region: 'All', category: 'All', instagram: false, limit: 5 })]))
  if (!res.ok) return <DbError />
  const [stats, ideas, news] = res.data
  const top = ideas[0]?.status === "Today's Pick" ? ideas[0] : null
  const rest = (top ? ideas.slice(1) : ideas).slice(0, 5)
  return (
    <>
      <Health stats={stats} />
      <Stats
        items={[
          ['New stories (24 h)', stats.verified_last_24h],
          ['Open ideas', stats.ideas_open],
          ['Waiting to be read', stats.waiting_total],
          ['Last check', timeAgo(stats.last_poll_at)],
        ]}
      />
      {top ? <PickCard idea={top} /> : <Notice title="No Today’s Pick yet">The morning idea run marks one each day.</Notice>}
      <section className="zf-intel__section">
        <div className="zf-intel__section-head">
          <h2>Next ideas</h2>
          <Link href={`${BASE}/ideas`}>All reel ideas →</Link>
        </div>
        <div className="zf-intel__list">
          {rest.map((idea) => (
            <IdeaRow key={idea.id} idea={idea} />
          ))}
        </div>
      </section>
      <section className="zf-intel__section">
        <div className="zf-intel__section-head">
          <h2>Latest news</h2>
          <Link href={`${BASE}/news`}>All news →</Link>
        </div>
        <div className="zf-intel__list">
          {news.map((item) => (
            <NewsRow key={item.id} item={item} />
          ))}
        </div>
      </section>
      <p className="zf-intel__muted">
        Last 7 days by region:{' '}
        {REGIONS.slice(1)
          .map((r) => `${r} ${stats.regions_7d[r] ?? 0}`)
          .join(' · ')}
      </p>
      <Footnote />
    </>
  )
}

export function TodayView(props: AdminViewServerProps) {
  return (
    <IntelShell
      props={props}
      active="today"
      intro="Event news from Tamil Nadu, India and the world, turned into reel ideas every morning. Nothing is produced until the owner approves a script."
    >
      <TodayBody />
    </IntelShell>
  )
}

/* ---------------- Reel ideas ---------------- */

async function IdeasBody({ sp }: { sp: SP }) {
  const status = pick(one(sp.status), IDEA_STATUSES, 'All open')
  const region = pick(one(sp.region), REGIONS, 'All')
  const res = await load(() => getIdeas(status, region, 150))
  if (!res.ok) return <DbError />
  const link = (q: Record<string, string>) => withQuery(`${BASE}/ideas`, { status, region, ...q })
  return (
    <>
      <Chips
        label="Status"
        options={IDEA_STATUSES.map((s) => ({ value: s, label: s === 'All open' ? 'Open' : s }))}
        value={status}
        link={(v) => link({ status: v === 'All open' ? '' : v })}
      />
      <Chips label="Region" options={regionOptions} value={region} link={(v) => link({ region: v })} />
      {res.data.length === 0 ? (
        <Notice title="No ideas here">The daily idea run adds 7–8 every morning.</Notice>
      ) : (
        <div className="zf-intel__list">
          {res.data.map((idea: ReelIdea) => (
            <IdeaRow key={idea.id} idea={idea} />
          ))}
        </div>
      )}
      <Footnote />
    </>
  )
}

export function IdeasView(props: AdminViewServerProps) {
  return (
    <IntelShell props={props} active="ideas" intro="Tap an idea to open its hook, outline and brand check. The number is its score out of 20.">
      <IdeasBody sp={(props.searchParams ?? {}) as SP} />
    </IntelShell>
  )
}

/* ---------------- News ---------------- */

async function NewsBody({ sp }: { sp: SP }) {
  const type = one(sp.type) === 'instagram' ? 'instagram' : 'news'
  const region = pick(one(sp.region), REGIONS, 'All')
  const category = type === 'news' ? pick(one(sp.category), CATEGORIES, 'All') : 'All'
  const res = await load(() => getFeed({ region, category, instagram: type === 'instagram', limit: 120 }))
  if (!res.ok) return <DbError />
  const link = (q: Record<string, string>) => withQuery(`${BASE}/news`, { type: type === 'news' ? '' : type, region, category, ...q })

  const days: { label: string; items: IntelItem[] }[] = []
  for (const item of res.data) {
    const label = dayLabel(item.published_at)
    const last = days[days.length - 1]
    if (last && last.label === label) last.items.push(item)
    else days.push({ label, items: [item] })
  }

  return (
    <>
      <Chips
        label="Type"
        options={[
          { value: 'news', label: 'News' },
          { value: 'instagram', label: 'Instagram' },
        ]}
        value={type}
        link={(v) => withQuery(`${BASE}/news`, { type: v === 'news' ? '' : v, region })}
      />
      <Chips label="Region" options={regionOptions} value={region} link={(v) => link({ region: v })} />
      {type === 'news' && (
        <details className="zf-intel__more-filters" open={category !== 'All'}>
          <summary>Topic{category !== 'All' ? `: ${category}` : ''}</summary>
          <Chips label="Topic" options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={category} link={(v) => link({ category: v })} />
        </details>
      )}
      {days.length === 0 ? (
        <Notice title="Nothing here yet">New stories appear after the daily Claude run.</Notice>
      ) : (
        days.map((d) => (
          <section key={d.label} className="zf-intel__section">
            <h2 className="zf-intel__day">
              {d.label} <span>{d.items.length}</span>
            </h2>
            <div className="zf-intel__list">
              {d.items.map((item) => (
                <NewsRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))
      )}
      {type === 'instagram' && <p className="zf-intel__muted">Ideas only: never repost anyone’s photos or videos.</p>}
      <Footnote />
    </>
  )
}

export function NewsView(props: AdminViewServerProps) {
  return (
    <IntelShell props={props} active="news" intro="Stories Claude has read and checked, newest first. Tap one for the summary, reel hook and the quote found in the source.">
      <NewsBody sp={(props.searchParams ?? {}) as SP} />
    </IntelShell>
  )
}

/* ---------------- Sources ---------------- */

const SHOW = [
  { value: 'All', label: 'All' },
  { value: 'active', label: 'Bringing stories' },
  { value: 'quiet', label: `Quiet (${QUIET_DAYS} days)` },
  { value: 'off', label: 'Switched off' },
] as const

function isQuiet(s: IntelSource): boolean {
  if (!s.enabled || s.scan_only) return false
  return !s.last_found || Date.now() - new Date(s.last_found).getTime() > QUIET_DAYS * 86400000
}

function WaitingPanel({ data, source, link }: { data: QueueData; source: string; link: (q: Record<string, string>) => string }) {
  return (
    <section className="zf-intel__section zf-intel__waiting">
      <div className="zf-intel__section-head">
        <h2>
          Waiting to be read: {source === 'All' ? 'all sources' : source} ({data.items.length})
        </h2>
        <Link href={link({ waiting: '' })} scroll={false}>
          Close ×
        </Link>
      </div>
      <p className="zf-intel__muted">Fetched but not yet read by the morning Claude run, so not checked yet.</p>
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
              <span className="zf-intel__muted">
                {source === 'All' ? `${item.source_label} · ` : ''}
                {timeAgo(item.published_at)}
                {item.attempts > 0 && ` · try ${item.attempts}`}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

async function SourcesBody({ sp }: { sp: SP }) {
  const show = pick(one(sp.show), SHOW.map((s) => s.value), 'All')
  const region = pick(one(sp.region), REGIONS, 'All')
  const waiting = one(sp.waiting).slice(0, 120)
  const res = await load(() => Promise.all([getSources(), waiting ? getQueue(waiting, 200) : Promise.resolve(null)]))
  if (!res.ok) return <DbError />
  const [all, queue] = res.data
  const link = (q: Record<string, string>) => withQuery(`${BASE}/sources`, { show, region, waiting, ...q })

  const counts = {
    feeds: all.filter((s) => s.enabled && !s.kind.startsWith('instagram')).length,
    insta: all.filter((s) => s.kind.startsWith('instagram')).length,
    quiet: all.filter(isQuiet).length,
    off: all.filter((s) => !s.enabled).length,
    waiting: all.reduce((n, s) => n + s.waiting, 0),
  }
  const shown = all.filter(
    (s) =>
      (region === 'All' || s.region === region) &&
      (show === 'All' ||
        (show === 'off' && !s.enabled) ||
        (show === 'quiet' && isQuiet(s)) ||
        (show === 'active' && s.enabled && !isQuiet(s))),
  )
  const groups = REGIONS.slice(1)
    .map((r) => ({ region: r, items: shown.filter((s) => s.region === r) }))
    .filter((g) => g.items.length > 0)

  return (
    <>
      <Stats
        items={[
          ['News sources on', counts.feeds],
          ['Instagram pages & tags', counts.insta],
          ['Quiet for 14 days', counts.quiet, counts.quiet > 0],
          [
            'Waiting to be read',
            <Link key="w" href={link({ waiting: 'All' })} scroll={false}>
              {counts.waiting}
            </Link>,
          ],
        ]}
      />
      {queue && <WaitingPanel data={queue} source={waiting} link={link} />}
      <Chips
        label="Show"
        options={SHOW.map((s) => ({ ...s, count: s.value === 'quiet' ? counts.quiet : s.value === 'off' ? counts.off : undefined }))}
        value={show}
        link={(v) => link({ show: v })}
      />
      <Chips label="Region" options={regionOptions} value={region} link={(v) => link({ region: v })} />
      {groups.length === 0 && <Notice title="No sources match" />}
      {groups.map((g) => (
        <section key={g.region} className="zf-intel__section">
          <h2 className="zf-intel__day">
            {g.region} <span>{g.items.length}</span>
          </h2>
          <div className="zf-intel__sources" role="table" aria-label={`${g.region} sources`}>
            <div className="zf-intel__src is-head" role="row">
              <span role="columnheader" className="zf-intel__src-name">
                Source
              </span>
              <span role="columnheader">Last story</span>
              <span role="columnheader">Checked, 7 days</span>
              <span role="columnheader">Waiting</span>
            </div>
            {g.items.map((s) => {
              const href = safeUrl(s.url)
              return (
                <div key={s.label} role="row" className={`zf-intel__src${s.enabled ? '' : ' is-off'}${isQuiet(s) ? ' is-quiet' : ''}`}>
                  <span role="cell" className="zf-intel__src-name">
                    <strong>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{s.label} ↗</a> : s.label}</strong>
                    <span className="zf-intel__muted">
                      {SOURCE_KIND_LABEL[s.kind] ?? s.kind}
                      {!s.enabled && ' · off'}
                      {s.events_only && ' · event stories only'}
                      {s.scan_only && ' · headline list only'}
                      {s.note && ` · ${s.note}`}
                    </span>
                  </span>
                  <span role="cell" data-label="Last story">
                    {s.last_found ? timeAgo(s.last_found) : '—'}
                  </span>
                  <span role="cell" data-label="Checked, 7 days">
                    {s.verified_7d}
                  </span>
                  <span role="cell" data-label="Waiting">
                    {s.waiting > 0 ? (
                      <Link href={link({ waiting: s.label })} scroll={false}>
                        {s.waiting}
                      </Link>
                    ) : (
                      0
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <p className="zf-intel__foot">
        This list is copied from the hub’s feeds.py every 30 minutes. To add or switch off a source, change it there.
        Not used on purpose: LinkedIn (its rules ban scraping), Reddit, Douyin / Xiaohongshu / Weibo.
      </p>
    </>
  )
}

export function SourcesView(props: AdminViewServerProps) {
  return (
    <IntelShell props={props} active="sources" intro="Every source the hub collects from, and what each one is bringing in.">
      <SourcesBody sp={(props.searchParams ?? {}) as SP} />
    </IntelShell>
  )
}
