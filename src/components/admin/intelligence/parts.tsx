import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { isOwner } from '../../../access/roles'
import { intelConfigured, type ReelIdea } from '../../../lib/intelligence'
import { safeUrl, hostOf } from './feedUtils'

export { dayLabel, hostOf, safeUrl, timeAgo } from './feedUtils'

/**
 * Shared pieces of the Intelligence Hub admin pages (/admin/intelligence = Feed, /revisit, /ideas,
 * /sources). **Owner only for now** (owner, 2026-11-18: team access later). Reads render on the
 * server; the card buttons and "load older" go through the Owner-checked Server Actions in
 * actions.ts. There is no /api data route.
 */

export const BASE = '/admin/intelligence'

export const SECTIONS = [
  { id: 'feed', label: 'Feed', href: BASE },
  { id: 'revisit', label: 'Revisit', href: `${BASE}/revisit` },
  { id: 'ideas', label: 'Reel ideas', href: `${BASE}/ideas` },
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
  const allowed = isOwner(req.user as never)
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
            <Notice title="Owner only">This page is open only to the Owner for now.</Notice>
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

/** One idea as a single line; click to open. */
export function IdeaRow({ idea, open = false }: { idea: ReelIdea; open?: boolean }) {
  const top = idea.status === "Today's Pick"
  return (
    <details className="zf-intel__row" open={open}>
      <summary>
        <span className="zf-intel__score" title="Score out of 20">
          {idea.total}
        </span>
        <span className="zf-intel__row-main">
          <span className="zf-intel__row-title">{idea.title}</span>
          <span className="zf-intel__meta">
            {top && <span className="zf-intel__badge is-gold">Claude’s top pick today</span>} {idea.region} ·{' '}
            {idea.category || 'Idea'} · {idea.status} · {idea.idea_code}
          </span>
        </span>
      </summary>
      <IdeaDetails idea={idea} />
    </details>
  )
}

export function Footnote() {
  return (
    <p className="zf-intel__foot">
      Simple text, examples and hooks are written by Claude. The proof check only shows one sentence is really in the
      source: open the source before using a fact in a reel.
    </p>
  )
}
