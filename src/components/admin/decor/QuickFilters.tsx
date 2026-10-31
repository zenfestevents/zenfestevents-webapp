'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { DECOR_CATEGORIES, DECOR_EVENT_TYPES, DECOR_STATUSES, DECOR_THEMES } from '../../../lib/decorOptions'

type Filters = {
  eventType: string
  category: string
  theme: string
  supplier: string
  min: string
  max: string
  status: string
}

const EMPTY: Filters = { eventType: '', category: '', theme: '', supplier: '', min: '', max: '', status: '' }

/** Our filters → Payload list conditions (`where[and][i][field][operator]=value`). */
function toConditions(f: Filters): [string, string][] {
  const out: [string, string][] = []
  const add = (field: string, op: string, value: string) => out.push([`[${field}][${op}]`, value])
  if (f.eventType) add('eventType', 'equals', f.eventType)
  if (f.category) add('category', 'equals', f.category)
  if (f.theme) add('themes', 'in', f.theme)
  if (f.supplier) add('supplier', 'equals', f.supplier)
  if (f.min && Number(f.min) >= 0) add('clientPrice', 'greater_than_equal', String(Number(f.min)))
  if (f.max && Number(f.max) > 0) add('clientPrice', 'less_than_equal', String(Number(f.max)))
  if (f.status === 'not_archived') add('status', 'not_equals', 'archived')
  else if (f.status) add('status', 'equals', f.status)
  return out
}

/** Reads back the conditions this bar wrote, so the boxes show what the list is filtered by. */
function fromParams(params: URLSearchParams): Filters {
  const f = { ...EMPTY }
  for (const [key, value] of params.entries()) {
    const m = key.match(/^where\[and\]\[\d+\]\[(\w+)\]\[(\w+)\]$/)
    if (!m) continue
    const [, field, op] = m
    if (field === 'eventType') f.eventType = value
    else if (field === 'category') f.category = value
    else if (field === 'themes') f.theme = value
    else if (field === 'supplier') f.supplier = value
    else if (field === 'clientPrice' && op === 'greater_than_equal') f.min = value
    else if (field === 'clientPrice' && op === 'less_than_equal') f.max = value
    else if (field === 'status') f.status = op === 'not_equals' ? 'not_archived' : value
  }
  return f
}

/**
 * Above the Decorations list: quick filters a team member can use on a phone while a client
 * is on the line — event type, category, theme, supplier, client-price budget and status.
 * They set Payload's own `where` in the address, so the list's search box, sorting and
 * paging keep working with them.
 */
export function DecorQuickFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const query = params.toString()
  const current = useMemo(() => fromParams(new URLSearchParams(query)), [query])
  const [f, setF] = useState<Filters>(current)
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])

  // When the address changes (back button, Payload's own controls), show its filters.
  const [shownQuery, setShownQuery] = useState(query)
  if (shownQuery !== query) {
    setShownQuery(query)
    setF(current)
  }

  useEffect(() => {
    let live = true
    fetch('/api/decor-suppliers?limit=500&depth=0&sort=name&select[name]=true', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { docs: [] }))
      .then((d) => live && setSuppliers(d.docs ?? []))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const apply = (next: Filters) => {
    const out = new URLSearchParams()
    // Keep the list's own settings (search box, sort, page size); drop old filters and page.
    for (const [key, value] of params.entries()) {
      if (key.startsWith('where') || key === 'page') continue
      out.append(key, value)
    }
    toConditions(next).forEach(([cond, value], i) => out.append(`where[and][${i}]${cond}`, value))
    const qs = out.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...f, [key]: e.target.value }
    setF(next)
    // Dropdowns apply at once; the budget boxes apply on "Filter" / Enter.
    if (e.target.tagName === 'SELECT') apply(next)
  }

  const active = toConditions(current).length > 0

  return (
    <form
      className="zf-decor-filters"
      onSubmit={(e) => {
        e.preventDefault()
        apply(f)
      }}
    >
      <label>
        <span>Event</span>
        <select value={f.eventType} onChange={set('eventType')}>
          <option value="">All events</option>
          {DECOR_EVENT_TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Category</span>
        <select value={f.category} onChange={set('category')}>
          <option value="">All categories</option>
          {DECOR_CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Theme</span>
        <select value={f.theme} onChange={set('theme')}>
          <option value="">All themes</option>
          {DECOR_THEMES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Supplier</span>
        <select value={f.supplier} onChange={set('supplier')}>
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select value={f.status} onChange={set('status')}>
          <option value="">Any status</option>
          <option value="not_archived">Not archived</option>
          {DECOR_STATUSES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="zf-decor-filters__budget">
        <legend>Client price ₹</legend>
        <input type="number" inputMode="numeric" min={0} step={1000} placeholder="Min" value={f.min} onChange={set('min')} />
        <span aria-hidden>–</span>
        <input type="number" inputMode="numeric" min={0} step={1000} placeholder="Max" value={f.max} onChange={set('max')} />
      </fieldset>
      <div className="zf-decor-filters__actions">
        <button type="submit" className="btn btn--style-primary btn--size-small">
          Filter
        </button>
        {active ? (
          <button
            type="button"
            className="btn btn--style-secondary btn--size-small"
           
            onClick={() => {
              setF(EMPTY)
              apply(EMPTY)
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
    </form>
  )
}
