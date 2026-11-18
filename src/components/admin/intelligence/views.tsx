import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import {
  IDEA_STATUSES,
  REGIONS,
  SOURCE_KIND_LABEL,
  getFeedPage,
  getIdeas,
  getMarked,
  getPickedIdeas,
  getQueue,
  getSources,
  getStats,
  type IntelSource,
  type IntelStats,
  type QueueData,
  type ReelIdea,
} from '../../../lib/intelligence'
import { FeedList } from './FeedList'
import {
  BASE,
  Chips,
  DbError,
  Footnote,
  IdeaRow,
  IntelShell,
  Notice,
  type SP,
  hostOf,
  one,
  safeUrl,
  timeAgo,
  withQuery,
} from './parts'

/**
 * The Intelligence Hub admin pages (registered in payload.config.ts → admin.components.views), Owner
 * only (2026-11-18): Feed (/admin/intelligence, Instagram-style, newest day first), Revisit, Reel
 * ideas and Sources.
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

/* ---------------- Feed ---------------- */

async function FeedBody({ sp }: { sp: SP }) {
  const region = pick(one(sp.region), REGIONS, 'All')
  const res = await load(() => getFeedPage(region))
  if (!res.ok) return <DbError />
  return (
    <>
      <Chips label="Region" options={regionOptions} value={region} link={(v) => withQuery(BASE, { region: v })} />
      <FeedList
        key={region}
        initial={res.data.items}
        next={res.data.next}
        region={region}
        empty="No stories yet. New ones arrive every morning after Claude reads the news."
      />
      <Footnote />
    </>
  )
}

export function FeedView(props: AdminViewServerProps) {
  return (
    <IntelShell
      props={props}
      active="feed"
      intro="What’s happening in the event world, newest first. Tap ♥ to make a story a reel idea, or the bookmark to read it again later."
    >
      <FeedBody sp={(props.searchParams ?? {}) as SP} />
    </IntelShell>
  )
}

/* ---------------- Revisit ---------------- */

async function RevisitBody() {
  const res = await load(() => getMarked('revisit'))
  if (!res.ok) return <DbError />
  return (
    <FeedList
      initial={res.data}
      next={null}
      region="All"
      dayDividers={false}
      empty="Nothing saved yet. Tap the bookmark on any story in the Feed to keep it here."
    />
  )
}

export function RevisitView(props: AdminViewServerProps) {
  return (
    <IntelShell props={props} active="revisit" intro="Stories you saved to read again, newest saved first. Tap the bookmark again to remove one.">
      <RevisitBody />
    </IntelShell>
  )
}

/* ---------------- Reel ideas ---------------- */

async function IdeasBody({ sp }: { sp: SP }) {
  const status = pick(one(sp.status), IDEA_STATUSES, 'All open')
  const region = pick(one(sp.region), REGIONS, 'All')
  const res = await load(() => Promise.all([getMarked('reel'), getPickedIdeas(), getIdeas(status, region, 150)]))
  if (!res.ok) return <DbError />
  const [marked, picked, bank] = res.data
  const done = new Set(picked.map((i) => i.intel_id).filter(Boolean))
  const waiting = marked.filter((m) => !done.has(m.id))
  const pickedIds = new Set(picked.map((i) => i.id))
  const others = bank.filter((i: ReelIdea) => !pickedIds.has(i.id))
  const link = (q: Record<string, string>) => withQuery(`${BASE}/ideas`, { status, region, ...q })

  return (
    <>
      <section className="zf-intel__section">
        <div className="zf-intel__section-head">
          <h2>Your picks</h2>
        </div>
        {picked.length === 0 && waiting.length === 0 && (
          <Notice title="No picks yet">Tap ♥ Reel idea on any story in the Feed. Claude writes its reel outline the next morning.</Notice>
        )}
        {picked.length > 0 && (
          <div className="zf-intel__list">
            {picked.map((idea) => (
              <IdeaRow key={idea.id} idea={idea} />
            ))}
          </div>
        )}
        {waiting.length > 0 && (
          <>
            <p className="zf-intel__muted zf-intel__gap">
              Waiting for tomorrow morning’s outline ({waiting.length}):
            </p>
            <FeedList initial={waiting} next={null} region="All" dayDividers={false} empty="" />
          </>
        )}
      </section>

      <section className="zf-intel__section">
        <div className="zf-intel__section-head">
          <h2>Claude’s suggestions</h2>
        </div>
        <p className="zf-intel__muted zf-intel__gap">
          Every morning Claude suggests 7–8 reel ideas mixing Tamil Nadu, India and the world, and marks its top one.
          Nothing is produced until you approve a script.
        </p>
        <Chips
          label="Status"
          options={IDEA_STATUSES.map((s) => ({ value: s, label: s === 'All open' ? 'Open' : s === "Today's Pick" ? 'Top pick' : s }))}
          value={status}
          link={(v) => link({ status: v === 'All open' ? '' : v })}
        />
        <Chips label="Region" options={regionOptions} value={region} link={(v) => link({ region: v })} />
        {others.length === 0 ? (
          <Notice title="No ideas here" />
        ) : (
          <div className="zf-intel__list">
            {others.map((idea) => (
              <IdeaRow key={idea.id} idea={idea} />
            ))}
          </div>
        )}
      </section>
      <Footnote />
    </>
  )
}

export function IdeasView(props: AdminViewServerProps) {
  return (
    <IntelShell props={props} active="ideas" intro="Stories you liked become reels here. Tap an idea to open its hook, outline and brand check.">
      <IdeasBody sp={(props.searchParams ?? {}) as SP} />
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

/** The collector's health, each number explained in plain words. */
function CollectorStatus({ stats, waitingLink }: { stats: IntelStats; waitingLink: string }) {
  const rows: [string, React.ReactNode, string, boolean?][] = [
    ['Last check', timeAgo(stats.last_poll_at), 'The collector looks at every source every 30 minutes; this is when it last found something new.', !stats.polling_active],
    [
      'Waiting to be read',
      <Link key="w" href={waitingLink} scroll={false}>
        {stats.waiting_total}
      </Link>,
      'Stories collected but not yet read by Claude. Claude reads them every morning; then they appear in the Feed.',
    ],
    ['New in the Feed (24 h)', stats.verified_last_24h, 'Stories Claude read, checked and added to the Feed in the last 24 hours.'],
    ['Open reel ideas', stats.ideas_open, 'Reel ideas not yet scripted, posted or out of date.'],
    ['Apify this month', `$${stats.apify_month_usd.toFixed(2)} / $5`, 'Instagram reading costs. It stops itself at $4.50 so it stays free.', stats.apify_month_usd > 4.5],
  ]
  return (
    <section className="zf-intel__status">
      <h2>Collector status</h2>
      <dl>
        {rows.map(([name, value, help, warn]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd className={warn ? 'is-warn' : undefined}>{value}</dd>
            <p>{help}</p>
          </div>
        ))}
      </dl>
      {stats.stuck > 0 && <p className="zf-intel__muted">⚠ {stats.stuck} waiting item(s) failed 3 times and are skipped.</p>}
    </section>
  )
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
      <p className="zf-intel__muted">Collected but not yet read by the morning Claude run, so not checked yet.</p>
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
  const res = await load(() =>
    Promise.all([getSources(), getStats(), waiting ? getQueue(waiting, 200) : Promise.resolve(null)]),
  )
  if (!res.ok) return <DbError />
  const [all, stats, queue] = res.data
  const link = (q: Record<string, string>) => withQuery(`${BASE}/sources`, { show, region, waiting, ...q })

  const counts = {
    quiet: all.filter(isQuiet).length,
    off: all.filter((s) => !s.enabled).length,
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
      <CollectorStatus stats={stats} waitingLink={link({ waiting: 'All' })} />
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
              <span role="columnheader">In Feed, 7 days</span>
              <span role="columnheader">Waiting</span>
            </div>
            {g.items.map((s) => {
              const href = safeUrl(s.url)
              return (
                <div key={s.label} role="row" className={`zf-intel__src${s.enabled ? '' : ' is-off'}${isQuiet(s) ? ' is-quiet' : ''}`}>
                  <span role="cell" className="zf-intel__src-name">
                    <strong>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {s.label} ↗
                        </a>
                      ) : (
                        s.label
                      )}
                    </strong>
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
                  <span role="cell" data-label="In Feed, 7 days">
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
