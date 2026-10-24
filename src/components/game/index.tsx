import React from 'react'

/*
 * The night-match game pieces (styles in game.css). All server-safe: no hooks, no
 * browser APIs. Generic cricket only — never a league, team, player or stadium name.
 */

/** A ball's seam as a section divider: a gold line stitched both sides, the ball at its centre. */
export function SeamDivider({ className = '' }: { className?: string }) {
  const stitches = Array.from({ length: 14 }, (_, i) => i)
  return (
    <div className={`seam-divider ${className}`} aria-hidden="true">
      <svg viewBox="0 0 320 24" width="320" height="24">
        <path d="M0 12 H136 M184 12 H320" />
        {stitches.map((i) => {
          const x = i < 7 ? 8 + i * 18 : 192 + (i - 7) * 18
          return <path key={i} className="seam-divider__stitch" d={`M${x} 7 l5 5 l-5 5 M${x + 7} 7 l-5 5 l5 5`} />
        })}
        <circle cx="160" cy="12" r="9" />
        <path className="seam-divider__ball-seam" d="M154 5 Q160 12 154 19 M166 5 Q160 12 166 19" />
      </svg>
    </div>
  )
}

/**
 * One over: six balls, filled for the ones bowled and ringed for the one in play.
 * `done` balls are complete; `current` (0-based) is in play. Used for form steps
 * (each step is a ball) and the hero's scroll progress.
 */
export function BallDots({
  total = 6,
  done,
  current,
  label,
  className = '',
}: {
  total?: number
  done: number
  current?: number
  /** Read out instead of the dots, e.g. "Step 2 of 5". */
  label?: string
  className?: string
}) {
  return (
    <span className={`balls ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`balls__ball ${i < done ? 'is-done' : ''} ${i === current ? 'is-current' : ''}`}
        />
      ))}
    </span>
  )
}

export type ScoreItem = { value: React.ReactNode; label: string; note?: string }

/** Big tabular numbers over small uppercase captions — real numbers only. */
export function Scoreboard({ items, className = '' }: { items: ScoreItem[]; className?: string }) {
  return (
    <dl className={`scoreboard ${className}`}>
      {items.map((it) => (
        <div key={it.label} className="scoreboard__cell">
          <dt className="scoreboard__label">{it.label}</dt>
          <dd className="scoreboard__value">{it.value}</dd>
          {it.note && <dd className="scoreboard__note">{it.note}</dd>}
        </div>
      ))}
    </dl>
  )
}

/** The pulsing gold "live" dot. Still under reduced motion. */
export function LiveDot({ label = 'Live' }: { label?: string }) {
  return (
    <span className="live-dot">
      <span className="live-dot__pip" aria-hidden="true" />
      {label}
    </span>
  )
}

/**
 * A score ticker: the items scroll past once per loop (CSS marquee). The second copy
 * is decoration for the seamless loop, so screen readers hear the list once.
 */
export function Ticker({ items, label = 'Live' }: { items: string[]; label?: string }) {
  if (!items.length) return null
  const row = (hidden: boolean) => (
    <ul className="ticker__row" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  )
  return (
    <div className="ticker">
      <LiveDot label={label} />
      <div className="ticker__track">
        <div className="ticker__belt">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  )
}

/** A gold progress ring (Oura's score ring) with the figure in the middle. `progress` is 0–1. */
export function GoldRing({
  progress,
  size = 132,
  children,
}: {
  progress: number
  size?: number
  children?: React.ReactNode
}) {
  const r = 44
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, progress))
  return (
    <div className="gold-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="gold-ring__track" cx="50" cy="50" r={r} />
        <circle
          className="gold-ring__bar"
          cx="50"
          cy="50"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
        />
      </svg>
      <div className="gold-ring__inner">{children}</div>
    </div>
  )
}

/** A level badge: the tier's name on a gold key-cap chip. */
export function TierBadge({ name, level }: { name: string; level?: number }) {
  return (
    <span className="tier-badge">
      {level !== undefined && <span className="tier-badge__level mono">L{level}</span>}
      {name}
    </span>
  )
}

/** A rating framed by two generic laurel branches (an award moment, no trophy design). */
export function LaurelRating({ score, caption }: { score: string; caption: React.ReactNode }) {
  const branch = (
    <svg viewBox="0 0 30 64" aria-hidden="true" className="laurel__branch">
      <path d="M24 62 C 8 50, 6 26, 16 4" />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx={13 - i * 0.4} cy={52 - i * 10} rx="6" ry="2.6" transform={`rotate(${-40 + i * 6} ${13 - i * 0.4} ${52 - i * 10})`} />
      ))}
    </svg>
  )
  return (
    <div className="laurel">
      {branch}
      <div className="laurel__body">
        <span className="laurel__score">{score}</span>
        <span className="laurel__caption">{caption}</span>
      </div>
      <span className="laurel__flip">{branch}</span>
    </div>
  )
}
