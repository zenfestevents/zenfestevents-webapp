import React from 'react'

/**
 * Kolam — the dot-grid threshold line-art drawn at Tamil doorways to welcome
 * guests. This is the site's signature motif, rendered as single-colour line
 * art (uses currentColor).
 */

/** A looping kolam vine, used as a section divider. */
export function KolamDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`kolam-divider ${className}`} aria-hidden="true">
      <svg
        width="220"
        height="26"
        viewBox="0 0 220 26"
        role="presentation"
        focusable="false"
      >
        <path d="M4 13 C 4 1, 28 1, 28 13 S 52 25, 52 13 S 76 1, 76 13 S 100 25, 100 13 S 124 1, 124 13 S 148 25, 148 13 S 172 1, 172 13 S 196 25, 196 13 S 216 5, 216 13" />
        {[4, 52, 100, 148, 196].map((cx) => (
          <circle key={cx} cx={cx} cy={13} r={1.7} />
        ))}
      </svg>
    </div>
  )
}

/**
 * A radial kolam rosette for hero / ambient backdrops. Petals loop out from a
 * central dot; when `draw` is set the strokes draw themselves once on load.
 */
export function KolamRosette({
  size = 220,
  className = '',
  draw = false,
}: {
  size?: number
  className?: string
  draw?: boolean
}) {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg
      width={size}
      height={size}
      viewBox="-60 -60 120 120"
      className={`${draw ? 'kolam-draw' : 'kolam'} ${className}`}
      style={draw ? ({ '--len': 300 } as React.CSSProperties) : undefined}
      aria-hidden="true"
      role="presentation"
      focusable="false"
    >
      <g>
        {petals.map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg})`}
            d="M0 0 C 11 -15, 37 -15, 50 0 C 37 15, 11 15, 0 0 Z"
          />
        ))}
        {petals.map((deg) => {
          const r = (deg * Math.PI) / 180
          return (
            <circle key={`d-${deg}`} cx={Math.cos(r) * 54} cy={Math.sin(r) * 54} r={2.1} />
          )
        })}
        <circle cx={0} cy={0} r={3.2} />
      </g>
    </svg>
  )
}
