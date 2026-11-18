import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { isStaff } from '../../../access/roles'
import { intelConfigured, type IntelItem, type ReelIdea } from '../../../lib/intelligence'

/**
 * Shared pieces of the Intelligence Hub admin pages (/admin/intelligence, /ideas, /news, /sources).
 * Every Zenfest team login can open them (owner, 2026-11-18); vendors, couples and visitors can't.
 * Pages render on the server and filter with plain links, so there is no data route.
 */

export const BASE = '/admin/intelligence'

export const SECTIONS = [
  { id: 'today', label: 'Today', href: BASE },
  { id: 'ideas', label: 'Reel ideas', href: `${BASE}/ideas` },
  { id: 'news', label: 'News', href: `${BASE}/news` },
  { id: 'sources', label: 'Sources', href: `${BASE}/sources` },
] as const
export type Section = (typeof SECTIONS)[number]['id']

export type SP = Record<string, string | string[] | undefined>

export function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

/** A link to `path` with the given query (empty / "All" values dropped). */
export function withQuery(path: string, query: Record<string, string>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v && v !== 'All') qs.set(k, v)
  const s = qs.toString()
  return s ? `${path}?${s}` : path
}

export function timeAgo(value: string | null): string {
  if (!value) return 'never'
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return `${Math.floor(seconds / 86400)} d ago`
}

const IST = 'Asia/Kolkata'
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: IST })

/** "Today", "Yesterday" or "Mon, 16 Nov" (India dates). */
export function dayLabel(value: string | null): string {
  if (!value) return 'Undated'
  const d = new Date(value)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  if (dayKey(d) === dayKey(today)) return 'Today'
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short' })
}

/** Links come from outside sources: allow only http(s). */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/* ---------- page frame ---------- */

export function IntelShell({
  props,
  active,
  intro,
  children,
}: {
  props: AdminViewServerProps
  active: Section
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  const { initPageResult, params, searchParams } = props
  const { req, locale, permissions, visibleEntities } = initPageResult
  const allowed = isStaff(req.user as never)
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
            <p className="zf-eyebrow">Content · Intelligence Hub</p>
            <h1>{SECTIONS.find((s) => s.id === active)?.label}</h1>
            {allowed && intro && <p className="zf-intel__intro">{intro}</p>}
          </header>
          {allowed && (
            <nav className="zf-intel__tabs" aria-label="Intelligence Hub">
              {SECTIONS.map((s) => (
                <Link key={s.id} href={s.href} aria-current={s.id === active ? 'page' : undefined}>
                  {s.label}
                </Link>
              ))}
            </nav>
          )}
          {!allowed ? (
            <Notice title="Team only">This page is open to the Zenfest team only.</Notice>
          ) : !intelConfigured() ? (
            <Notice title="Not connected yet" alert>
              Set INTEL_DATABASE_URL (the Intelligence Hub’s database address) in the environment.
            </Notice>
          ) : (
            children
          )}
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}

/* ---------- small pieces ---------- */

export function Notice({ title, children, alert = false }: { title: string; children?: React.ReactNode; alert?: boolean }) {
  return (
    <div className={`zf-intel__notice${alert ? ' is-alert' : ''}`} role={alert ? 'alert' : 'status'}>
      <p className="zf-intel__notice-title">{title}</p>
      {children && <p>{children}</p>}
    </div>
  )
}

export function DbError() {
  return (
    <Notice title="Cannot reach the Intelligence Hub" alert>
      The hub’s data could not be loaded. Try again in a minute; if it keeps failing, check INTEL_DATABASE_URL.
    </Notice>
  )
}

/** One row of filter links. `value` is the current choice. */
export function Chips({
  label,
  options,
  value,
  link,
}: {
  label: string
  options: readonly { value: string; label: string; count?: number }[]
  value: string
  link: (value: string) => string
}) {
  return (
    <div className="zf-intel__chips" role="group" aria-label={label}>
      {options.map((o) => (
        <Link key={o.value} href={link(o.value)} aria-current={o.value === value ? 'true' : undefined} scroll={false}>
          {o.label}
          {o.count !== undefined && <span>{o.count}</span>}
        </Link>
      ))}
    </div>
  )
}

export function SourceLink({ url, label }: { url: string | null; label: string | null }) {
  const safe = safeUrl(url)
  if (!safe) return label ? <span className="zf-intel__muted">{label}</span> : null
  return (
    <a className="zf-intel__link" href={safe} target="_blank" rel="noopener noreferrer">
      {label || hostOf(safe)} ↗
    </a>
  )
}

function BrandNote({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="zf-intel__brand">
      <strong>Brand check</strong> {text}
    </p>
  )
}

/* ---------- ideas ---------- */

function IdeaDetails({ idea }: { idea: ReelIdea }) {
  return (
    <div className="zf-intel__detail">
      {idea.hook_idea && <p className="zf-intel__hook">{idea.hook_idea}</p>}
      {idea.outline && <p className="zf-intel__outline">{idea.outline}</p>}
      <BrandNote text={idea.brand_note} />
      <p className="zf-intel__meta">
        {idea.status} · found {idea.date_found?.slice(0, 10)}
        {idea.evergreen ? ' · evergreen' : ''}
        {idea.source_url && (
          <>
            {' · '}
            <SourceLink url={idea.source_url} label={idea.source_name} />
          </>
        )}
      </p>
    </div>
  )
}

/** Today's Pick, shown open. */
export function PickCard({ idea }: { idea: ReelIdea }) {
  return (
    <article className="zf-intel__pick">
      <p className="zf-intel__meta">
        <span className="zf-intel__badge is-gold">Today’s pick</span> {idea.region} · {idea.category || 'Idea'} ·{' '}
        {idea.idea_code} · <strong>{idea.total}/20</strong>
      </p>
      <h2>{idea.title}</h2>
      <IdeaDetails idea={idea} />
    </article>
  )
}

/** One idea as a single line; click to open. */
export function IdeaRow({ idea }: { idea: ReelIdea }) {
  const pick = idea.status === "Today's Pick"
  return (
    <details className="zf-intel__row">
      <summary>
        <span className="zf-intel__score" title="Score out of 20">
          {idea.total}
        </span>
        <span className="zf-intel__row-main">
          <span className="zf-intel__row-title">{idea.title}</span>
          <span className="zf-intel__meta">
            {pick && <span className="zf-intel__badge is-gold">Today’s pick</span>} {idea.region} ·{' '}
            {idea.category || 'Idea'} · {idea.idea_code}
          </span>
        </span>
      </summary>
      <IdeaDetails idea={idea} />
    </details>
  )
}

/* ---------- news ---------- */

export function NewsRow({ item }: { item: IntelItem }) {
  const insta = (item.source_label || '').startsWith('Instagram')
  return (
    <details className="zf-intel__row">
      <summary>
        <span className={`zf-intel__dot${insta ? ' is-insta' : ''}`} aria-hidden="true" />
        <span className="zf-intel__row-main">
          <span className="zf-intel__row-title">{item.title}</span>
          <span className="zf-intel__meta">
            {item.region} · {item.primary_category} · {item.source_label} · {timeAgo(item.published_at)}
          </span>
        </span>
      </summary>
      <div className="zf-intel__detail">
        {item.summary && <p>{item.summary}</p>}
        {item.hook_idea && (
          <p className="zf-intel__hook">
            <strong>Reel hook</strong> {item.hook_idea}
          </p>
        )}
        {item.exact_source_quote && (
          <figure className="zf-intel__quote">
            <figcaption>✓ Quote found in the source</figcaption>
            <blockquote>“{item.exact_source_quote}”</blockquote>
          </figure>
        )}
        <BrandNote text={item.brand_note} />
        <p className="zf-intel__meta">
          Hook {item.hook_score}/5 · Fit {item.relevance_score}/5 · Visual {item.visual_score}/5 ·{' '}
          <SourceLink url={item.source_url} label={item.source_label} />
        </p>
      </div>
    </details>
  )
}

export function Footnote() {
  return (
    <p className="zf-intel__foot">
      Titles, summaries and hooks are written by Claude. The quote check only proves the quote is in the source: open
      the source before using a fact in a reel. Reload the page for the latest.
    </p>
  )
}
