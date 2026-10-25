'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

/** Colour per status value, shared by every list that uses this cell. */
const TONE: Record<string, 'wait' | 'work' | 'done' | 'stop' | 'off'> = {
  new: 'wait',
  pending: 'wait',
  reviewing: 'work',
  contacted: 'work',
  quoted: 'work',
  booked: 'done',
  approved: 'done',
  published: 'done',
  rejected: 'stop',
  closed: 'off',
  draft: 'off',
  paused: 'off',
}

/**
 * Admin list cell: a select field's value as a coloured pill (gold = waiting on us,
 * green = done, red = rejected, grey = closed), so a list reads at a glance.
 * Styles: `zf-pill` in app/(payload)/custom.scss.
 */
export function StatusPill({ cellData, field }: DefaultCellComponentProps) {
  const value = typeof cellData === 'string' ? cellData : ''
  if (!value) return <span>—</span>
  const options = (field as { options?: ({ label?: unknown; value: string } | string)[] }).options ?? []
  const option = options.find((o) => (typeof o === 'string' ? o : o.value) === value)
  const label = option && typeof option === 'object' && typeof option.label === 'string' ? option.label : value
  return <span className={`zf-pill zf-pill--${TONE[value] ?? 'off'}`}>{label}</span>
}
