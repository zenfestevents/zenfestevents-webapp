'use client'

import React, { useMemo, useState } from 'react'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Today as YYYY-MM-DD in India time. */
export function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * A month grid of days. Days in `blocked` show as unavailable. With `onToggle`
 * (vendor dashboard) days are buttons; without it (public listing) it's read-only.
 * Past days are greyed out and can't be toggled.
 */
export function MonthCalendar({
  blocked,
  onToggle,
  months = 1,
}: {
  blocked: Set<string>
  onToggle?: (day: string) => void
  months?: number
}) {
  const today = todayKey()
  const [offset, setOffset] = useState(0)
  const [ty, tm] = today.split('-').map(Number)

  const grids = useMemo(() => {
    return Array.from({ length: months }, (_, i) => {
      const first = new Date(Date.UTC(ty, tm - 1 + offset + i, 1))
      const year = first.getUTCFullYear()
      const month = first.getUTCMonth()
      const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
      const lead = (first.getUTCDay() + 6) % 7 // Monday first
      const cells: (string | null)[] = Array.from({ length: lead }, () => null)
      for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`)
      const title = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      return { key: `${year}-${month}`, title, cells }
    })
  }, [ty, tm, offset, months])

  return (
    <div className="cal">
      <div className="cal__nav">
        <button type="button" className="cal__arrow" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} aria-label="Previous month">
          ‹
        </button>
        <button type="button" className="cal__arrow" onClick={() => setOffset((o) => Math.min(24, o + 1))} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="cal__months">
        {grids.map((g) => (
          <div key={g.key} className="cal__month">
            <p className="cal__title">{g.title}</p>
            <div className="cal__grid" role="grid">
              {WEEKDAYS.map((w) => (
                <span key={w} className="cal__wd" aria-hidden="true">
                  {w.slice(0, 2)}
                </span>
              ))}
              {g.cells.map((day, i) => {
                if (!day) return <span key={`e${i}`} />
                const past = day < today
                const isBlocked = blocked.has(day)
                const cls = `cal__day${isBlocked ? ' is-blocked' : ''}${past ? ' is-past' : ''}${day === today ? ' is-today' : ''}`
                const n = Number(day.slice(8))
                return onToggle && !past ? (
                  <button
                    key={day}
                    type="button"
                    className={cls}
                    aria-pressed={isBlocked}
                    aria-label={`${day}${isBlocked ? ', unavailable' : ', available'}`}
                    onClick={() => onToggle(day)}
                  >
                    {n}
                  </button>
                ) : (
                  <span key={day} className={cls} aria-label={isBlocked ? `${day}, unavailable` : undefined}>
                    {n}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="cal__legend field__hint">
        <span className="cal__swatch" /> Available <span className="cal__swatch is-blocked" /> Booked / unavailable
      </p>
    </div>
  )
}
